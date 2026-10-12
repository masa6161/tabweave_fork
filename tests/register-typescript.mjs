import { registerHooks } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Run the actual extension modules with Node's test runner without adding a
// second bundler or changing the extension's browser-oriented import paths.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL)
      if (!url.pathname.endsWith('.ts')) url.pathname += '.ts'
      if (existsSync(url)) return nextResolve(url.href, context)
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (new URL(url).pathname.endsWith('.ts')) {
      const source = readFileSync(new URL(url), 'utf8')
      return {
        format: 'module',
        shortCircuit: true,
        source: ts.transpileModule(source, {
          fileName: fileURLToPath(url),
          compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
        }).outputText,
      }
    }
    return nextLoad(url, context)
  },
})
