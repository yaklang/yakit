const DEVICE_SCALE_FACTOR_OPTION = '--device-scale-factor'
const THEME_OPTION = '--theme'
const HOVER_MODE_OPTION = '--hover-mode'

const parseDeviceScaleFactor = (value) => {
  const deviceScaleFactor = Number(value)
  if (!Number.isFinite(deviceScaleFactor) || deviceScaleFactor <= 0) {
    throw new Error(`Invalid device scale factor: ${value}`)
  }
  return deviceScaleFactor
}

export const parseElectronE2EOptions = (argv) => {
  const wdioArgs = []
  let withYakEngine = false
  let deviceScaleFactor = null
  let softwareRendering = false
  let theme = 'light'
  let hoverMode = 'none'

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--with-yak-engine') {
      withYakEngine = true
      continue
    }
    if (argument === '--software-rendering') {
      softwareRendering = true
      continue
    }
    if (argument === THEME_OPTION || argument === HOVER_MODE_OPTION) {
      const value = argv[index + 1]
      if (value === undefined) throw new Error(`${argument.slice(2)} requires a value`)
      if (argument === THEME_OPTION && !['light', 'dark'].includes(value)) throw new Error(`Invalid theme: ${value}`)
      if (argument === HOVER_MODE_OPTION && !['none', 'forced'].includes(value))
        throw new Error(`Invalid hover mode: ${value}`)
      if (argument === THEME_OPTION) theme = value
      else hoverMode = value
      index += 1
      continue
    }
    if (argument === DEVICE_SCALE_FACTOR_OPTION) {
      const value = argv[index + 1]
      if (value === undefined) throw new Error('Device scale factor requires a value')
      deviceScaleFactor = parseDeviceScaleFactor(value)
      index += 1
      continue
    }
    if (argument.startsWith(`${DEVICE_SCALE_FACTOR_OPTION}=`)) {
      deviceScaleFactor = parseDeviceScaleFactor(argument.slice(DEVICE_SCALE_FACTOR_OPTION.length + 1))
      continue
    }
    wdioArgs.push(argument)
  }

  return {
    wdioArgs,
    withYakEngine,
    deviceScaleFactor,
    softwareRendering,
    theme,
    hoverMode,
    electronAppArgs: [
      ...(deviceScaleFactor === null ? [] : [`--force-device-scale-factor=${deviceScaleFactor}`]),
      ...(softwareRendering ? ['--disable-gpu'] : []),
    ],
  }
}
