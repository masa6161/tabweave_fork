import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('upstream Chinese resources match the imported revision and remain unedited', async () => {
  const root = new URL('../', import.meta.url)
  const lock = JSON.parse(await readFile(new URL('src/lib/upstream-chinese.json', root), 'utf8'))
  assert.equal(lock.source, 'https://github.com/zxpzdtom/tabweave')
  assert.match(lock.revision, /^[a-f0-9]{40}$/)
  for (const [path, expected] of Object.entries(lock.hashes)) {
    const actual = createHash('sha256').update(await readFile(new URL(path, root))).digest('hex')
    assert.equal(actual, expected, `${path}: import Chinese changes from upstream; do not edit copy in the fork`)
  }
})
