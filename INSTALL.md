# Install the TabWeave fork

The ZIP contains a built extension. Node.js and a source build are not required.

1. Extract `tabweave-fork-0.8.1-fork.1.zip`. Keep its folder in a permanent location.
2. Open `chrome://extensions` in the Chrome profile you normally use and enable **Developer mode**.
3. Click **Load unpacked** and choose the extracted `tabweave-fork-0.8.1-fork.1` folder, containing `manifest.json` at its root.

Check that Options and Popup display `0.8.1-fork.1`. The default Side Panel uses the same version. Pin the extension icon for easy access.

The fork replaces the New Tab page and has permissions for tabs, groups, and browser history. Automatic grouping and AI grouping start disabled. Enable creation or page-update automation in Options when needed; per-window switches also apply.

If you enable and run cloud AI grouping, it sends tab titles, full URLs, group names, and accessible page context to the selected provider. See the [privacy policy](./PRIVACY.md).

On macOS, use this unpacked installation method in a regular profile. This package does not provide a one-click installation of an off-store CRX. See [Chrome's loading instructions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) and [distribution restrictions](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions).

## Updates

Extract the next ZIP and copy its contents over the files in the originally loaded folder, then click TabWeave's reload button in Extensions. Keep that folder's location unchanged to retain the extension identity. Export settings before updating if you want a backup.

Reloading clears per-window pause settings; general settings and saved rules remain. A separate test profile has its own settings. Respond to Chrome's local-extension notices as needed.

## Package records

`RELEASE.json` records the tag and commit. `CHECKSUMS.sha256` contains individual file hashes. A separate `.sha256` file records the ZIP archive's hash.
