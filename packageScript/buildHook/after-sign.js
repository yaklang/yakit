const {notarize} = require("@electron/notarize")

module.exports = async function afterSign(context) {
    const {appOutDir, packager, electronPlatformName} = context
    if (electronPlatformName !== "darwin") {
        return
    }
    const appName = packager.appInfo.productFilename
    const appBundleId = packager.appInfo.id

    console.log(`Start ${appName} 进行公证，输出目录：${appOutDir}`, `app 所处路径: ${appOutDir}/${appName}.app`)

    return await notarize({
        appBundleId: appBundleId,
        appPath: `${appOutDir}/${appName}.app`,
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_PASSWORD,
        teamId: process.env.TEAM_ID // 可选，根据需要配置
    })
}
