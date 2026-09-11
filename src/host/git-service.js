import { appendFile, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { isForbiddenRel, isSafeName, joinUnderRoot, toPosix } from './paths.js'
import { discoverRepos, gitRelInRepo, parseBranchLine, parseRefRecords, parseStatusGroups, pickRepo, prefixRel, relativeTime, runGit } from './git-status.js'
import { clampGraphLimit, DEFAULT_GRAPH, layoutGraph, LOG_FORMAT, parseLogRecords, parseNameStatus } from './git-graph.js'
import {
  isLfsPointer,
  looksLikePatch,
  parseBlamePorcelain,
  parseStashList,
  parseSubmoduleStatus,
  parseUnifiedHunks,
  safeCloneUrl,
  STASH_FORMAT,
} from './git-extra.js'

const MAX_PATHS = 200
const MAX_DIFF = 512 * 1024
const MAX_MESSAGE = 64 * 1024
const MAX_PATCH = 256 * 1024
const MAX_REFS = 400
const REMOTE_TIMEOUT = 120000
const REF_FORMAT = '%(HEAD)%00%(refname)%00%(refname:short)%00%(objectname:short)%00%(committerdate:unix)%00%(authorname)%00%(contents:subject)%00%(upstream:track)'

function fail(code, message) {
  return { ok: false, error: { code, message } }
}

function ok(value) {
  return { ok: true, value }
}

function looksBinary(bytes) {
  return bytes.subarray(0, 4096).includes(0)
}

function safeGitName(raw) {
  const text = String(raw ?? '').trim()
  if (text === '' || text.startsWith('-') || text.includes('\0') || text.includes('..')) return null
  if (text.length > 200) return null
  return text
}

function safeHash(raw) {
  const text = String(raw ?? '').trim().toLowerCase()
  if (!/^[0-9a-f]{4,40}$/.test(text)) return null
  return text
}

function safeStashRef(raw) {
  const text = String(raw ?? '').trim()
  if (!/^stash@\{\d+\}$/.test(text)) return null
  return text
}

async function detectOp(cwd) {
  try {
    const raw = (await runGit(cwd, ['rev-parse', '--git-dir'])).stdout.trim()
    if (!raw) return { kind: '', label: '' }
    const absDir = isAbsolute(raw) ? raw : join(cwd, raw)
    async function has(name) {
      try {
        await stat(join(absDir, name))
        return true
      } catch {
        return false
      }
    }
    if (await has('MERGE_HEAD')) return { kind: 'merge', label: '正在合并' }
    if (await has('CHERRY_PICK_HEAD')) return { kind: 'cherry-pick', label: '正在拣选' }
    if (await has('REVERT_HEAD')) return { kind: 'revert', label: '正在还原' }
    if ((await has('rebase-merge')) || (await has('rebase-apply'))) return { kind: 'rebase', label: '正在变基' }
  } catch {
    // 没有进行中的操作
  }
  return { kind: '', label: '' }
}

async function readStashes(cwd) {
  try {
    const listed = await runGit(cwd, ['stash', 'list', `--format=${STASH_FORMAT}`])
    return parseStashList(listed.stdout).map((item) => ({ ...item, ago: relativeTime(item.date) }))
  } catch {
    return []
  }
}

async function readSubmodules(cwd) {
  try {
    const listed = await runGit(cwd, ['submodule', 'status'])
    return parseSubmoduleStatus(listed.stdout)
  } catch {
    return []
  }
}

async function readUpstream(cwd) {
  try {
    return (await runGit(cwd, ['rev-parse', '--abbrev-ref', '@{upstream}'])).stdout.trim()
  } catch {
    return ''
  }
}

async function readRemotes(cwd) {
  try {
    return String((await runGit(cwd, ['remote'])).stdout)
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

async function defaultRemote(cwd) {
  const remotes = await readRemotes(cwd)
  if (remotes.includes('origin')) return 'origin'
  return remotes[0] || ''
}

function localFromRemote(short) {
  const slash = String(short).indexOf('/')
  return slash >= 0 ? short.slice(slash + 1) : short
}

async function refExists(cwd, refname) {
  try {
    await runGit(cwd, ['show-ref', '--verify', '--quiet', '--', refname])
    return true
  } catch {
    return false
  }
}

async function gitMove(cwd, args) {
  try {
    await runGit(cwd, args, { timeout: 20000 })
  } catch (error) {
    const text = String(error?.message ?? error)
    if (!/is not a git command|unknown command/i.test(text)) throw error
    const fallback = [...args]
    if (fallback[0] === 'switch') {
      fallback[0] = 'checkout'
      const cut = fallback.indexOf('-c')
      if (cut >= 0) fallback[cut] = '-b'
    }
    await runGit(cwd, fallback, { timeout: 20000 })
  }
}

function basename(path) {
  const parts = String(path).split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

function collectPaths(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw !== '') return [raw]
  return []
}

function relPaths(rootReal, raw) {
  const list = collectPaths(raw)
  if (list.length === 0) return fail('bad-path', '缺少文件路径')
  if (list.length > MAX_PATHS) return fail('too-many', '一次改动的文件太多')
  const out = []
  for (const item of list) {
    if (typeof item !== 'string' || item.trim() === '') return fail('bad-path', '缺少文件路径')
    const rel = toPosix(item).replace(/^\/+/, '')
    if (rel === '' || isForbiddenRel(rel) || joinUnderRoot(rootReal, rel) === null) {
      return fail('forbidden', '路径不允许')
    }
    out.push(rel)
  }
  return ok(out)
}

function prefixItem(repoRel, item) {
  return {
    ...item,
    path: prefixRel(repoRel, item.path),
    origPath: item.origPath ? prefixRel(repoRel, item.origPath) : undefined,
    repo: repoRel,
  }
}

async function readRepoState(entry) {
  const [porcelain, short, op, stashes, submodules, upstream, remotes] = await Promise.all([
    runGit(entry.abs, ['status', '--porcelain', '-uall']),
    runGit(entry.abs, ['status', '-sb']),
    detectOp(entry.abs),
    readStashes(entry.abs),
    readSubmodules(entry.abs),
    readUpstream(entry.abs),
    readRemotes(entry.abs),
  ])
  const groups = parseStatusGroups(porcelain.stdout)
  const header = String(short.stdout).split(/\r?\n/)[0] || ''
  const branch = parseBranchLine(header)
  const git = {}
  for (const [path, letter] of Object.entries(groups.letters)) {
    git[prefixRel(entry.rel, path)] = letter
  }
  return {
    rel: entry.rel,
    name: entry.name,
    ...branch,
    upstream,
    remotes,
    op,
    staged: groups.staged.map((item) => prefixItem(entry.rel, item)),
    changes: groups.changes.map((item) => prefixItem(entry.rel, item)),
    conflicts: groups.conflicts.map((item) => prefixItem(entry.rel, item)),
    stashes,
    submodules: submodules.map((item) => ({ ...item, path: prefixRel(entry.rel, item.path) })),
    git,
  }
}

async function isTracked(cwd, rel) {
  try {
    await runGit(cwd, ['ls-files', '--error-unmatch', '--', rel])
    return true
  } catch {
    return false
  }
}

async function readWorktreeText(cwd, rel) {
  const abs = joinUnderRoot(cwd, rel)
  if (abs === null) return { text: '', missing: true }
  try {
    const info = await stat(abs)
    if (info.isDirectory()) return { directory: true, text: '', binary: false }
    const packed = await readFile(abs)
    if (looksBinary(packed) || packed.length > MAX_DIFF) {
      return { binary: true, text: '', truncated: packed.length > MAX_DIFF }
    }
    return { text: packed.toString('utf8'), binary: false }
  } catch {
    return { text: '', missing: true }
  }
}

async function readGitText(cwd, spec) {
  const attempts = [
    ['cat-file', '-p', spec],
    ['show', spec],
  ]
  for (const args of attempts) {
    try {
      const { stdout } = await runGit(cwd, args, { maxBuffer: MAX_DIFF + 64 * 1024 })
      let text = stdout
      let truncated = false
      if (text.length > MAX_DIFF) {
        text = text.slice(0, MAX_DIFF)
        truncated = true
      }
      return { text, truncated, binary: false }
    } catch {
      // 换一种读法再试
    }
  }
  return { text: '', missing: true }
}

/**
 * @param {(root: string) => Promise<{ ok: boolean, value?: string, error?: { code: string, message: string } }>} gateRoot
 */
export function createGitService(gateRoot) {
  async function withWorkspace(root, fn) {
    const gated = await gateRoot(root)
    if (!gated.ok) return gated
    return fn(gated.value)
  }

  async function withGitRepo(root, hint, samplePath, fn) {
    return withWorkspace(root, async (workspace) => {
      const repos = await discoverRepos(workspace)
      if (repos.length === 0) return fail('not-repo', '不是 git 仓库')
      if (repos.length > 1 && (hint == null || hint === '') && !samplePath) {
        return fail('bad-repo', '请选择仓库')
      }
      const repo = pickRepo(repos, samplePath, hint)
      if (!repo) return fail('not-repo', '不是 git 仓库')
      return fn(workspace, repo)
    })
  }

  async function withGitPaths(root, hint, rawPaths, fn) {
    const sample = collectPaths(rawPaths)[0] || ''
    return withGitRepo(root, hint, sample, async (workspace, repo) => {
      const gated = relPaths(workspace, rawPaths)
      if (!gated.ok) return gated
      const gitPaths = []
      for (const item of gated.value) {
        if (repo.rel && item !== repo.rel && !item.startsWith(`${repo.rel}/`)) {
          return fail('bad-path', '文件不在这个仓库里')
        }
        const gitRel = gitRelInRepo(repo, item)
        if (gitRel === '' || gitRel === '..' || gitRel.startsWith('../')) {
          return fail('forbidden', '路径不允许')
        }
        gitPaths.push(gitRel)
      }
      return fn(repo, gitPaths)
    })
  }

  return {
    async snapshot(root) {
      return withWorkspace(root, async (cwd) => {
        const found = await discoverRepos(cwd)
        if (found.length === 0) {
          return ok({
            repo: false,
            repos: [],
            name: basename(cwd),
            branch: '',
            detached: false,
            empty: false,
            git: {},
            staged: [],
            changes: [],
            conflicts: [],
            stashes: [],
            submodules: [],
            remotes: [],
            upstream: '',
            op: { kind: '', label: '' },
          })
        }
        try {
          const repos = []
          for (const entry of found) repos.push(await readRepoState(entry))
          const git = {}
          for (const item of repos) Object.assign(git, item.git)
          const primary = repos.find((item) => item.rel === '') || repos[0]
          const single = repos.length === 1
          return ok({
            repo: true,
            repos,
            name: single ? primary.name : basename(cwd),
            branch: single ? primary.branch : '',
            detached: single ? primary.detached : false,
            empty: single ? primary.empty : false,
            ahead: single ? primary.ahead : 0,
            behind: single ? primary.behind : 0,
            upstream: single ? primary.upstream : '',
            remotes: single ? primary.remotes : [],
            op: single ? primary.op : { kind: '', label: '' },
            git,
            staged: single ? primary.staged : [],
            changes: single ? primary.changes : [],
            conflicts: single ? primary.conflicts : [],
            stashes: single ? primary.stashes : [],
            submodules: single ? primary.submodules : [],
          })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async diff(root, path, side, untracked, repo) {
      return withGitPaths(root, repo, path, async (entry, gitPaths) => {
        const rel = gitPaths[0]
        const cwd = entry.abs
        const which = side === 'index' ? 'index' : 'worktree'
        try {
          const loose = untracked === true || (which === 'worktree' && !await isTracked(cwd, rel))
          if (loose) {
            const work = await readWorktreeText(cwd, rel)
            if (work.directory) {
              return ok({
                path: prefixRel(entry.rel, rel),
                repo: entry.rel,
                side: 'worktree',
                untracked: true,
                directory: true,
                binary: false,
                before: '',
                after: '',
                leftTitle: '不存在',
                rightTitle: '工作区',
                text: '',
              })
            }
            return ok({
              path: prefixRel(entry.rel, rel),
              repo: entry.rel,
              side: 'worktree',
              untracked: true,
              binary: work.binary === true,
              truncated: work.truncated === true,
              before: '',
              after: work.binary ? '' : (work.text ?? ''),
              leftTitle: '不存在',
              rightTitle: '工作区',
              text: work.binary ? '' : (work.text ?? ''),
              hunks: [],
              lfs: isLfsPointer(work.text),
            })
          }
          const args = which === 'index'
            ? ['diff', '--cached', '--', rel]
            : ['diff', '--', rel]
          const unified = await runGit(cwd, args, { allowCodes: [1], maxBuffer: MAX_DIFF + 64 * 1024 })
          const binary = /^Binary files /m.test(unified.stdout)
          const beforeBlob = which === 'index'
            ? await readGitText(cwd, `HEAD:${rel}`)
            : await readGitText(cwd, `:0:${rel}`)
          const afterBlob = which === 'index'
            ? await readGitText(cwd, `:0:${rel}`)
            : await readWorktreeText(cwd, rel)
          const afterText = afterBlob.directory ? '' : (afterBlob.text ?? '')
          const lfs = isLfsPointer(beforeBlob.text) || isLfsPointer(afterText)
          let conflict = false
          try {
            const listed = await runGit(cwd, ['ls-files', '-u', '--', rel])
            conflict = String(listed.stdout).trim() !== ''
          } catch {
            conflict = false
          }
          return ok({
            path: prefixRel(entry.rel, rel),
            repo: entry.rel,
            side: which,
            untracked: false,
            binary: binary || beforeBlob.binary === true || afterBlob.binary === true,
            truncated: beforeBlob.truncated === true || afterBlob.truncated === true,
            before: binary ? '' : (beforeBlob.text ?? ''),
            after: binary ? '' : afterText,
            leftTitle: which === 'index' ? 'HEAD' : '索引',
            rightTitle: which === 'index' ? '暂存' : '工作区',
            text: unified.stdout.slice(0, MAX_DIFF),
            hunks: binary ? [] : parseUnifiedHunks(unified.stdout),
            lfs,
            conflict,
          })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async stage(root, paths, repo) {
      return withGitPaths(root, repo, paths, async (entry, gitPaths) => {
        try {
          await runGit(entry.abs, ['add', '--', ...gitPaths], { timeout: 20000 })
          return ok({ paths: gitPaths.map((item) => prefixRel(entry.rel, item)), repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async unstage(root, paths, repo) {
      return withGitPaths(root, repo, paths, async (entry, gitPaths) => {
        try {
          await runGit(entry.abs, ['restore', '--staged', '--', ...gitPaths], { timeout: 20000 })
          return ok({ paths: gitPaths.map((item) => prefixRel(entry.rel, item)), repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async discard(root, paths, repo) {
      return withGitPaths(root, repo, paths, async (entry, gitPaths) => {
        try {
          const tracked = []
          const loose = []
          for (const rel of gitPaths) {
            if (await isTracked(entry.abs, rel)) tracked.push(rel)
            else loose.push(rel)
          }
          if (tracked.length > 0) {
            await runGit(entry.abs, ['restore', '--worktree', '--', ...tracked], { timeout: 20000 })
          }
          if (loose.length > 0) {
            await runGit(entry.abs, ['clean', '-fd', '--', ...loose], { timeout: 20000 })
          }
          return ok({ paths: gitPaths.map((item) => prefixRel(entry.rel, item)), repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async commit(root, message, all = false, repo, options = {}) {
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        const amend = options.amend === true
        const pushAfter = options.push === true
        const syncAfter = options.sync === true
        if (typeof message !== 'string') return fail('bad-message', '请填写提交说明')
        const text = message.replace(/^\uFEFF/, '')
        if (!amend && text.trim() === '') return fail('bad-message', '请填写提交说明')
        if (Buffer.byteLength(text, 'utf8') > MAX_MESSAGE) {
          return fail('too-large', '提交说明太长')
        }
        try {
          if (all === true) {
            await runGit(entry.abs, ['add', '-A', '--', '.'], { timeout: 20000 })
          }
          if (amend) {
            if (text.trim() === '') {
              await runGit(entry.abs, ['commit', '--amend', '--no-edit'], { timeout: 30000 })
            } else {
              await runGit(entry.abs, ['commit', '--amend', '-F', '-'], { timeout: 30000, input: text })
            }
          } else {
            const staged = await runGit(entry.abs, ['diff', '--cached', '--name-only', '-z'])
            const hasStaged = String(staged.stdout ?? '').replaceAll('\0', '').trim() !== ''
            if (!hasStaged) return fail('nothing-staged', '没有暂存的更改')
            await runGit(entry.abs, ['commit', '-F', '-'], { timeout: 30000, input: text })
          }
          const head = await runGit(entry.abs, ['rev-parse', '--short', 'HEAD'])
          if (pushAfter || syncAfter) {
            try {
              const remote = await defaultRemote(entry.abs)
              const upstream = await readUpstream(entry.abs)
              if (!upstream) {
                if (!remote) return fail('git', '已提交，但没有远程')
                await runGit(entry.abs, ['push', '-u', remote, 'HEAD'], { timeout: REMOTE_TIMEOUT })
              } else {
                if (syncAfter) await runGit(entry.abs, ['pull', '--stat'], { timeout: REMOTE_TIMEOUT })
                await runGit(entry.abs, ['push'], { timeout: REMOTE_TIMEOUT })
              }
            } catch (error) {
              return fail('git', `已提交，但${syncAfter ? '同步' : '推送'}失败：${String(error.message ?? error)}`)
            }
          }
          return ok({
            hash: head.stdout.trim(),
            repo: entry.rel,
            pushed: pushAfter === true || syncAfter === true,
            synced: syncAfter === true,
          })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async refs(root, repo) {
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          const listed = await runGit(entry.abs, [
            'for-each-ref',
            '--sort=-committerdate',
            `--format=${REF_FORMAT}`,
            '--count',
            String(MAX_REFS),
            'refs/heads',
            'refs/remotes',
            'refs/tags',
          ], { timeout: 15000 })
          const refs = parseRefRecords(listed.stdout).map((item) => ({
            ...item,
            ago: relativeTime(item.date),
          }))
          let current = ''
          let detached = false
          try {
            const name = (await runGit(entry.abs, ['rev-parse', '--abbrev-ref', 'HEAD'])).stdout.trim()
            if (name === 'HEAD') detached = true
            else current = name
          } catch {
            detached = true
          }
          return ok({ current, detached, refs, repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async checkout(root, options = {}) {
      return withGitRepo(root, options.repo, '', async (_workspace, entry) => {
        const create = options.create === true
        const detached = options.detached === true
        const kind = options.kind
        const name = safeGitName(options.name)
        const ref = safeGitName(options.ref)
        const from = safeGitName(options.from)
        try {
          if (create) {
            if (!name) return fail('bad-name', '请填写新分支名')
            if (await refExists(entry.abs, `refs/heads/${name}`)) return fail('exists', '这个分支名已经有了')
            if (from) await gitMove(entry.abs, ['switch', '-c', name, '--', from])
            else await gitMove(entry.abs, ['switch', '-c', name])
            return ok({ branch: name, created: true, detached: false, repo: entry.rel })
          }
          if (!ref) return fail('bad-ref', '缺少分支或标记')
          if (detached || kind === 'tag') {
            await gitMove(entry.abs, ['switch', '--detach', '--', ref])
            return ok({ branch: ref, created: false, detached: true, repo: entry.rel })
          }
          if (kind === 'remote' || (kind !== 'local' && await refExists(entry.abs, `refs/remotes/${ref}`))) {
            const localName = localFromRemote(ref)
            if (await refExists(entry.abs, `refs/heads/${localName}`)) {
              await gitMove(entry.abs, ['switch', '--', localName])
              return ok({ branch: localName, created: false, detached: false, repo: entry.rel })
            }
            await gitMove(entry.abs, ['switch', '-c', localName, '--', ref])
            return ok({ branch: localName, created: true, detached: false, repo: entry.rel })
          }
          await gitMove(entry.abs, ['switch', '--', ref])
          return ok({ branch: ref, created: false, detached: false, repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async graph(root, repo, options = {}) {
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        const all = options.all !== false
        const limit = clampGraphLimit(options.limit, DEFAULT_GRAPH)
        try {
          const args = ['log', '--topo-order', '-n', String(limit + 1), `--pretty=format:${LOG_FORMAT}`]
          if (all) args.splice(1, 0, '--all')
          else args.splice(1, 0, 'HEAD')
          const listed = await runGit(entry.abs, args, { timeout: 25000, maxBuffer: 4 * 1024 * 1024 })
          const parsed = parseLogRecords(listed.stdout)
          const hasMore = parsed.length > limit
          const slice = hasMore ? parsed.slice(0, limit) : parsed
          let head = ''
          try {
            head = (await runGit(entry.abs, ['rev-parse', 'HEAD'])).stdout.trim()
          } catch {
            head = ''
          }
          const commits = layoutGraph(slice).map((item) => ({
            ...item,
            ago: relativeTime(item.date),
            head: head !== '' && item.hash === head,
          }))
          return ok({ repo: entry.rel, head, all, limit, hasMore, commits })
        } catch (error) {
          const text = String(error.message ?? error)
          if (/does not have any commits|unknown revision|bad revision|ambiguous argument 'HEAD'/i.test(text)) {
            return ok({ repo: entry.rel, head: '', all, limit, hasMore: false, commits: [] })
          }
          return fail('git', text)
        }
      })
    },

    async commitFiles(root, repo, hash) {
      const id = safeHash(hash)
      if (!id) return fail('bad-ref', '缺少提交')
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          let parent = ''
          try {
            parent = (await runGit(entry.abs, ['rev-parse', `${id}^`])).stdout.trim()
          } catch {
            parent = ''
          }
          const listed = parent
            ? await runGit(entry.abs, ['diff', '--name-status', '-M', parent, id], {
              timeout: 20000,
              maxBuffer: MAX_DIFF + 64 * 1024,
              allowCodes: [1],
            })
            : await runGit(entry.abs, ['diff-tree', '--no-commit-id', '--root', '-r', '--name-status', '-M', id], {
              timeout: 20000,
              maxBuffer: MAX_DIFF + 64 * 1024,
            })
          const files = parseNameStatus(listed.stdout).map((item) => prefixItem(entry.rel, item))
          return ok({ repo: entry.rel, hash: id, files })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async commitDiff(root, repo, hash, path) {
      const id = safeHash(hash)
      if (!id) return fail('bad-ref', '缺少提交')
      return withGitPaths(root, repo, path, async (entry, gitPaths) => {
        const rel = gitPaths[0]
        try {
          let parent = ''
          try {
            parent = (await runGit(entry.abs, ['rev-parse', `${id}^`])).stdout.trim()
          } catch {
            parent = ''
          }
          const beforeBlob = parent ? await readGitText(entry.abs, `${parent}:${rel}`) : { text: '', missing: true }
          const afterBlob = await readGitText(entry.abs, `${id}:${rel}`)
          const missingBefore = beforeBlob.missing === true
          const missingAfter = afterBlob.missing === true
          const binary = beforeBlob.binary === true || afterBlob.binary === true
          return ok({
            path: prefixRel(entry.rel, rel),
            repo: entry.rel,
            side: 'commit',
            commit: id,
            untracked: false,
            binary,
            truncated: beforeBlob.truncated === true || afterBlob.truncated === true,
            before: binary ? '' : (missingBefore ? '' : (beforeBlob.text ?? '')),
            after: binary ? '' : (missingAfter ? '' : (afterBlob.text ?? '')),
            leftTitle: parent ? id.slice(0, 7) + '^' : '不存在',
            rightTitle: id.slice(0, 7),
            text: '',
          })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async cherryPick(root, repo, hash) {
      const id = safeHash(hash)
      if (!id) return fail('bad-ref', '缺少提交')
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          await runGit(entry.abs, ['cherry-pick', id], { timeout: 30000 })
          return ok({ hash: id, repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async revert(root, repo, hash) {
      const id = safeHash(hash)
      if (!id) return fail('bad-ref', '缺少提交')
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          await runGit(entry.abs, ['revert', '--no-edit', id], { timeout: 30000 })
          return ok({ hash: id, repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async reset(root, repo, hash, mode) {
      const id = safeHash(hash)
      if (!id) return fail('bad-ref', '缺少提交')
      const which = mode === 'hard' ? 'hard' : (mode === 'soft' ? 'soft' : 'mixed')
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          await runGit(entry.abs, ['reset', `--${which}`, id], { timeout: 20000 })
          return ok({ hash: id, mode: which, repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async tag(root, repo, name, hash) {
      const label = safeGitName(name)
      const id = safeHash(hash)
      if (!label) return fail('bad-name', '请填写标记名')
      if (!id) return fail('bad-ref', '缺少提交')
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          await runGit(entry.abs, ['tag', '--', label, id], { timeout: 15000 })
          return ok({ name: label, hash: id, repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async remote(root, repo, kind) {
      const op = String(kind || '')
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          const remote = await defaultRemote(entry.abs)
          const upstream = await readUpstream(entry.abs)
          if (op === 'fetch') {
            await runGit(entry.abs, ['fetch', '--all', '--prune', '--tags'], { timeout: REMOTE_TIMEOUT })
            return ok({ kind: 'fetch', repo: entry.rel })
          }
          if (op === 'pull') {
            await runGit(entry.abs, ['pull', '--stat'], { timeout: REMOTE_TIMEOUT })
            return ok({ kind: 'pull', repo: entry.rel })
          }
          if (op === 'push') {
            if (!upstream) {
              if (!remote) return fail('git', '没有远程')
              await runGit(entry.abs, ['push', '-u', remote, 'HEAD'], { timeout: REMOTE_TIMEOUT })
            } else {
              await runGit(entry.abs, ['push'], { timeout: REMOTE_TIMEOUT })
            }
            return ok({ kind: 'push', repo: entry.rel })
          }
          if (op === 'publish') {
            if (!remote) return fail('git', '没有远程')
            await runGit(entry.abs, ['push', '-u', remote, 'HEAD'], { timeout: REMOTE_TIMEOUT })
            return ok({ kind: 'publish', repo: entry.rel })
          }
          if (op === 'sync') {
            if (!upstream) {
              if (!remote) return fail('git', '没有远程')
              await runGit(entry.abs, ['push', '-u', remote, 'HEAD'], { timeout: REMOTE_TIMEOUT })
            } else {
              await runGit(entry.abs, ['pull', '--stat'], { timeout: REMOTE_TIMEOUT })
              await runGit(entry.abs, ['push'], { timeout: REMOTE_TIMEOUT })
            }
            return ok({ kind: 'sync', repo: entry.rel })
          }
          return fail('bad-request', '不认识这个远程动作')
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async stash(root, repo, options = {}) {
      const op = String(options.op || 'push')
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          if (op === 'push') {
            const message = typeof options.message === 'string' ? options.message.trim() : ''
            const args = ['stash', 'push']
            if (options.includeUntracked === true) args.push('-u')
            if (message) args.push('-m', message)
            await runGit(entry.abs, args, { timeout: 20000 })
            return ok({ op, repo: entry.rel })
          }
          const ref = safeStashRef(options.ref) || 'stash@{0}'
          if (op === 'apply') await runGit(entry.abs, ['stash', 'apply', '--', ref], { timeout: 20000 })
          else if (op === 'pop') await runGit(entry.abs, ['stash', 'pop', '--', ref], { timeout: 20000 })
          else if (op === 'drop') await runGit(entry.abs, ['stash', 'drop', '--', ref], { timeout: 15000 })
          else return fail('bad-request', '不认识这个储藏动作')
          return ok({ op, ref, repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async merge(root, repo, options = {}) {
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          if (options.abort === true) {
            await runGit(entry.abs, ['merge', '--abort'], { timeout: 20000 })
            return ok({ op: 'abort', repo: entry.rel })
          }
          if (options.continue === true) {
            await runGit(entry.abs, ['merge', '--continue'], { timeout: 30000, env: { GIT_EDITOR: 'true' } })
            return ok({ op: 'continue', repo: entry.rel })
          }
          const ref = safeGitName(options.ref)
          if (!ref) return fail('bad-ref', '缺少分支或提交')
          await runGit(entry.abs, ['merge', '--no-edit', '--', ref], { timeout: 30000 })
          return ok({ op: 'merge', ref, repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async rebase(root, repo, options = {}) {
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          if (options.abort === true) {
            await runGit(entry.abs, ['rebase', '--abort'], { timeout: 20000 })
            return ok({ op: 'abort', repo: entry.rel })
          }
          if (options.continue === true) {
            await runGit(entry.abs, ['rebase', '--continue'], { timeout: 30000, env: { GIT_EDITOR: 'true' } })
            return ok({ op: 'continue', repo: entry.rel })
          }
          const ref = safeGitName(options.ref)
          if (!ref) return fail('bad-ref', '缺少分支或提交')
          await runGit(entry.abs, ['rebase', '--', ref], { timeout: 60000 })
          return ok({ op: 'rebase', ref, repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async continueOp(root, repo) {
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        const op = await detectOp(entry.abs)
        try {
          if (op.kind === 'merge') await runGit(entry.abs, ['merge', '--continue'], { timeout: 30000, env: { GIT_EDITOR: 'true' } })
          else if (op.kind === 'rebase') await runGit(entry.abs, ['rebase', '--continue'], { timeout: 30000, env: { GIT_EDITOR: 'true' } })
          else if (op.kind === 'cherry-pick') await runGit(entry.abs, ['cherry-pick', '--continue'], { timeout: 30000, env: { GIT_EDITOR: 'true' } })
          else if (op.kind === 'revert') await runGit(entry.abs, ['revert', '--continue'], { timeout: 30000, env: { GIT_EDITOR: 'true' } })
          else return fail('bad-request', '现在没有进行中的合并或变基')
          return ok({ op: 'continue', kind: op.kind, repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async abortOp(root, repo) {
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        const op = await detectOp(entry.abs)
        try {
          if (op.kind === 'merge') await runGit(entry.abs, ['merge', '--abort'], { timeout: 20000 })
          else if (op.kind === 'rebase') await runGit(entry.abs, ['rebase', '--abort'], { timeout: 20000 })
          else if (op.kind === 'cherry-pick') await runGit(entry.abs, ['cherry-pick', '--abort'], { timeout: 20000 })
          else if (op.kind === 'revert') await runGit(entry.abs, ['revert', '--abort'], { timeout: 20000 })
          else return fail('bad-request', '现在没有进行中的合并或变基')
          return ok({ op: 'abort', kind: op.kind, repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async hunk(root, repo, path, op, patch) {
      const which = String(op || '')
      if (!looksLikePatch(patch) || String(patch).length > MAX_PATCH) {
        return fail('bad-patch', '这块差异无效')
      }
      return withGitPaths(root, repo, path, async (entry) => {
        try {
          const args = which === 'stage'
            ? ['apply', '--cached', '--recount', '-']
            : which === 'unstage'
              ? ['apply', '--cached', '--reverse', '--recount', '-']
              : which === 'discard'
                ? ['apply', '--reverse', '--recount', '-']
                : null
          if (!args) return fail('bad-request', '不认识这个块动作')
          await runGit(entry.abs, args, { timeout: 20000, input: String(patch) })
          return ok({ op: which, repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async take(root, repo, path, which) {
      const side = which === 'theirs' ? '--theirs' : '--ours'
      return withGitPaths(root, repo, path, async (entry, gitPaths) => {
        try {
          await runGit(entry.abs, ['checkout', side, '--', ...gitPaths], { timeout: 15000 })
          await runGit(entry.abs, ['add', '--', ...gitPaths], { timeout: 15000 })
          return ok({ paths: gitPaths.map((item) => prefixRel(entry.rel, item)), repo: entry.rel, side: which === 'theirs' ? 'theirs' : 'ours' })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async ignore(root, repo, path) {
      return withGitPaths(root, repo, path, async (entry, gitPaths) => {
        const rel = gitPaths[0]
        try {
          const abs = join(entry.abs, '.gitignore')
          let prev = ''
          try {
            prev = await readFile(abs, 'utf8')
          } catch {
            prev = ''
          }
          const lines = prev.split(/\r?\n/)
          if (lines.some((item) => item === rel)) {
            return ok({ path: prefixRel(entry.rel, rel), repo: entry.rel, already: true })
          }
          const prefix = prev && !prev.endsWith('\n') ? '\n' : ''
          if (prev === '') await writeFile(abs, `${rel}\n`, 'utf8')
          else await appendFile(abs, `${prefix}${rel}\n`, 'utf8')
          return ok({ path: prefixRel(entry.rel, rel), repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async init(root) {
      return withWorkspace(root, async (cwd) => {
        try {
          const found = await discoverRepos(cwd)
          if (found.some((item) => item.rel === '')) return fail('exists', '这里已经是 git 仓库')
          await runGit(cwd, ['init'], { timeout: 15000 })
          return ok({ repo: '', name: basename(cwd) })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async clone(root, url, name) {
      const remote = safeCloneUrl(url)
      if (!remote) return fail('bad-url', '克隆地址不合法')
      const folder = isSafeName(name) ? name.trim() : ''
      if (!folder) return fail('bad-name', '请填写文件夹名')
      return withWorkspace(root, async (cwd) => {
        const dest = joinUnderRoot(cwd, folder)
        if (dest === null) return fail('forbidden', '路径不允许')
        try {
          try {
            const listed = await readdir(dest)
            if (listed.length > 0) return fail('exists', '这个文件夹不是空的')
          } catch {
            // 文件夹还不存在，交给 clone 去建
          }
          await runGit(cwd, ['clone', '--', remote, folder], { timeout: 180000 })
          return ok({ path: folder })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async branchOp(root, repo, options = {}) {
      const op = String(options.op || '')
      const name = safeGitName(options.name)
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          const current = (await runGit(entry.abs, ['rev-parse', '--abbrev-ref', 'HEAD'])).stdout.trim()
          if (op === 'delete') {
            if (!name) return fail('bad-name', '缺少分支名')
            if (name === current) return fail('bad-ref', '不能删当前分支')
            await runGit(entry.abs, ['branch', options.force === true ? '-D' : '-d', '--', name], { timeout: 15000 })
            return ok({ op, name, repo: entry.rel })
          }
          if (op === 'rename') {
            const next = safeGitName(options.newName)
            if (!next) return fail('bad-name', '请填写新分支名')
            if (name && name !== current) await runGit(entry.abs, ['branch', '-m', name, next], { timeout: 15000 })
            else await runGit(entry.abs, ['branch', '-m', next], { timeout: 15000 })
            return ok({ op, name: next, repo: entry.rel })
          }
          return fail('bad-request', '不认识这个分支动作')
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async fileLog(root, repo, path) {
      return withGitPaths(root, repo, path, async (entry, gitPaths) => {
        try {
          const listed = await runGit(entry.abs, [
            'log', '--follow', '--topo-order', '-n', '80', `--pretty=format:${LOG_FORMAT}`, '--', gitPaths[0],
          ], { timeout: 20000, maxBuffer: 4 * 1024 * 1024 })
          const commits = parseLogRecords(listed.stdout).map((item) => ({
            ...item,
            ago: relativeTime(item.date),
          }))
          return ok({ repo: entry.rel, path: prefixRel(entry.rel, gitPaths[0]), commits })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async blame(root, repo, path) {
      return withGitPaths(root, repo, path, async (entry, gitPaths) => {
        try {
          const listed = await runGit(entry.abs, ['blame', '--line-porcelain', '--', gitPaths[0]], {
            timeout: 20000,
            maxBuffer: 4 * 1024 * 1024,
          })
          return ok({
            repo: entry.rel,
            path: prefixRel(entry.rel, gitPaths[0]),
            lines: parseBlamePorcelain(listed.stdout),
          })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async compare(root, repo, a, b) {
      const left = safeHash(a) || safeGitName(a)
      const right = safeHash(b) || safeGitName(b)
      if (!left || !right) return fail('bad-ref', '缺少要对比的两次提交')
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          const listed = await runGit(entry.abs, ['diff', '--name-status', '-M', left, right], {
            timeout: 20000,
            allowCodes: [1],
            maxBuffer: MAX_DIFF + 64 * 1024,
          })
          const files = parseNameStatus(listed.stdout).map((item) => prefixItem(entry.rel, item))
          return ok({ repo: entry.rel, a: left, b: right, files })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async compareDiff(root, repo, a, b, path) {
      const left = safeHash(a) || safeGitName(a)
      const right = safeHash(b) || safeGitName(b)
      if (!left || !right) return fail('bad-ref', '缺少要对比的两次提交')
      return withGitPaths(root, repo, path, async (entry, gitPaths) => {
        const rel = gitPaths[0]
        try {
          const beforeBlob = await readGitText(entry.abs, `${left}:${rel}`)
          const afterBlob = await readGitText(entry.abs, `${right}:${rel}`)
          const binary = beforeBlob.binary === true || afterBlob.binary === true
          return ok({
            path: prefixRel(entry.rel, rel),
            repo: entry.rel,
            side: 'compare',
            a: left,
            b: right,
            binary,
            before: binary ? '' : (beforeBlob.missing ? '' : (beforeBlob.text ?? '')),
            after: binary ? '' : (afterBlob.missing ? '' : (afterBlob.text ?? '')),
            leftTitle: String(left).slice(0, 7),
            rightTitle: String(right).slice(0, 7),
            text: '',
          })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },

    async submoduleUpdate(root, repo) {
      return withGitRepo(root, repo, '', async (_workspace, entry) => {
        try {
          await runGit(entry.abs, ['submodule', 'update', '--init', '--recursive'], { timeout: 180000 })
          return ok({ repo: entry.rel })
        } catch (error) {
          return fail('git', String(error.message ?? error))
        }
      })
    },
  }
}
