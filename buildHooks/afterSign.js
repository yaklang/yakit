const fs = require("fs");
const path = require("path");
const { notarize } = require("@electron/notarize");

module.exports = async function afterSign(context) {
    // context.appOutDir 指向输出目录，context.packager.appInfo.productFilename 是 app 名称
    // const appName = context.packager.appInfo.productFilename;
    // const appPath = path.join(context.appOutDir, `${appName}.app`);
    // const licensePath = path.join(appPath, "Contents", "LICENSE.md");

    // if (fs.existsSync(licensePath)) {
    //     fs.unlinkSync(licensePath);
    //     console.log("Removed LICENSE.md from app bundle");
    // }

    const { appOutDir, packager, electronPlatformName } = context;
    if (electronPlatformName !== "darwin") {
        return;
    }
    const appName = packager.appInfo.productFilename;
    const appBundleId = packager.appInfo.id;
    console.log(`开始对 ${appName} 进行公证，输出目录：${appOutDir}`, `app 所处路径: ${appOutDir}/${appName}.app`);
    console.log(
        "process.env.APPLE_ID.length",
        process.env.APPLE_ID.length,
        "process.env.APPLE_PASSWORD.length",
        process.env.APPLE_PASSWORD.length,
        "process.env.TEAM_ID.length",
        process.env.TEAM_ID.length
    );
    return await notarize({
        // tool: "notarytool",
        appBundleId: appBundleId,
        appPath: `${appOutDir}/${appName}.app`,
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_PASSWORD,
        teamId: process.env.TEAM_ID, // 可选，根据需要配置
    });
};
