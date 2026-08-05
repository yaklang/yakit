const crypto = require('crypto')
const path = require('path')

const CONTROLLED_FLAGS = ['--user-data-dir', '--profile-directory', '--start-minimized', '--new-window']
const TASKBAR_ICON_PRESET_FILES = Object.freeze({
  'knowledge-crab': 'knowledge-crab.ico',
  'knowledge-tiger': 'knowledge-tiger.ico',
  'knowledge-cat': 'knowledge-cat.ico',
  'knowledge-octopus': 'knowledge-octopus.ico',
  'knowledge-skeleton': 'knowledge-skeleton.ico',
  'knowledge-smiley': 'knowledge-smiley.ico',
})

const getTaskbarIconPresetFileName = (preset) => {
  if (!preset) return null
  const fileName = TASKBAR_ICON_PRESET_FILES[preset]
  if (!fileName) throw new Error(`Unknown taskbar icon preset: ${preset}`)
  return fileName
}

const quoteWindowsArgument = (value) => {
  const raw = `${value}`
  if (raw.length > 0 && !/[\s"]/u.test(raw)) return raw
  return `"${raw.replace(/(\\*)"/gu, '$1$1\\"').replace(/(\\*)$/u, '$1$1')}"`
}

const makeAppUserModelId = (identity) => {
  const digest = crypto.createHash('sha256').update(path.resolve(identity).toLowerCase()).digest('hex').slice(0, 32)
  return `io.yaklang.yakit.chrome.${digest}`
}

const getChromeStartingUrl = (disableCACertPage) => (disableCACertPage === true ? 'chrome://newtab' : 'http://mitm')

const normalizeChromeFlags = (chromeFlags) => {
  if (!Array.isArray(chromeFlags)) return []
  return chromeFlags
    .filter((item) => item && !item.disabled && typeof item.parameterName === 'string')
    .map((item) => {
      const parameterName = item.parameterName.trim()
      if (!parameterName.startsWith('--')) return ''
      if (CONTROLLED_FLAGS.some((flag) => parameterName === flag || parameterName.startsWith(`${flag}=`))) return ''
      return item.variableValues === undefined || item.variableValues === ''
        ? parameterName
        : `${parameterName}=${item.variableValues}`
    })
    .filter(Boolean)
}

module.exports = {
  getChromeStartingUrl,
  getTaskbarIconPresetFileName,
  makeAppUserModelId,
  normalizeChromeFlags,
  quoteWindowsArgument,
}
