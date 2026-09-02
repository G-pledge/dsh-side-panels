import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { createDecoder, encodeInput, encodingOf } from './shell-codec.js'
import { pickShell } from './shell-profiles.js'

const require = createRequire(import.meta.url)

function killTree(child) {
  if (!child?.pid) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
    return
  }
  try {
    child.kill('SIGTERM')
  } catch {
    // 已经退了
  }
}

function stringEnv(extra) {
  const env = {}
  for (const [key, value] of Object.entries({ ...process.env, ...extra })) {
    if (value == null) continue
    env[key] = String(value)
  }
  env.TERM = extra?.TERM || 'xterm-256color'
  env.COLORTERM = extra?.COLORTERM || 'truecolor'
  if (!env.LANG) {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US'
    const [lang, region] = locale.replaceAll('-', '_').split('_')
    env.LANG = `${lang}_${(region || lang).toUpperCase()}.UTF-8`
  }
  return env
}

function loadPty() {
  try {
    return require('node-pty')
  } catch (first) {
    try {
      const fromSubprocess = require.resolve('@deepseek-ai/dsh-subprocess-local/package.json')
      return createRequire(fromSubprocess)('node-pty')
    } catch {
      throw first
    }
  }
}

function wrapPty(proc) {
  return {
    backend: 'conpty',
    write(data) {
      proc.write(data)
    },
    resize(nextCols, nextRows) {
      try {
        proc.resize(Math.max(2, nextCols), Math.max(1, nextRows))
      } catch {
        // 已退出
      }
    },
    kill() {
      try {
        proc.kill()
      } catch {
        // 已退出
      }
    },
    onData(fn) {
      proc.onData((chunk) => fn(typeof chunk === 'string' ? chunk : chunk.toString('utf8')))
    },
    onExit(fn) {
      proc.onExit(({ exitCode }) => fn(exitCode ?? 0))
    },
  }
}

function mergeEnv(spec, env) {
  return stringEnv({ ...env, ...spec?.env })
}

function openPipeShell(spec, { cwd, env }) {
  const child = spawn(spec.file, spec.args, {
    cwd,
    env: mergeEnv(spec, env),
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  })
  const decode = createDecoder(encodingOf(spec))
  const dataListeners = new Set()
  const exitListeners = new Set()
  let closed = false
  let pending = ''

  const emit = (chunk) => {
    const text = typeof chunk === 'string' ? chunk : decode(chunk)
    if (!text) return
    if (dataListeners.size === 0) {
      pending += text
      return
    }
    for (const fn of dataListeners) fn(text)
  }
  child.stdout?.on('data', emit)
  child.stderr?.on('data', emit)
  queueMicrotask(() => {
    if (!closed) emit(`工作目录：${cwd}\r\n`)
  })
  child.on('error', (error) => {
    emit(`\r\n启动失败：${error.message}\r\n`)
    if (!closed) {
      closed = true
      for (const fn of exitListeners) fn(1)
    }
  })
  child.on('exit', (code) => {
    if (closed) return
    closed = true
    for (const fn of exitListeners) fn(code ?? 0)
  })

  return {
    backend: 'pipe',
    write(data) {
      if (closed || !child.stdin || child.stdin.destroyed) return
      child.stdin.write(encodeInput(data, encodingOf(spec)))
    },
    resize() {},
    kill() {
      if (closed) return
      closed = true
      killTree(child)
    },
    onData(fn) {
      dataListeners.add(fn)
      if (pending) {
        const text = pending
        pending = ''
        fn(text)
      }
    },
    onExit(fn) {
      exitListeners.add(fn)
    },
  }
}

function openNodePty(spec, { cwd, cols, rows, env }) {
  const pty = loadPty()
  const spawnPty = pty.spawn
  if (typeof spawnPty !== 'function') throw new Error('no spawn')
  const proc = spawnPty(spec.file, spec.args, {
    name: 'xterm-256color',
    cols: cols || 80,
    rows: rows || 24,
    cwd,
    env: mergeEnv(spec, env),
  })
  return wrapPty(proc)
}

/** 先开 Windows 假控制台（和 Cursor 同一路），不行再退回管道。 */
export async function openShell({ cwd, cols, rows, env, choice }) {
  const spec = pickShell(choice)
  try {
    return openNodePty(spec, { cwd, cols, rows, env })
  } catch {
    return openPipeShell(spec, { cwd, env })
  }
}
