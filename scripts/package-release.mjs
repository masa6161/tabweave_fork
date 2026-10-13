import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const manifest = JSON.parse(await readFile(resolve(root, 'dist/manifest.json'), 'utf8'))
const version = pkg.version
if (!/^\d+\.\d+\.\d+-fork\.[1-9]\d*$/.test(version) || manifest.version_name !== version) {
  throw new Error('Build the matching fork version before packaging.')
}
const tag = `v${version}`
const commit = git('rev-parse', 'HEAD')
if (git('status', '--porcelain') !== '') throw new Error('Commit all release changes before packaging.')
if (git('rev-parse', `${tag}^{commit}`) !== commit) throw new Error(`Tag ${tag} must point to HEAD.`)

const name = `tabweave-fork-${version}`
const releases = resolve(root, 'releases')
const output = resolve(releases, name)
await mkdir(releases, { recursive: true })
await mkdir(output) // Refuse to overwrite an existing installed release.
await cp(resolve(root, 'dist'), output, { recursive: true })
for (const file of ['INSTALL.ja.md', 'INSTALL.md', 'PRIVACY.ja.md', 'PRIVACY.md', 'CHANGELOG.fork.md', 'CHANGELOG.md', 'VERSIONING.md']) {
  await cp(resolve(root, file), resolve(output, file))
}
await cp(resolve(root, 'INSTALL.ja.md'), resolve(output, 'README.ja.md'))
await cp(resolve(root, 'INSTALL.md'), resolve(output, 'README.md'))
await writeFile(resolve(output, 'RELEASE.json'), JSON.stringify({
  version,
  chromeVersion: manifest.version,
  tag,
  commit,
  repository: 'https://github.com/masa6161/tabweave_fork',
}, null, 2) + '\n')

async function filesIn(directory, prefix = '') {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix + entry.name
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink in package: ${path}`)
    if (entry.isDirectory()) files.push(...await filesIn(resolve(directory, entry.name), `${path}/`))
    else if (entry.isFile()) files.push(path)
  }
  return files.sort()
}
const hashes = []
for (const file of await filesIn(output)) {
  const hash = createHash('sha256').update(await readFile(resolve(output, file))).digest('hex')
  hashes.push(`${hash}  ${file}`)
}
await writeFile(resolve(output, 'CHECKSUMS.sha256'), hashes.join('\n') + '\n')
const archive = `${name}.zip`
execFileSync('zip', ['-q', '-r', archive, name], { cwd: releases })
const checksum = createHash('sha256').update(await readFile(resolve(releases, archive))).digest('hex')
await writeFile(resolve(releases, `${archive}.sha256`), `${checksum}  ${archive}\n`)
console.log(`Created releases/${archive}`)
console.log(`Load unpacked folder: ${output}`)
console.log(`Tag: ${tag}; commit: ${commit}; SHA-256: ${checksum}`)
