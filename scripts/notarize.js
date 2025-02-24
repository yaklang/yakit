const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
    const { appOutDir, packager, electronPlatformName } = context;
    if (electronPlatformName !== "darwin") {
        return;
    }
    const appName = packager.appInfo.productFilename;
    const appBundleId = packager.appInfo.id;
    console.log(`开始对 ${appName} 进行公证，输出目录：${appOutDir}`, `app 所处路径: ${appOutDir}/${appName}.app`);

    return await notarize({
        tool: "notarytool",
        appBundleId: appBundleId,
        appPath: `${appOutDir}/${appName}.app`,
        appleId: process.env.APPLE_DEVELOPER_ID,
        appleIdPassword: process.env.APPLE_APP_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID, // 可选，根据需要配置
    });
};
