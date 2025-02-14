const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;
    if (electronPlatformName !== "darwin") {
        return;
    }

    const appName = context.packager.appInfo.productFilename;

    return await notarize({
        tool: "notarytool",
        appBundleId: "io.yaklang.yakit",
        appPath: `${appOutDir}/${appName}.app`,
        appleId: process.env.APPLE_DEVELOPER_ID,
        appleTeamId: process.env.APPLE_TEAM_ID,
        password: process.env.APPLE_APP_PASSWORD,
    });
};
