const RECORD = '\x1e'
const FIELD = '\x1f'

export const MAX_GRAPH = 400
export const DEFAULT_GRAPH = 120

export function clampGraphLimit(raw, fallback = DEFAULT_GRAPH) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.min(MAX_GRAPH, Math.floor(n)))
}

/** `git log --pretty` 的 %D：HEAD、分支、远程、标记。 */
export function parseDecorate(raw) {
  const refs = []
  let detachedHead = false
  for (const part of String(raw ?? '').split(',').map((item) => item.trim()).filter(Boolean)) {
    if (part === 'HEAD') {
      detachedHead = true
      continue
    }
    if (part.startsWith('HEAD -> ')) {
      const name = part.slice(8).trim()
      if (name) refs.push({ kind: 'local', name, current: true })
      continue
    }
    if (part.startsWith('tag: ')) {
      const name = part.slice(5).trim()
      if (name) refs.push({ kind: 'tag', name, current: false })
      continue
    }
    if (/\/HEAD$/.test(part)) continue
    if (part.includes('/')) refs.push({ kind: 'remote', name: part, current: false })
    else refs.push({ kind: 'local', name: part, current: false })
  }
  return { refs, detachedHead }
}

/**
 * 一条记录：hash, parents, short, author, email, date, subject, decorate。
 * 记录之间用 \x1e 分开。
 */
export function parseLogRecords(stdout) {
  const commits = []
  for (const raw of String(stdout ?? '').split(RECORD)) {
    const line = raw.replace(/^\r?\n/, '').replace(/\r?\n$/, '')
    if (line.trim() === '') continue
    const parts = line.split(FIELD)
    if (parts.length < 7) continue
    const [hash, parentText, short, author, email, date, subject, decorate = ''] = parts
    if (!hash || !/^[0-9a-f]{4,40}$/i.test(hash)) continue
    const parents = String(parentText ?? '').trim().split(/\s+/).filter((item) => /^[0-9a-f]{4,40}$/i.test(item))
    const { refs, detachedHead } = parseDecorate(decorate)
    commits.push({
      hash,
      parents,
      short: short || hash.slice(0, 7),
      author: author || '',
      email: email || '',
      date: Number(date) || 0,
      subject: String(subject ?? '').replace(/\r/g, ''),
      refs,
      detachedHead,
    })
  }
  return commits
}

/**
 * 最新的提交在前。每个提交占一行泳道，分叉和合并用线段标出来。
 */
export function layoutGraph(commits) {
  const rows = []
  let lanes = []

  for (const commit of commits) {
    const hash = commit.hash
    const parents = Array.isArray(commit.parents) ? commit.parents.filter(Boolean) : []
    let col = lanes.indexOf(hash)
    if (col < 0) {
      col = lanes.indexOf(null)
      if (col < 0) {
        lanes.push(hash)
        col = lanes.length - 1
      } else {
        lanes[col] = hash
      }
    }

    const incoming = []
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] === hash) incoming.push(i)
    }
    if (incoming.length === 0) incoming.push(col)
    const node = incoming[0]

    const segs = []
    for (let i = 0; i < lanes.length; i++) {
      if (!lanes[i]) continue
      if (lanes[i] === hash) {
        if (i === node) segs.push({ kind: 'v', x: i })
        else segs.push({ kind: 'merge', x1: i, x2: node })
      } else {
        segs.push({ kind: 'v', x: i })
      }
    }
    segs.push({ kind: 'node', x: node })

    const next = lanes.map((item) => (item === hash ? null : item))
    if (parents[0]) next[node] = parents[0]
    for (let i = 1; i < parents.length; i++) {
      const parent = parents[i]
      let lane = next.indexOf(parent)
      if (lane < 0) {
        lane = next.indexOf(null)
        if (lane < 0) {
          next.push(parent)
          lane = next.length - 1
        } else {
          next[lane] = parent
        }
      }
      segs.push({ kind: 'fork', x1: node, x2: lane })
    }
    while (next.length > 0 && next[next.length - 1] == null) next.pop()

    rows.push({
      ...commit,
      col: node,
      cols: Math.max(lanes.length, next.length, node + 1),
      segs,
    })
    lanes = next
  }
  return rows
}

export function parseNameStatus(stdout) {
  const files = []
  const seen = new Set()
  for (const raw of String(stdout ?? '').split(/\r?\n/)) {
    if (raw === '') continue
    const parts = raw.split('\t')
    if (parts.length < 2) continue
    const code = String(parts[0] ?? '')
    const letter = code[0] === 'C' ? 'R' : (code[0] || '')
    if (!letter || letter === ' ') continue
    let origPath
    let path
    if ((letter === 'R' || code[0] === 'C') && parts.length >= 3) {
      origPath = parts[1].replaceAll('\\', '/')
      path = parts[2].replaceAll('\\', '/')
    } else {
      path = parts[1].replaceAll('\\', '/')
    }
    if (!path || seen.has(path)) continue
    seen.add(path)
    files.push({ path, origPath, letter, untracked: false })
  }
  return files
}

export const LOG_FORMAT = `%H${FIELD}%P${FIELD}%h${FIELD}%an${FIELD}%ae${FIELD}%at${FIELD}%s${FIELD}%D${RECORD}`
