import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import iconv from 'iconv-lite'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pickShell } from '../src/host/shell-profiles.js'
import { isLoopbackHost } from '../src/host/http.js'
import { openShell } from '../src/host/pty-session.js'
import { createDecoder, encodeInput, toWindowsNewlines } from '../src/host/shell-codec.js'

describe('终端壳', () => {
  it('当前系统能挑出一个可执行文件', () => {
    const spec = pickShell()
    assert.equal(typeof spec.file, 'string')
    assert.notEqual(spec.file, '')
    assert.ok(Array.isArray(spec.args))
  })

  it('能指定命令提示符', { skip: process.platform !== 'win32' }, () => {
    const spec = pickShell({ shell: 'cmd' })
    assert.equal(spec.id, 'cmd')
    assert.match(spec.file, /cmd/i)
  })

  it('自定义路径找不到时退回自动挑选', () => {
    const auto = pickShell({ shell: 'auto' })
    const spec = pickShell({ shell: 'custom', customPath: 'Z:\\this-shell-does-not-exist.exe' })
    assert.equal(spec.file, auto.file)
  })

  it('指向 Cmder 启动器时改走 init.bat', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-cmder-'))
    mkdirSync(join(root, 'vendor'))
    const init = join(root, 'vendor', 'init.bat')
    writeFileSync(init, '@echo off\r\n')
    writeFileSync(join(root, 'Cmder.exe'), '')
    const spec = pickShell({ shell: 'custom', customPath: join(root, 'Cmder.exe') })
    assert.equal(spec.id, 'cmder')
    assert.match(spec.file, /cmd/i)
    assert.deepEqual(spec.args, ['/k', init])
    assert.equal(spec.env.CMDER_ROOT, root)
  })

  it('能拉起本机壳并立刻关掉', async () => {
    const session = await openShell({ cwd: process.cwd(), cols: 40, rows: 12 })
    assert.equal(typeof session.write, 'function')
    session.kill()
  })

  it('优先走真控制台', async () => {
    const session = await openShell({ cwd: process.cwd(), cols: 40, rows: 12 })
    try {
      assert.equal(session.backend, 'conpty')
    } finally {
      session.kill()
    }
  })

  it('回车会补成 Windows 换行', () => {
    assert.equal(toWindowsNewlines('dir\r'), 'dir\r\n')
    assert.equal(toWindowsNewlines('dir\r\n'), 'dir\r\n')
    assert.equal(toWindowsNewlines('a\nb'), 'a\r\nb')
  })

  it('能把系统默认中文编码解开', () => {
    const decode = createDecoder('gb18030')
    const bytes = iconv.encode('找不到这个命令', 'gb18030')
    assert.equal(decode(bytes.subarray(0, 3)) + decode(bytes.subarray(3)), '找不到这个命令')
  })

  it('往壳里写时按编码打包', () => {
    const packed = encodeInput('dir\r', 'gb18030', 'win32')
    assert.equal(Buffer.isBuffer(packed), true)
    assert.equal(iconv.decode(packed, 'gb18030'), 'dir\r\n')
  })
})

describe('本机请求', () => {
  it('认 127.0.0.1 和 localhost', () => {
    assert.equal(isLoopbackHost({ headers: { host: '127.0.0.1:8080' } }), true)
    assert.equal(isLoopbackHost({ headers: { host: 'localhost:8080' } }), true)
    assert.equal(isLoopbackHost({ headers: { host: 'example.com' } }), false)
  })
})
