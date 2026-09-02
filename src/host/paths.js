import { isAbsolute, relative, resolve } from 'node:path'

/** 把路径收成用 / 分隔，方便判断每一段。 */
export function toPosix(path) {
  return String(path).replaceAll('\\', '/')
}

/**
 * 相对路径里有没有越界或版本库目录。
 * 空字符串表示根目录本身，允许。
 */
export function isForbiddenRel(rel) {
  const parts = toPosix(rel).split('/').filter((part) => part !== '')
  return parts.some((part) => part === '..' || part === '.' || part === '.git')
}

/** 文件名是否能用来新建。 */
export function isSafeName(name) {
  if (typeof name !== 'string') return false
  const trimmed = name.trim()
  if (trimmed === '' || trimmed === '.' || trimmed === '..' || trimmed === '.git') return false
  if (trimmed.includes('/') || trimmed.includes('\\')) return false
  if (/[:*?"<>|]/.test(trimmed)) return false
  return true
}

/**
 * target 是否落在 root 里面（含 root 自己）。
 * 两边都应是已经 realpath 过的绝对路径。
 */
export function isInsideRoot(rootReal, targetReal) {
  const rel = relative(rootReal, targetReal)
  if (rel === '') return true
  if (isAbsolute(rel)) return false
  return rel.split(/[/\\]/)[0] !== '..'
}

/** 相对路径拼到根上，禁止越界段。 */
export function joinUnderRoot(rootReal, rel) {
  if (typeof rel !== 'string' || isForbiddenRel(rel)) return null
  const raw = toPosix(rel)
  if (raw.startsWith('/') || isAbsolute(rel) || /^[a-zA-Z]:/.test(raw)) return null
  const posix = raw.replace(/^\/+/, '')
  const abs = posix === '' ? rootReal : resolve(rootReal, posix)
  if (!isInsideRoot(rootReal, abs)) return null
  return abs
}
