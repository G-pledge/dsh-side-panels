import { execFile } from 'node:child_process'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { isForbiddenRel, joinUnderRoot, toPosix } from './paths.js'
import { isUnmerged } from './git-extra.js'

export function gitBin() {
  return process.platform === 'win32' ? 'git.exe' : 'git'
}

/** porcelain 一行变成树上显示的字母：U/M/A/D/R。 */
export function letterFromPorcelain(x, y) {
  if (isUnmerged(x, y)) return 'C'
  if (x === '?' && y === '?') return 'U'
  if (x === 'A' || y === 'A') return 'A'
  if (x === 'D' || y === 'D') return 'D'
  if (x === 'R' || y === 'R') return 'R'
  if (x === 'M' || y === 'M') return 'M'
  if (y !== ' ' && y !== undefined) return y
  if (x !== ' ' && x !== undefined) return x
  return ''
}

function unquotePath(raw) {
  let path = String(raw ?? '').trim()
  if (path.startsWith('"') && path.endsWith('"') && path.length >= 2) {
    path = path.slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }
  return path.replaceAll('\\', '/').replace(/\/$/, '')
}

function splitRename(rest, x) {
  const arrow = rest.lastIndexOf(' -> ')
  if (arrow < 0 || (x !== 'R' && x !== 'C')) {
    return { path: unquotePath(rest), origPath: undefined }
  }
  return {
    origPath: unquotePath(rest.slice(0, arrow)),
    path: unquotePath(rest.slice(arrow + 4)),
  }
}

/**
 * 把 porcelain 拆成树上的字母、暂存列表、未暂存列表、冲突列表。
 * 同一个文件可以同时出现在暂存和未暂存两组里（例如暂存后又改了）。
 */
export function parseStatusGroups(stdout) {
  const staged = []
  const changes = []
  const conflicts = []
  const letters = {}
  const seenStaged = new Set()
  const seenChanges = new Set()
  const seenConflicts = new Set()

  for (const raw of String(stdout ?? '').split(/\r?\n/)) {
    if (raw.length < 3) continue
    const x = raw[0]
    const y = raw[1]
    const rest = raw.length >= 4 && raw[2] === ' ' ? raw.slice(3) : raw.slice(2).replace(/^\s/, '')
    const { path, origPath } = splitRename(rest, x)
    if (path === '') continue

    const letter = letterFromPorcelain(x, y)
    if (letter !== '') letters[path] = letter

    if (isUnmerged(x, y)) {
      if (!seenConflicts.has(path)) {
        conflicts.push({ path, origPath, letter: 'C', conflict: true, pair: `${x}${y}` })
        seenConflicts.add(path)
      }
      continue
    }

    if (x === '?' && y === '?') {
      if (!seenChanges.has(path)) {
        changes.push({ path, letter: 'U', untracked: true })
        seenChanges.add(path)
      }
      continue
    }

    if (x !== ' ' && x !== '?' && !seenStaged.has(path)) {
      staged.push({
        path,
        origPath,
        letter: letterFromPorcelain(x, ' ') || x,
        untracked: false,
      })
      seenStaged.add(path)
    }
    if (y !== ' ' && y !== '?' && y !== undefined && !seenChanges.has(path)) {
      changes.push({
        path,
        origPath,
        letter: letterFromPorcelain(' ', y) || y,
        untracked: false,
      })
      seenChanges.add(path)
    }
  }

  return { staged, changes, conflicts, letters }
}

export function parsePorcelain(stdout) {
  return parseStatusGroups(stdout).letters
}

/** `git status -sb` 第一行：当前分支。 */
export function parseBranchLine(line) {
  const raw = String(line ?? '').replace(/\r$/, '')
  const rest = raw.startsWith('## ') ? raw.slice(3) : raw
  if (rest === '' || rest === '##') {
    return { branch: '', detached: false, empty: false, ahead: 0, behind: 0 }
  }
  if (rest.startsWith('HEAD (no branch)') || rest.startsWith('(HEAD detached') || rest.startsWith('HEAD detached')) {
    return { branch: 'HEAD', detached: true, empty: false, ahead: 0, behind: 0 }
  }
  const emptyMatch = rest.match(/^No commits yet on ([^\s.]+)/)
  if (emptyMatch) {
    return { branch: emptyMatch[1], detached: false, empty: true, ahead: 0, behind: 0 }
  }
  const name = rest.split('...')[0].split(' ')[0]
  let ahead = 0
  let behind = 0
  const bracket = rest.match(/\[([^\]]+)\]/)
  if (bracket) {
    const aheadMatch = bracket[1].match(/ahead (\d+)/)
    const behindMatch = bracket[1].match(/behind (\d+)/)
    if (aheadMatch) ahead = Number(aheadMatch[1])
    if (behindMatch) behind = Number(behindMatch[1])
  }
  return { branch: name, detached: false, empty: false, ahead, behind }
}

