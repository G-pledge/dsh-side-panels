import { realpath, readdir, readFile, mkdir, writeFile, stat, rename as movePath, open as openFile } from 'node:fs/promises'
import { isForbiddenRel, isInsideRoot, isSafeName, joinUnderRoot, toPosix } from './paths.js'
import { gitStatusLetters } from './git-status.js'

const MAX_OPEN_BYTES = 64 * 1024 * 1024
const MAX_SAVE_BYTES = 64 * 1024 * 1024

function fail(code, message) {
  return { ok: false, error: { code, message } }
}

function ok(value) {
  return { ok: true, value }
}

async function workspaceReals(workspacePaths) {
  const reals = []
  for (const path of workspacePaths) {
    try {
      reals.push(await realpath(path))
    } catch {
      // 注册了但磁盘上暂时没有的目录直接跳过
    }
  }
  return reals
}

async function assertRootAllowed(root, workspacePaths) {
  if (typeof root !== 'string' || root.trim() === '') {
    return fail('no-root', '这条对话还没有工作目录')
  }
  let rootReal
  try {
    rootReal = await realpath(root)
  } catch {
    return fail('no-root', '工作目录在磁盘上不存在')
  }
  const workspaces = await workspaceReals(workspacePaths)
  if (workspaces.length === 0) {
    return fail('forbidden', '没有可用的工作区，拒绝访问文件')
  }
  const allowed = workspaces.some((workspace) => isInsideRoot(workspace, rootReal))
  if (!allowed) {
    return fail('forbidden', '工作目录不在已登记的工作区里')
  }
  return ok(rootReal)
}

