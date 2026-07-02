const { notarize } = require('@electron/notarize')

module.exports = async function afterSign(context) {
  const { appOutDir, packager, electronPlatformName } = context
  if (electronPlatformName !== 'darwin') {
    return
  }
  const appName = packager.appInfo.productFilename
  const appBundleId = packager.appInfo.id

  console.log(`Start notarizing ${appName}`)
  console.log(`Output Directory ${appOutDir}`)
  console.log(`App Path: ${appOutDir}/${appName}.app`)

  const missing = ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'].filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required notarization env vars: ${missing.join(', ')}`)
  }

  return await notarize({
    appBundleId: appBundleId,
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  })
}