export function humanizeGitError(stderr, error) {
  const text = `${stderr ?? ''}\n${error?.message ?? ''}`
  if (error?.code === 'ENOENT') return '本机找不到 git'
  if (/Please tell me who you are/i.test(text)) {
    return '还没设置 git 用户名和邮箱，先在终端里配好再提交'
  }
  if (/nothing to commit/i.test(text)) return '没有可提交的更改'
  if (/did not match any file/i.test(text)) return '找不到这个路径'
  if (/not a git repository/i.test(text)) return '不是 git 仓库'
  if (/would be overwritten by checkout|Your local changes to the following files would be overwritten/i.test(text)) {
    return '工作区还有未提交的改动，签出前先提交或丢掉'
  }
  if (/already exists/i.test(text)) return '这个分支名已经有了'
  if (/invalid reference|unknown revision|did not match any/i.test(text)) return '找不到这个分支或标记'
  if (/is not a valid branch name/i.test(text)) return '分支名不合法'
  if (/conflict|CONFLICT \(content\)|fix conflicts|unmerged paths/i.test(text)) {
    return '有冲突，先在更改里处理完再继续'
  }
  if (/You have not concluded your (cherry-pick|merge|revert)/i.test(text)) {
    return '上一次拣选、合并或还原还没结束'
  }
  if (/Cannot cherry-pick|cannot revert|empty commit/i.test(text)) {
    return '这次拣选或还原做不了'
  }
  if (/could not read Username|Authentication failed|Permission denied \(publickey\)|could not read Password/i.test(text)) {
    return '远程要登录或 SSH 钥匙，先在终端里配好'
  }
  if (/unable to access|Could not resolve host|Failed to connect|timed out|Connection refused/i.test(text)) {
    return '连不上远程'
  }
  if (/no upstream|has no upstream|The current branch .* has no upstream/i.test(text)) {
    return '当前分支还没有对应的远程分支，先发布'
  }
  if (/Updates were rejected|non-fast-forward/i.test(text)) {
    return '远程有新提交，先拉取再推送'
  }
  const first = String(stderr ?? '')
    .replaceAll('\r', '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('hint:') && !line.startsWith('warning:'))
  return first || error?.message || 'git 执行失败'
}

export function parseUpstreamTrack(raw) {
  const text = String(raw ?? '')
  let ahead = 0
  let behind = 0
  const aheadMatch = text.match(/ahead (\d+)/)
  const behindMatch = text.match(/behind (\d+)/)
  if (aheadMatch) ahead = Number(aheadMatch[1])
  if (behindMatch) behind = Number(behindMatch[1])
  return { ahead, behind }
}

export function relativeTime(unix, now = Date.now()) {
  const at = Number(unix)
  if (!Number.isFinite(at) || at <= 0) return ''
  const sec = Math.max(0, Math.floor((now - at * 1000) / 1000))
  if (sec < 60) return '刚刚'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天前`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month} 个月前`
  return `${Math.floor(month / 12)} 年前`
}

function kindFromRefname(refname) {
  if (refname.startsWith('refs/heads/')) return 'local'
  if (refname.startsWith('refs/remotes/')) return 'remote'
  if (refname.startsWith('refs/tags/')) return 'tag'
  return ''
}

/** `git for-each-ref` 用 %00 拼出来的记录。 */
export function parseRefRecords(stdout) {
  const refs = []
  for (const raw of String(stdout ?? '').split(/\n/)) {
    const line = raw.replace(/\r$/, '')
    if (line === '') continue
    const parts = line.split('\0')
    if (parts.length < 7) continue
    const [head, refname, short, sha, date, author, subject, track = ''] = parts
    const kind = kindFromRefname(refname)
    if (!kind || !short) continue
    if (kind === 'remote' && /\/HEAD$/.test(refname)) continue
    const { ahead, behind } = parseUpstreamTrack(track)
    refs.push({
      kind,
      name: short,
      ref: refname,
      sha,
      date: Number(date) || 0,
      author: author || '',
      subject: subject || '',
      ahead,
      behind,
      current: head.trim() === '*',
    })
  }
  return refs
}

/**
 * @param {string} cwd
 * @param {string[]} args
 * @param {{ timeout?: number, maxBuffer?: number, input?: string, allowCodes?: number[] }} [options]
 */
export function runGit(cwd, args, options = {}) {
  const timeout = options.timeout ?? 8000
  const maxBuffer = options.maxBuffer ?? 2 * 1024 * 1024
  const allowCodes = options.allowCodes ?? []
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      ...(options.env || {}),
      GIT_TERMINAL_PROMPT: '0',
      GIT_OPTIONAL_LOCKS: '0',
      GIT_PAGER: '',
    }
    delete env.GIT_DIR
    delete env.GIT_WORK_TREE
    const child = execFile(
      gitBin(),
      ['--no-pager', '-c', 'core.quotepath=false', '-c', 'commit.gpgsign=false', '-c', 'core.pager=', ...args],
      {
        cwd,
        windowsHide: true,
        timeout,
        maxBuffer,
        env,
      },
      (error, stdout, stderr) => {
        const exit = typeof error?.code === 'number' ? error.code : undefined
        if (error && exit !== undefined && allowCodes.includes(exit)) {
          resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') })
          return
        }
        if (error) {
          reject(new Error(humanizeGitError(stderr, error)))
          return
        }
        resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') })
      },
    )
    if (options.input != null) child.stdin.write(String(options.input))
    child.stdin.end()
  })
}

