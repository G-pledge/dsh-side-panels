import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { createFsService } from '../src/host/fs-service.js'
import { createGitService } from '../src/host/git-service.js'
import { runGit } from '../src/host/git-status.js'
import { patchFromHunk } from '../src/host/git-extra.js'

async function makeRepo() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-git-'))
  await runGit(root, ['init'])
  await runGit(root, ['config', 'user.email', 'git-panel@example.com'])
  await runGit(root, ['config', 'user.name', 'Git Panel'])
  await writeFile(join(root, 'README.md'), 'hello\n')
  await runGit(root, ['add', '--', 'README.md'])
  await runGit(root, ['commit', '-F', '-'], { input: 'init' })
  return root
}

describe('git 源代码管理', () => {
  it('能看状态、暂存、提交、丢弃', async () => {
    const root = await makeRepo()
    const fs = createFsService(() => [root])
    const git = createGitService((cwd) => fs.gateRoot(cwd))

    const clean = await git.snapshot(root)
    assert.equal(clean.ok, true)
    assert.equal(clean.value.repo, true)
    assert.equal(clean.value.changes.length, 0)

    await writeFile(join(root, 'notes.txt'), 'n\n')
    const untracked = await git.snapshot(root)
    assert.equal(untracked.value.changes.some((item) => item.path === 'notes.txt' && item.untracked), true)

    const staged = await git.stage(root, ['notes.txt'])
    assert.equal(staged.ok, true)
    const afterStage = await git.snapshot(root)
    assert.equal(afterStage.value.staged.some((item) => item.path === 'notes.txt'), true)
    assert.equal(afterStage.value.changes.some((item) => item.path === 'notes.txt'), false)

    const committed = await git.commit(root, 'add notes')
    assert.equal(committed.ok, true)
    assert.equal(typeof committed.value.hash, 'string')

    await writeFile(join(root, 'README.md'), 'hello world\n')
    const dirty = await git.snapshot(root)
    assert.equal(dirty.value.changes.some((item) => item.path === 'README.md' && item.letter === 'M'), true)

    const diff = await git.diff(root, 'README.md', 'worktree', false)
    assert.equal(diff.ok, true)
    assert.match(diff.value.after, /hello world/)
    assert.match(diff.value.before, /hello/)
    assert.equal(diff.value.rightTitle, '工作区')
    assert.ok(diff.value.before.length > 0)
    assert.ok(diff.value.after.length > 0)

    const dumped = await git.discard(root, ['README.md'])
    assert.equal(dumped.ok, true)
    const restored = await git.snapshot(root)
    assert.equal(restored.value.changes.length, 0)

    const nested = join(root, 'src', 'client')
    await mkdir(nested, { recursive: true })
    await writeFile(join(nested, 'MoreMenu.jsx'), 'export const a = 1\n')
    await runGit(root, ['add', '--', 'src/client/MoreMenu.jsx'])
    await runGit(root, ['commit', '-F', '-'], { input: 'add menu' })
    await writeFile(join(nested, 'MoreMenu.jsx'), 'export const a = 2\n')
    const nestedDiff = await git.diff(root, 'src/client/MoreMenu.jsx', 'worktree', false)
    assert.equal(nestedDiff.ok, true)
    assert.match(nestedDiff.value.before, /a = 1/)
    assert.match(nestedDiff.value.after, /a = 2/)
  })

  it('能列出分支并签出、新建', async () => {
    const root = await makeRepo()
    const fs = createFsService(() => [root])
    const git = createGitService((cwd) => fs.gateRoot(cwd))
    const start = await git.snapshot(root)
    const current = start.value.branch
    assert.ok(current)

    await runGit(root, ['branch', 'other'])
    const listed = await git.refs(root)
    assert.equal(listed.ok, true)
    assert.equal(listed.value.refs.some((item) => item.name === 'other' && item.kind === 'local'), true)
    assert.equal(listed.value.refs.some((item) => item.name === current && item.current), true)

    const moved = await git.checkout(root, { ref: 'other', kind: 'local' })
    assert.equal(moved.ok, true)
    assert.equal((await git.snapshot(root)).value.branch, 'other')

    const made = await git.checkout(root, { create: true, name: 'topic' })
    assert.equal(made.ok, true)
    assert.equal((await git.snapshot(root)).value.branch, 'topic')

    const fromOther = await git.checkout(root, { create: true, name: 'from-other', from: 'other' })
    assert.equal(fromOther.ok, true)
    assert.equal((await git.snapshot(root)).value.branch, 'from-other')

    const detached = await git.checkout(root, { ref: 'other', detached: true })
    assert.equal(detached.ok, true)
    assert.equal((await git.snapshot(root)).value.detached, true)

    await runGit(root, ['update-ref', `refs/remotes/origin/${current}`, 'HEAD'])
    const withRemote = await git.refs(root)
    assert.equal(withRemote.value.refs.some((item) => item.kind === 'remote' && item.name === `origin/${current}`), true)

    const bad = await git.checkout(root, { ref: '--output' })
    assert.equal(bad.ok, false)
  })

  it('父目录下多个子仓库能分开看、分开改', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'dsh-git-multi-'))
    async function initChild(name) {
      const dir = join(parent, name)
      await mkdir(dir, { recursive: true })
      await runGit(dir, ['init'])
      await runGit(dir, ['config', 'user.email', 'git-panel@example.com'])
      await runGit(dir, ['config', 'user.name', 'Git Panel'])
      await writeFile(join(dir, 'README.md'), `${name}\n`)
      await runGit(dir, ['add', '--', 'README.md'])
      await runGit(dir, ['commit', '-F', '-'], { input: 'init' })
      return dir
    }
    const a = await initChild('app-a')
    await initChild('app-b')
    const fs = createFsService(() => [parent])
    const git = createGitService((cwd) => fs.gateRoot(cwd))

    const listed = await git.snapshot(parent)
    assert.equal(listed.ok, true)
    assert.equal(listed.value.repo, true)
    assert.equal(listed.value.repos.length, 2)
    assert.equal(listed.value.repos.some((item) => item.rel === 'app-a'), true)
    assert.equal(listed.value.repos.some((item) => item.rel === 'app-b'), true)

    await writeFile(join(a, 'README.md'), 'app-a changed\n')
    const dirty = await git.snapshot(parent)
    const repoA = dirty.value.repos.find((item) => item.rel === 'app-a')
    const repoB = dirty.value.repos.find((item) => item.rel === 'app-b')
    assert.equal(repoA.changes.some((item) => item.path === 'app-a/README.md' && item.letter === 'M'), true)
    assert.equal(repoB.changes.length, 0)
    assert.equal(dirty.value.git['app-a/README.md'], 'M')

    const letters = await fs.status(parent)
    assert.equal(letters.ok, true)
    assert.equal(letters.value.git['app-a/README.md'], 'M')

    const staged = await git.stage(parent, ['app-a/README.md'], 'app-a')
    assert.equal(staged.ok, true)
    const afterStage = await git.snapshot(parent)
    assert.equal(afterStage.value.repos.find((item) => item.rel === 'app-a').staged.some((item) => item.path === 'app-a/README.md'), true)
    assert.equal(afterStage.value.repos.find((item) => item.rel === 'app-b').staged.length, 0)

    const committed = await git.commit(parent, 'touch a', false, 'app-a')
    assert.equal(committed.ok, true)

    const diff = await git.diff(parent, 'app-a/README.md', 'worktree', false, 'app-a')
    assert.equal(diff.ok, true)

    const checkout = await git.checkout(parent, { create: true, name: 'topic-a', repo: 'app-a' })
    assert.equal(checkout.ok, true)
    assert.equal((await git.snapshot(parent)).value.repos.find((item) => item.rel === 'app-a').branch, 'topic-a')
    assert.notEqual((await git.snapshot(parent)).value.repos.find((item) => item.rel === 'app-b').branch, 'topic-a')

    const missing = await git.commit(parent, 'nope', false, '')
    assert.equal(missing.ok, false)
    assert.equal(missing.error.code, 'bad-repo')
  })

  it('越界路径拒绝，不是仓库就明说', async () => {
    const root = await makeRepo()
    const fs = createFsService(() => [root])
    const git = createGitService((cwd) => fs.gateRoot(cwd))

    const escaped = await git.stage(root, ['../secret.txt'])
    assert.equal(escaped.ok, false)
    assert.equal(escaped.error.code, 'forbidden')

    const empty = await git.commit(root, 'nope')
    assert.equal(empty.ok, false)
    assert.equal(empty.error.code, 'nothing-staged')

    const loose = await mkdtemp(join(tmpdir(), 'dsh-nongit-'))
    const other = createGitService(async () => ({ ok: true, value: loose }))
    const snap = await other.snapshot(loose)
    assert.equal(snap.ok, true)
    assert.equal(snap.value.repo, false)
  })

  it('能读提交图、打开历史文件、拣选', async () => {
    const root = await makeRepo()
    const fs = createFsService(() => [root])
    const git = createGitService((cwd) => fs.gateRoot(cwd))
    const start = await git.snapshot(root)
    const main = start.value.branch

    await runGit(root, ['checkout', '-b', 'topic'])
    await writeFile(join(root, 'README.md'), 'topic line\n')
    await runGit(root, ['add', '--', 'README.md'])
    await runGit(root, ['commit', '-F', '-'], { input: 'on topic' })

    await runGit(root, ['checkout', main])
    await writeFile(join(root, 'main.txt'), 'main\n')
    await runGit(root, ['add', '--', 'main.txt'])
    await runGit(root, ['commit', '-F', '-'], { input: 'on main' })
    await runGit(root, ['merge', '--no-ff', '-m', 'merge topic', 'topic'])

    const graph = await git.graph(root, '', { all: true })
    assert.equal(graph.ok, true)
    assert.ok(graph.value.commits.length >= 3)
    const head = graph.value.commits[0]
    assert.equal(head.head, true)
    assert.equal(head.parents.length, 2)
    assert.ok(head.cols >= 2)
    assert.equal(head.subject, 'merge topic')
    assert.equal(head.refs.some((item) => item.current && item.name === main), true)

    const listed = await git.commitFiles(root, '', head.hash)
    assert.equal(listed.ok, true)
    assert.ok(listed.value.files.some((item) => item.path === 'README.md'))

    const topicCommit = graph.value.commits.find((item) => item.subject === 'on topic')
    assert.ok(topicCommit)
    const diff = await git.commitDiff(root, '', topicCommit.hash, 'README.md')
    assert.equal(diff.ok, true)
    assert.match(diff.value.after, /topic line/)
    assert.equal(diff.value.rightTitle, topicCommit.hash.slice(0, 7))

    await runGit(root, ['checkout', '-b', 'pick'])
    await writeFile(join(root, 'extra.txt'), 'e\n')
    await runGit(root, ['add', '--', 'extra.txt'])
    await runGit(root, ['commit', '-F', '-'], { input: 'extra' })
    const extra = (await git.graph(root)).value.commits.find((item) => item.subject === 'extra')
    await runGit(root, ['checkout', main])
    const picked = await git.cherryPick(root, '', extra.hash)
    assert.equal(picked.ok, true)
    const afterPick = await git.snapshot(root)
    assert.equal(afterPick.value.branch, main)

    const tagged = await git.tag(root, '', 'v-graph', head.hash)
    assert.equal(tagged.ok, true)

    const bad = await git.commitFiles(root, '', 'nope')
    assert.equal(bad.ok, false)
  })

  it('能储藏、按块暂存、修改上次提交、忽略、初始化、看两层子仓库', async () => {
    const root = await makeRepo()
    const fs = createFsService(() => [root])
    const git = createGitService((cwd) => fs.gateRoot(cwd))

    await writeFile(join(root, 'README.md'), 'hello stash\n')
    const stashed = await git.stash(root, '', { op: 'push' })
    assert.equal(stashed.ok, true)
    assert.equal((await git.snapshot(root)).value.changes.length, 0)
    assert.ok((await git.snapshot(root)).value.stashes.length >= 1)
    const applied = await git.stash(root, '', { op: 'apply', ref: 'stash@{0}' })
    assert.equal(applied.ok, true)
    assert.equal((await git.snapshot(root)).value.changes.some((item) => item.path === 'README.md'), true)

    const diff = await git.diff(root, 'README.md', 'worktree', false)
    assert.equal(diff.ok, true)
    assert.ok(diff.value.hunks.length >= 1)
    const hunked = await git.hunk(root, '', 'README.md', 'stage', patchFromHunk(diff.value.hunks[0]))
    assert.equal(hunked.ok, true)
    const afterHunk = await git.snapshot(root)
    assert.equal(afterHunk.value.staged.some((item) => item.path === 'README.md'), true)

    const committed = await git.commit(root, 'stash apply')
    assert.equal(committed.ok, true)
    await writeFile(join(root, 'README.md'), 'hello amend\n')
    await git.stage(root, ['README.md'])
    const amended = await git.commit(root, 'stash apply v2', false, '', { amend: true })
    assert.equal(amended.ok, true)
    const subject = (await runGit(root, ['log', '-1', '--pretty=%s'])).stdout.trim()
    assert.equal(subject, 'stash apply v2')

    const ignored = await git.ignore(root, '', 'secret.bin')
    assert.equal(ignored.ok, true)
    assert.match(await readFile(join(root, '.gitignore'), 'utf8'), /secret.bin/)

    const blamed = await git.blame(root, '', 'README.md')
    assert.equal(blamed.ok, true)
    assert.ok(blamed.value.lines.length > 0)
    assert.match(blamed.value.lines[0].hash, /^[0-9a-f]{40}$/)

    const history = await git.fileLog(root, '', 'README.md')
    assert.equal(history.ok, true)
    assert.ok(history.value.commits.length >= 1)

    await runGit(root, ['branch', 'to-drop'])
    const renamed = await git.branchOp(root, '', { op: 'rename', newName: 'renamed-main' })
    assert.equal(renamed.ok, true)
    const dropped = await git.branchOp(root, '', { op: 'delete', name: 'to-drop' })
    assert.equal(dropped.ok, true)

    const graph = await git.graph(root)
    assert.equal(graph.ok, true)
    if (graph.value.commits.length >= 2) {
      const a = graph.value.commits[1]
      const b = graph.value.commits[0]
      const compared = await git.compare(root, '', a.hash, b.hash)
      assert.equal(compared.ok, true)
    }

    const badClone = await git.clone(root, 'file:///tmp/nope', 'nope')
    assert.equal(badClone.ok, false)

    const loose = await mkdtemp(join(tmpdir(), 'dsh-git-init-'))
    const other = createGitService(async () => ({ ok: true, value: loose }))
    const inited = await other.init(loose)
    assert.equal(inited.ok, true)
    assert.equal((await other.snapshot(loose)).value.repo, true)

    const parent = await mkdtemp(join(tmpdir(), 'dsh-git-deep-'))
    const nested = join(parent, 'group', 'app-c')
    await mkdir(nested, { recursive: true })
    await runGit(nested, ['init'])
    await runGit(nested, ['config', 'user.email', 'git-panel@example.com'])
    await runGit(nested, ['config', 'user.name', 'Git Panel'])
    await writeFile(join(nested, 'README.md'), 'deep\n')
    await runGit(nested, ['add', '--', 'README.md'])
    await runGit(nested, ['commit', '-F', '-'], { input: 'deep' })
    const deepGit = createGitService((cwd) => createFsService(() => [parent]).gateRoot(cwd))
    const deep = await deepGit.snapshot(parent)
    assert.equal(deep.ok, true)
    assert.equal(deep.value.repos.some((item) => item.rel === 'group/app-c'), true)
  })
})
