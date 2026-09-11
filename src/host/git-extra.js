const FIELD = '\x1f'

export const UNMERGED_PAIRS = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'])

export function isUnmerged(x, y) {
  return UNMERGED_PAIRS.has(`${x}${y}`)
}

export function isLfsPointer(text) {
  return /^version https:\/\/git-lfs\.github\.com\/spec\/v1/m.test(String(text ?? ''))
}

export function safeCloneUrl(raw) {
  const text = String(raw ?? '').trim()
  if (text.length < 8 || text.length > 500) return null
  if (text.startsWith('-') || /[\s;|&$<>`]/.test(text)) return null
  if (/^https?:\/\//i.test(text) || /^ssh:\/\//i.test(text) || /^git@[^:\s]+:\S/.test(text)) return text
  return null
}

/** `git diff` 统一格式拆成可单独暂存的块。 */
export function parseUnifiedHunks(text) {
  const hunks = []
  const lines = String(text ?? '').split(/\n/)
  let fileHeader = []
  let current = null
  const flush = () => {
    if (current) hunks.push(current)
    current = null
  }
  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      flush()
      fileHeader = [line]
      continue
    }
    if (
      line.startsWith('index ')
      || line.startsWith('new file ')
      || line.startsWith('deleted file ')
      || line.startsWith('similarity ')
      || line.startsWith('rename ')
      || line.startsWith('--- ')
      || line.startsWith('+++ ')
    ) {
      if (!current) fileHeader.push(line)
      continue
    }
    if (line.startsWith('@@')) {
      flush()
      current = { fileHeader: fileHeader.slice(), hunkHeader: line, lines: [] }
      continue
    }
    if (current) current.lines.push(line)
  }
  flush()
  return hunks.map((item, index) => ({ ...item, index }))
}

export function patchFromHunk(hunk) {
  if (!hunk) return ''
  const parts = [...(hunk.fileHeader ?? []), hunk.hunkHeader, ...(hunk.lines ?? [])]
  let out = parts.join('\n')
  if (!out.endsWith('\n')) out += '\n'
  return out
}

export function looksLikePatch(raw) {
  const text = String(raw ?? '')
  return text.includes('diff --git ') || text.includes('\n@@') || text.startsWith('@@')
}

/** `git stash list --format=%gd%x1f%H%x1f%s%x1f%ct` */
export function parseStashList(stdout) {
  const rows = []
  for (const raw of String(stdout ?? '').split(/\r?\n/)) {
    if (raw.trim() === '') continue
    const [ref, hash, subject, date] = raw.split(FIELD)
    if (!ref) continue
    rows.push({
      ref,
      hash: hash || '',
      short: (hash || '').slice(0, 7),
      subject: subject || '',
      date: Number(date) || 0,
    })
  }
  return rows
}

/** `git submodule status` */
export function parseSubmoduleStatus(stdout) {
  const rows = []
  for (const raw of String(stdout ?? '').split(/\r?\n/)) {
    if (raw.trim() === '') continue
    const mark = raw[0]
    const rest = raw.slice(1).trim()
    const cut = rest.indexOf(' ')
    if (cut < 0) continue
    const sha = rest.slice(0, cut)
    const after = rest.slice(cut + 1)
    const paren = after.lastIndexOf(' (')
    const path = (paren > 0 ? after.slice(0, paren) : after).trim()
    const desc = paren > 0 ? after.slice(paren + 2, -1) : ''
    let state = 'ok'
    if (mark === '-') state = 'missing'
    else if (mark === '+') state = 'changed'
    else if (mark === 'U') state = 'conflict'
    rows.push({ path, sha, desc, state })
  }
  return rows
}

/** `git blame --line-porcelain` */
export function parseBlamePorcelain(stdout) {
  const lines = []
  let cur = null
  for (const line of String(stdout ?? '').split(/\n/)) {
    if (/^[0-9a-f]{40} /.test(line)) {
      cur = { hash: line.slice(0, 40), author: '', date: 0, text: '' }
      continue
    }
    if (!cur) continue
    if (line.startsWith('author ')) cur.author = line.slice(7)
    else if (line.startsWith('author-time ')) cur.date = Number(line.slice(12)) || 0
    else if (line.startsWith('\t')) {
      cur.text = line.slice(1)
      lines.push(cur)
      cur = null
    }
  }
  return lines
}

export const STASH_FORMAT = `%gd${FIELD}%H${FIELD}%s${FIELD}%ct`