export async function gitStatusLetters(rootReal) {
  const repos = await discoverRepos(rootReal)
  if (repos.length === 0) return {}
  const letters = {}
  await Promise.all(repos.map(async (repo) => {
    try {
      const { stdout } = await runGit(repo.abs, ['status', '--porcelain', '-uall'], { timeout: 4000 })
      const parsed = parseStatusGroups(stdout).letters
      for (const [path, letter] of Object.entries(parsed)) {
        letters[prefixRel(repo.rel, path)] = letter
      }
    } catch {
      // 这个仓库读不了就跳过
    }
  }))
  return letters
}

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', 'target',
  '.git', '.next', '.cache', '__pycache__',
])
const MAX_REPOS = 24

function dirName(abs) {
  const parts = String(abs).split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] ?? abs
}

async function hasGitDir(abs) {
  try {
    await stat(join(abs, '.git'))
    return true
  } catch {
    return false
  }
}

export function prefixRel(repoRel, path) {
  const rel = toPosix(repoRel || '').replace(/^\/+|\/+$/g, '')
  const file = toPosix(path || '').replace(/^\/+/, '')
  if (rel === '') return file
  if (file === '' || file === '.') return rel
  return `${rel}/${file}`
}

export function pickRepo(repos, workspaceRel, hint) {
  const list = Array.isArray(repos) ? repos : []
  if (hint != null && String(hint) !== '') {
    const want = toPosix(hint).replace(/^\/+|\/+$/g, '')
    const hit = list.find((item) => item.rel === want)
    if (hit) return hit
  }
  const posix = toPosix(workspaceRel || '').replace(/^\/+/, '')
  const nested = list
    .filter((item) => item.rel && (posix === item.rel || posix.startsWith(`${item.rel}/`)))
    .sort((a, b) => b.rel.length - a.rel.length)
  if (nested[0]) return nested[0]
  return list.find((item) => item.rel === '') || list[0]
}

export function gitRelInRepo(repo, workspaceRel) {
  const posix = toPosix(workspaceRel || '').replace(/^\/+/, '')
  if (!repo?.rel) return posix
  if (posix === repo.rel) return '.'
  if (posix.startsWith(`${repo.rel}/`)) return posix.slice(repo.rel.length + 1)
  return posix
}

/** 工作目录自己、以及往下两层带 .git 的子文件夹。 */
export async function discoverRepos(rootReal) {
  const found = []
  const seen = new Set()
  const maxDepth = 2

  async function consider(rel) {
    if (found.length >= MAX_REPOS) return
    const key = rel || '.'
    if (seen.has(key)) return
    const abs = joinUnderRoot(rootReal, rel)
    if (abs === null) return
    if (!await hasGitDir(abs)) return
    try {
      const { stdout } = await runGit(abs, ['rev-parse', '--is-inside-work-tree'], { timeout: 4000 })
      if (stdout.trim() !== 'true') return
    } catch {
      return
    }
    seen.add(key)
    found.push({ rel, abs, name: rel ? rel.split('/').pop() : dirName(rootReal) })
  }

  async function walk(parentRel, depth) {
    if (found.length >= MAX_REPOS) return
    const abs = joinUnderRoot(rootReal, parentRel)
    if (abs === null) return
    let dirents
    try {
      dirents = await readdir(abs, { withFileTypes: true })
    } catch {
      return
    }
    const names = dirents
      .filter((item) => item.isDirectory() || item.isSymbolicLink())
      .map((item) => item.name)
      .filter((name) => !SKIP_DIRS.has(name) && !name.startsWith('.'))
      .sort((a, b) => a.localeCompare(b, 'zh'))
    for (const name of names) {
      if (found.length >= MAX_REPOS) break
      const rel = parentRel ? `${parentRel}/${name}` : name
      if (isForbiddenRel(rel)) continue
      await consider(rel)
      if (depth < maxDepth) await walk(rel, depth + 1)
    }
  }

  await consider('')
  await walk('', 1)
  return found
}