async function resolveExisting(rootReal, rel) {
  if (isForbiddenRel(rel)) return fail('forbidden', '路径不允许')
  const abs = joinUnderRoot(rootReal, rel)
  if (abs === null) return fail('forbidden', '路径不允许')
  let targetReal
  try {
    targetReal = await realpath(abs)
  } catch {
    return fail('not-found', '找不到这个路径')
  }
  if (!isInsideRoot(rootReal, targetReal)) {
    return fail('forbidden', '路径不允许')
  }
  const relFromRoot = toPosix(targetReal.slice(rootReal.length)).replace(/^\//, '')
  if (isForbiddenRel(relFromRoot)) return fail('forbidden', '路径不允许')
  return ok({ abs: targetReal, rel: relFromRoot })
}

function looksBinary(bytes) {
  const window = bytes.subarray(0, 4096)
  return window.includes(0)
}

function imageMimeFor(rel) {
  const name = toPosix(rel).split('/').pop() ?? ''
  const base = name.toLowerCase()
  const dot = base.lastIndexOf('.')
  const ext = dot <= 0 ? '' : base.slice(dot + 1)
  return {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    avif: 'image/avif',
  }[ext]
}

async function readOpenable(abs, size) {
  if (size <= MAX_OPEN_BYTES) {
    const bytes = await readFile(abs)
    return { bytes, truncated: false, loaded: bytes.length, size }
  }
  const handle = await openFile(abs, 'r')
  try {
    const bytes = Buffer.alloc(MAX_OPEN_BYTES)
    const { bytesRead } = await handle.read(bytes, 0, MAX_OPEN_BYTES, 0)
    return { bytes: bytes.subarray(0, bytesRead), truncated: true, loaded: bytesRead, size }
  } finally {
    await handle.close()
  }
}

/**
 * @param {() => string[]} listWorkspacePaths
 */
export function createFsService(listWorkspacePaths) {
  async function gatedRoot(root) {
    return assertRootAllowed(root, listWorkspacePaths())
  }

  return {
    async list(root, rel = '') {
      const gated = await gatedRoot(root)
      if (!gated.ok) return gated
      const resolved = await resolveExisting(gated.value, rel)
      if (!resolved.ok) return resolved
      let dirents
      try {
        dirents = await readdir(resolved.value.abs, { withFileTypes: true })
      } catch {
        return fail('not-found', '无法读取这个目录')
      }
      const entries = []
      for (const dirent of dirents) {
        if (dirent.name === '.git' || dirent.name === '.' || dirent.name === '..') continue
        const childRel = resolved.value.rel === '' ? dirent.name : `${resolved.value.rel}/${dirent.name}`
        if (isForbiddenRel(childRel)) continue
        const abs = joinUnderRoot(gated.value, childRel)
        if (abs === null) continue
        let isDir = dirent.isDirectory()
        if (dirent.isSymbolicLink()) {
          try {
            const childReal = await realpath(abs)
            if (!isInsideRoot(gated.value, childReal)) continue
            isDir = (await stat(childReal)).isDirectory()
          } catch {
            continue
          }
        }
        entries.push({
          name: dirent.name,
          path: childRel,
          directory: isDir,
        })
      }
      entries.sort((a, b) => {
        if (a.directory !== b.directory) return a.directory ? -1 : 1
        return a.name.localeCompare(b.name, 'zh')
      })
      return ok({ root: gated.value, path: resolved.value.rel, entries })
    },

    async status(root) {
      const gated = await gatedRoot(root)
      if (!gated.ok) return gated
      return ok({ git: await gitStatusLetters(gated.value) })
    },

    async gateRoot(root) {
      return gatedRoot(root)
    },

    async read(root, rel) {
      const gated = await gatedRoot(root)
      if (!gated.ok) return gated
      const resolved = await resolveExisting(gated.value, rel)
      if (!resolved.ok) return resolved
      let info
      try {
        info = await stat(resolved.value.abs)
      } catch {
        return fail('not-found', '找不到这个文件')
      }
      if (info.isDirectory()) return fail('is-directory', '这是文件夹，不能当文件打开')
      const imageMime = imageMimeFor(resolved.value.rel)
      let packed
      try {
        packed = await readOpenable(resolved.value.abs, info.size)
      } catch (error) {
        return fail('io', `读取失败：${error.message}`)
      }
      if (imageMime) {
        return ok({
          path: resolved.value.rel,
          image: true,
          mime: imageMime,
          data: packed.bytes.toString('base64'),
          size: packed.size,
          loaded: packed.loaded,
          truncated: packed.truncated,
        })
      }
      if (looksBinary(packed.bytes.subarray(0, Math.min(packed.bytes.length, 4096)))) {
        return ok({
          path: resolved.value.rel,
          binary: true,
          data: packed.bytes.toString('base64'),
          size: packed.size,
          loaded: packed.loaded,
          truncated: packed.truncated,
        })
      }
      return ok({
        path: resolved.value.rel,
        binary: false,
        text: packed.bytes.toString('utf8'),
        truncated: packed.truncated,
        size: packed.size,
        loaded: packed.loaded,
      })
    },

    async bytes(root, rel) {
      const gated = await gatedRoot(root)
      if (!gated.ok) return gated
      const resolved = await resolveExisting(gated.value, rel)
      if (!resolved.ok) return resolved
      let info
      try {
        info = await stat(resolved.value.abs)
      } catch {
        return fail('not-found', '找不到这个文件')
      }
      if (info.isDirectory()) return fail('is-directory', '这是文件夹，不能当文件打开')
      try {
        const packed = await readOpenable(resolved.value.abs, info.size)
        return ok({
          path: resolved.value.rel,
          mime: imageMimeFor(resolved.value.rel) || 'application/octet-stream',
          bytes: packed.bytes,
          truncated: packed.truncated,
          size: packed.size,
          loaded: packed.loaded,
        })
      } catch (error) {
        return fail('io', `读取失败：${error.message}`)
      }
    },

    async write(root, rel, text) {
      if (typeof text !== 'string') return fail('bad-text', '内容必须是文本')
      if (Buffer.byteLength(text, 'utf8') > MAX_SAVE_BYTES) {
        return fail('too-large', '这一版保存不能超过 64 兆')
      }
      const gated = await gatedRoot(root)
      if (!gated.ok) return gated
      const resolved = await resolveExisting(gated.value, rel)
      if (!resolved.ok) return resolved
      let info
      try {
        info = await stat(resolved.value.abs)
      } catch {
        return fail('not-found', '找不到这个文件')
      }
      if (info.isDirectory()) return fail('is-directory', '这是文件夹，不能当文件保存')
      try {
        await writeFile(resolved.value.abs, text, 'utf8')
      } catch (error) {
        return fail('io', `保存失败：${error.message}`)
      }
      return ok({ path: resolved.value.rel, size: Buffer.byteLength(text, 'utf8') })
    },

    async create(root, parentRel, name, directory) {
      if (!isSafeName(name)) return fail('bad-name', '这个名字不能用')
      const gated = await gatedRoot(root)
      if (!gated.ok) return gated
      const parent = await resolveExisting(gated.value, parentRel ?? '')
      if (!parent.ok) return parent
      const parentInfo = await stat(parent.value.abs)
      if (!parentInfo.isDirectory()) return fail('not-directory', '只能在文件夹里新建')
      const childRel = parent.value.rel === '' ? name.trim() : `${parent.value.rel}/${name.trim()}`
      if (isForbiddenRel(childRel)) return fail('forbidden', '路径不允许')
      const abs = joinUnderRoot(gated.value, childRel)
      if (abs === null) return fail('forbidden', '路径不允许')
      try {
        await stat(abs)
        return fail('exists', '已经有同名文件或文件夹')
      } catch {
        // 不存在才能建
      }
      try {
        if (directory) await mkdir(abs)
        else await writeFile(abs, '', { flag: 'wx' })
      } catch (error) {
        return fail('io', `新建失败：${error.message}`)
      }
      return ok({ path: childRel, directory: directory === true })
    },

    async rename(root, rel, name) {
      if (!isSafeName(name)) return fail('bad-name', '这个名字不能用')
      const fromRel = toPosix(rel ?? '').replace(/^\/+|\/+$/g, '')
      if (fromRel === '') return fail('bad-path', '不能重命名工作目录本身')
      const gated = await gatedRoot(root)
      if (!gated.ok) return gated
      const resolved = await resolveExisting(gated.value, fromRel)
      if (!resolved.ok) return resolved
      const cut = resolved.value.rel.lastIndexOf('/')
      const parentRel = cut < 0 ? '' : resolved.value.rel.slice(0, cut)
      const destRel = parentRel === '' ? name.trim() : `${parentRel}/${name.trim()}`
      if (isForbiddenRel(destRel)) return fail('forbidden', '路径不允许')
      const destAbs = joinUnderRoot(gated.value, destRel)
      if (destAbs === null) return fail('forbidden', '路径不允许')
      const sameSpot = toPosix(destAbs).toLowerCase() === toPosix(resolved.value.abs).toLowerCase()
      if (!sameSpot) {
        try {
          await stat(destAbs)
          return fail('exists', '已经有同名文件或文件夹')
        } catch {
          // 目标还不存在才能改名
        }
      } else if (destRel === resolved.value.rel) {
        return ok({ path: destRel, from: resolved.value.rel })
      }
      try {
        await movePath(resolved.value.abs, destAbs)
      } catch (error) {
        return fail('io', `重命名失败：${error.message}`)
      }
      return ok({ path: destRel, from: resolved.value.rel })
    },
  }
}
