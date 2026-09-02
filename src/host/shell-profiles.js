import { existsSync, statSync } from 'node:fs'
import { basename, delimiter, dirname, isAbsolute, join, normalize } from 'node:path'

function which(name) {
  const ext = process.platform === 'win32' && !/\.[a-z0-9]+$/i.test(name) ? ['.exe', '.cmd', '.bat', ''] : ['']
  const dirs = String(process.env.PATH ?? '').split(delimiter)
  for (const dir of dirs) {
    for (const suffix of ext) {
      const full = join(dir, name + suffix)
      if (existsSync(full)) return full
    }
  }
  return undefined
}

function isDir(path) {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function cmdFile() {
  return process.env.ComSpec
    || which('cmd')
    || join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')
}

function cmdSpec() {
  return { id: 'cmd', label: '命令提示符', file: cmdFile(), args: [], encoding: 'gb18030' }
}

function powershellSpec() {
  const pwsh = which('pwsh')
  if (pwsh) return { id: 'pwsh', label: 'PowerShell', file: pwsh, args: ['-NoLogo', '-NoExit'], encoding: 'utf8' }
  const systemRoot = process.env.SystemRoot || 'C:\\Windows'
  const windowsPs = join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  if (existsSync(windowsPs)) {
    return {
      id: 'powershell',
      label: 'Windows PowerShell',
      file: windowsPs,
      args: ['-NoLogo', '-NoExit'],
      encoding: 'gb18030',
    }
  }
  return undefined
}

function autoUnix() {
  const bash = which('bash')
  if (bash) return { id: 'bash', label: 'bash', file: bash, args: ['-l'], encoding: 'utf8' }
  const zsh = which('zsh')
  if (zsh) return { id: 'zsh', label: 'zsh', file: zsh, args: ['-l'], encoding: 'utf8' }
  const shell = process.env.SHELL || '/bin/sh'
  return { id: 'shell', label: shell, file: shell, args: ['-l'], encoding: 'utf8' }
}

function autoWindows() {
  return powershellSpec() || cmdSpec()
}

function findCmderInit(start) {
  const seeds = isDir(start) ? [start] : [dirname(start)]
  const seen = new Set()
  for (const seed of seeds) {
    for (const dir of [seed, join(seed, '..'), join(seed, '..', '..')]) {
      const root = normalize(dir)
      if (seen.has(root)) continue
      seen.add(root)
      const init = join(root, 'vendor', 'init.bat')
      if (existsSync(init)) return { root, init }
    }
  }
  return undefined
}

const CMDER_LAUNCHERS = new Set([
  'cmder.exe', 'cmder.bat', 'cmder',
  'conemu.exe', 'conemu64.exe', 'conemuc.exe', 'conemuc64.exe',
])

function stripQuotes(value) {
  return String(value ?? '').trim().replace(/^["']|["']$/g, '')
}

function locatePath(raw) {
  const path = stripQuotes(raw)
  if (!path) return ''
  if (existsSync(path)) return path
  if (!isAbsolute(path)) {
    const found = which(path) || which(path.replace(/\.(exe|cmd|bat)$/i, ''))
    if (found) return found
  }
  return path
}

function cmderSpec(found, label = 'Cmder') {
  return {
    id: 'cmder',
    label,
    file: cmdFile(),
    args: ['/k', found.init],
    encoding: 'utf8',
    env: { CMDER_ROOT: found.root },
  }
}

function resolveCustom(raw) {
  const path = locatePath(raw)
  if (!path) return undefined
  const name = basename(path).toLowerCase()
  const cmder = findCmderInit(path)
  if (cmder && (isDir(path) || CMDER_LAUNCHERS.has(name))) return cmderSpec(cmder)
  if (name === 'init.bat' || name.endsWith('.bat') || name.endsWith('.cmd')) {
    if (cmder) return cmderSpec(cmder)
    if (!existsSync(path)) return undefined
    return {
      id: 'custom',
      label: basename(path),
      file: cmdFile(),
      args: ['/k', path],
      encoding: 'gb18030',
    }
  }
  if (name === 'pwsh.exe' || name === 'pwsh') {
    return { id: 'pwsh', label: 'PowerShell', file: path, args: ['-NoLogo', '-NoExit'], encoding: 'utf8' }
  }
  if (name === 'powershell.exe' || name === 'powershell') {
    return { id: 'powershell', label: 'Windows PowerShell', file: path, args: ['-NoLogo', '-NoExit'], encoding: 'gb18030' }
  }
  if (name === 'cmd.exe' || name === 'cmd') {
    return { id: 'cmd', label: '命令提示符', file: path, args: [], encoding: 'gb18030' }
  }
  if (name === 'bash.exe' || name === 'bash' || name === 'git-bash.exe') {
    return { id: 'bash', label: 'bash', file: path, args: ['-l'], encoding: 'utf8' }
  }
  if (!existsSync(path) || isDir(path)) return undefined
  return {
    id: 'custom',
    label: basename(path),
    file: path,
    args: [],
    encoding: 'utf8',
  }
}

/** 按设置挑壳；找不到指定程序时退回自动挑选。 */
export function pickShell(prefs = {}) {
  const shell = prefs.shell || 'auto'
  if (process.platform !== 'win32') {
    if (shell === 'custom') return resolveCustom(prefs.customPath) || autoUnix()
    return autoUnix()
  }
  if (shell === 'cmd') return cmdSpec()
  if (shell === 'powershell') return powershellSpec() || cmdSpec()
  if (shell === 'custom') return resolveCustom(prefs.customPath) || autoWindows()
  return autoWindows()
}
