import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const manifest = JSON.parse(await readFile(resolve(root, 'public/manifest.json'), 'utf8'))
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const version = manifest.version_name ?? manifest.version
const changelogPath = manifest.version_name ? 'CHANGELOG.fork.md' : 'CHANGELOG.md'
const changelog = await readFile(resolve(root, changelogPath), 'utf8')

const parts = manifest.version.split('.')
if (parts.length > 4 || parts.some((part) => !/^(0|[1-9]\d*)$/.test(part) || Number(part) > 65535) || parts.every((part) => Number(part) === 0)) {
  throw new Error(`Invalid Chrome extension version: ${manifest.version}.`)
}
if (pkg.version !== version) {
  throw new Error(`package.json version ${pkg.version} does not match the manifest display version ${version}.`)
}
if (manifest.version_name) {
  const fork = version.match(/^(\d+\.\d+\.\d+)-fork\.([1-9]\d*)$/)
  if (!fork || manifest.version !== `${fork[1]}.${fork[2]}`) {
    throw new Error('Fork versions must use display version X.Y.Z-fork.N and Chrome version X.Y.Z.N. See VERSIONING.md.')
  }
}

if (!changelog.includes(`## ${version} -`) && !changelog.includes(`## v${version} -`)) {
  throw new Error(`${changelogPath} is missing an entry for version ${version}.`)
}
