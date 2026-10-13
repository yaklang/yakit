const path = require('path')
const { notarizeWithRetry } = require('../../scripts/mac-notarization')

module.exports = async function afterSign(context) {
  const { appOutDir, packager, electronPlatformName } = context
  if (electronPlatformName !== 'darwin') {
    return
  }
  const appName = packager.appInfo.productFilename
  const appBundleId = packager.appInfo.id
  const appPath = path.resolve(appOutDir, `${appName}.app`)

  console.log(`Start notarizing ${appName}`)
  console.log(`Output Directory ${appOutDir}`)
  console.log(`App Path: ${appPath}`)

  const missing = ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'].filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required notarization env vars: ${missing.join(', ')}`)
  }

  return await notarizeWithRetry({
    appBundleId: appBundleId,
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  })
}
