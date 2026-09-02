import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

function gitBin() {
  return process.platform === 'win32' ? 'git.exe' : 'git'
}

/** porcelain 一行变成树上显示的字母：U/M/A/D/R。 */
export function letterFromPorcelain(x, y) {
  if (x === '?' && y === '?') return 'U'
  if (x === 'A' || y === 'A') return 'A'
  if (x === 'D' || y === 'D') return 'D'
  if (x === 'R' || y === 'R') return 'R'
  if (x === 'M' || y === 'M') return 'M'
  if (y !== ' ' && y !== undefined) return y
  if (x !== ' ' && x !== undefined) return x
  return ''
}

export function parsePorcelain(stdout) {
  const map = {}
  const text = String(stdout ?? '')
  for (const raw of text.split(/\r?\n/)) {
    if (raw.length < 4) continue
    const x = raw[0]
    const y = raw[1]
    let file = raw.slice(3)
    const arrow = file.lastIndexOf(' -> ')
    if (arrow >= 0) file = file.slice(arrow + 4)
    const posix = file.replaceAll('\\', '/').replace(/\/$/, '')
    if (posix === '') continue
    const letter = letterFromPorcelain(x, y)
    if (letter === '') continue
    map[posix] = letter
  }
  return map
}

export async function gitStatusLetters(rootReal) {
  try {
    const { stdout } = await execFileAsync(gitBin(), [
      '-c', 'core.quotepath=false',
      'status', '--porcelain', '-uall',
    ], {
      cwd: rootReal,
      windowsHide: true,
      timeout: 4000,
      maxBuffer: 2 * 1024 * 1024,
    })
    return parsePorcelain(stdout)
  } catch {
    return {}
  }
}
