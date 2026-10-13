import { getMessages, resolveLanguage } from './i18n'
import type { LanguageMode } from './types'

// Translate TabWeave's own errors at display time. Provider details and model
// names remain untouched, and the background worker keeps its original errors.
export function localizeErrorMessage(message: string, mode: LanguageMode): string {
  if (resolveLanguage(mode) !== 'ja') return message
  const t = getMessages(mode)
  const known: Record<string, string> = {
    'Current window is unavailable': t.errorCurrentWindow,
    'Invalid window automation setting': t.errorWindowAutomation,
    'Missing command item': t.errorCommandItem,
    'Snapshot not found': t.errorSnapshotMissing,
    'Failed to create window': t.errorCreateWindow,
    'Invalid snapshot': t.errorSnapshotInvalid,
    'AI returned an empty or non-JSON response': t.aiErrorInvalidResponse,
    'AI returned an empty response': t.aiErrorEmptyResponse,
    'AI returned an empty message': t.aiErrorEmptyMessage,
    'Missing AI API key': t.aiErrorMissingKey,
    'Missing AI model': t.aiErrorMissingModel,
    'Missing AI provider base URL': t.aiErrorMissingBaseUrl,
    'AI grouping is disabled': t.aiErrorDisabled,
    'AI grouping failed': t.aiErrorFailed,
    'Chrome built-in AI is not available in this browser.': t.aiChromeBuiltInUnavailable,
    'Chrome built-in AI is not available on this device.': t.aiChromeBuiltInUnavailable,
    'Chrome built-in AI is not available in this browser. Use Chrome 138+ on a supported desktop device.': t.aiErrorBuiltInUnsupported,
    'Chrome built-in AI is not available on this device. Use Chrome 138+ on a supported desktop device, then try again.': t.aiErrorBuiltInUnsupported,
    'Chrome built-in AI model is not ready yet. Keep the Popup or Side Panel open while Chrome downloads the local model, then try again.': t.aiErrorBuiltInNotReady,
    'Chrome built-in AI did not finish in time. If this is the first run, the local model may still be downloading.': t.aiErrorBuiltInTimeout,
    'Chrome needs a direct user action before starting built-in AI. Run AI organize again from the Popup or Side Panel.': t.aiErrorBuiltInAction,
    'Chrome built-in AI model download did not finish in time.': t.aiErrorBuiltInDownload,
  }

  function translate(value: string, depth = 0): string {
    if (depth > 4) return value
    if (known[value]) return known[value]
    const timeout = value.match(/^AI request timed out after (\d+)s$/)
    if (timeout) return t.aiErrorTimeout.replace('{seconds}', timeout[1])
    const request = value.match(/^AI request failed \(([^)]+)\): ([\s\S]*)$/)
    if (request) {
      const retry = request[2].match(/ Retry after about (\d+)s\.$/)
      const detail = retry ? request[2].slice(0, -retry[0].length) : request[2]
      const translated = t.aiErrorRequest.replace(/\{(code|detail)\}/g, (_, field: string) => field === 'code' ? request[1] : detail)
      return retry ? `${translated} ${t.aiErrorRetry.replace('{seconds}', retry[1])}` : translated
    }
    const models = value.match(/^AI grouping failed across (\d+) models: ([\s\S]*)$/)
    if (models) {
      const detail = models[2].split(' | ').map(part => translate(part, depth + 1)).join(' | ')
      return t.aiErrorModels.replace('{count}', models[1]).replace('{detail}', () => detail)
    }
    const model = value.match(/^([^\n]+?): ([\s\S]*)$/)
    if (model) {
      const detail = translate(model[2], depth + 1)
      if (detail !== model[2]) return `${model[1]}: ${detail}`
    }
    return value
  }

  return translate(message)
}
