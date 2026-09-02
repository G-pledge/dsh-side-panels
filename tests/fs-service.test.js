import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { createFsService } from '../src/host/fs-service.js'

describe('文件服务', () => {
  it('只列出根里的内容，跳过版本库目录，并拒绝越界', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-side-panels-'))
    await mkdir(join(root, 'src'))
    await mkdir(join(root, '.git'))
    await writeFile(join(root, 'README.md'), 'hi')
    await writeFile(join(root, '.git', 'config'), 'nope')
    await writeFile(join(root, 'src', 'a.js'), 'ok')

    const fs = createFsService(() => [root])
    const listed = await fs.list(root, '')
    assert.equal(listed.ok, true)
    const names = listed.value.entries.map((entry) => entry.name)
    assert.deepEqual(names, ['src', 'README.md'])

    const nested = await fs.list(root, 'src')
    assert.equal(nested.ok, true)
    assert.equal(nested.value.entries[0].name, 'a.js')

    const escaped = await fs.list(root, '../')
    assert.equal(escaped.ok, false)
    assert.equal(escaped.error.code, 'forbidden')

    const git = await fs.read(root, '.git/config')
    assert.equal(git.ok, false)

    const created = await fs.create(root, '', 'notes.txt', false)
    assert.equal(created.ok, true)
    const after = await fs.list(root, '')
    assert.equal(after.value.entries.some((entry) => entry.name === 'notes.txt'), true)

    const folder = await fs.create(root, 'src', 'tmp', true)
    assert.equal(folder.ok, true)

    const renamed = await fs.rename(root, 'notes.txt', 'memo.txt')
    assert.equal(renamed.ok, true)
    assert.equal(renamed.value.path, 'memo.txt')
    const afterRename = await fs.list(root, '')
    assert.equal(afterRename.value.entries.some((entry) => entry.name === 'memo.txt'), true)
    assert.equal(afterRename.value.entries.some((entry) => entry.name === 'notes.txt'), false)

    const clash = await fs.rename(root, 'memo.txt', 'README.md')
    assert.equal(clash.ok, false)
    assert.equal(clash.error.code, 'exists')

    const bad = await fs.rename(root, 'memo.txt', '../x')
    assert.equal(bad.ok, false)
    assert.equal(bad.error.code, 'bad-name')

    const saved = await fs.write(root, 'src/a.js', 'export default 1\n')
    assert.equal(saved.ok, true)
    const reread = await fs.read(root, 'src/a.js')
    assert.equal(reread.value.text, 'export default 1\n')

    const escapedWrite = await fs.write(root, '../x.js', 'nope')
    assert.equal(escapedWrite.ok, false)

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
    await writeFile(join(root, 'dot.png'), png)
    const picture = await fs.read(root, 'dot.png')
    assert.equal(picture.ok, true)
    assert.equal(picture.value.image, true)
    assert.equal(picture.value.mime, 'image/png')
    assert.equal(typeof picture.value.data, 'string')
    assert.ok(picture.value.data.length > 0)

    const raw = await fs.bytes(root, 'dot.png')
    assert.equal(raw.ok, true)
    assert.equal(raw.value.mime, 'image/png')
    assert.ok(raw.value.bytes.length > 0)
  })

  it('工作目录不在已登记工作区时拒绝', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-side-panels-out-'))
    const other = await mkdtemp(join(tmpdir(), 'dsh-side-panels-ws-'))
    const fs = createFsService(() => [other])
    const listed = await fs.list(root, '')
    assert.equal(listed.ok, false)
    assert.equal(listed.error.code, 'forbidden')
  })
})
