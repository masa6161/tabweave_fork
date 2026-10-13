import manifest from '../../public/manifest.json' with { type: 'json' }

export const GITHUB_REPO_URL = 'https://github.com/masa6161/tabweave_fork'
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues/new`
export const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/tabweave/pmfoefbiapldlpljfpjienjahdfmefej'

export function getExtensionVersion() {
  const metadata = typeof chrome !== 'undefined' && chrome.runtime?.getManifest
    ? chrome.runtime.getManifest()
    : manifest
  return metadata.version_name || metadata.version
}

export async function openExternalUrl(url: string) {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    await chrome.tabs.create({ url })
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
