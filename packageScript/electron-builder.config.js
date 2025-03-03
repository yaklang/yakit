const ConfigOption = {
    appId: "io.yaklang.yakit",
    productName: "Yakit",
    copyright: "Copyright © 2024 yaklang.io",
    extraFiles: [
        {from: "bins/scripts/auto-install-cert.zip", to: "bins/scripts/auto-install-cert.zip"},
        {from: "bins/scripts/start-engine.zip", to: "bins/scripts/start-engine.zip"},
        {from: "bins/scripts/google-chrome-plugin.zip", to: "bins/scripts/google-chrome-plugin.zip"},
        {from: "bins/flag.txt", to: "bins/flag.txt"},
        {from: "bins/engine-version.txt", to: "bins/engine-version.txt"},
        {
            from: "bins/resources",
            to: "bins/resources",
            filter: ["**/*", "*.txt"]
        },
        {
            from: "bins/database/",
            to: "bins/database/",
            filter: ["**/*", "*.txt", "*.gzip", "!*.db"]
        },
        {
            from: "report/template.zip",
            to: "report/template.zip"
        }
    ],
    directories: {
        buildResources: "resources",
        output: "release/",
        app: "."
    },
    files: [
        "**/*",
        "!bins/**/*",
        "!.github/**/*",
        "!multibuilder/**/*",
        "!scripts/**/*",
        "!buildutil/**/*",
        "!buildHooks/**/*",
        "!build/**/*",
        "!backups/**/*",
        "!app/renderer/src/**/*"
    ],
    asar: true,
    publish: [
        {
            provider: "generic",
            url: "https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/"
        }
    ],
    mac: {
        // category: "public.app-category.developer-tools",
        hardenedRuntime: true,
        gatekeeperAssess: false,
        entitlements: "build/entitlements.mac.plist",
        entitlementsInherit: "build/entitlements.mac.plist",
        target: [{target: "dmg", arch: ["x64", "arm64"]}],
        icon: "app/assets/yakitlogo.icns"
    },
    linux: {
        target: [{target: "AppImage", arch: ["x64", "arm64"]}],
        icon: "app/assets/yakitlogo.icns"
    },
    win: {
        target: [{target: "nsis", arch: ["x64"]}],
        icon: "app/assets/yakitlogo.ico"
    },
    nsis: {
        oneClick: false,
        perMachine: false,
        deleteAppDataOnUninstall: true,
        allowToChangeInstallationDirectory: true,
        installerIcon: "app/assets/yakitlogo.ico",
        uninstallerIcon: "app/assets/yakitlogo.ico",
        unicode: true,
        include: "build/yakit_build.nsh",
        license: "LICENSE.md",
        warningsAsErrors: false,
        createDesktopShortcut: false,
        createStartMenuShortcut: true
    },
    beforePack: "packageScript/buildHook/before-pack.js",
    releaseInfo: {
        releaseName: "${version}",
        releaseNotes: "view github release: https://github.com/yaklang/yakit/releases"
    }
}

console.log("process.env", process.env.PLATFORM, "CSC_IDENTITY_AUTO_DISCOVERY", process.env.CSC_IDENTITY_AUTO_DISCOVERY)
const platform = process.env.PLATFORM
switch (platform) {
    case "ee":
        ConfigOption.appId = "io.yaklang.enpritrace"
        ConfigOption.productName = "EnpriTrace"
        ConfigOption.copyright = "Copyright © 2021 v1ll4n"
        ConfigOption.extraMetadata = {name: "enpritrace"}
        ConfigOption.mac.icon = "app/assets/yakiteelogo.icns"
        ConfigOption.linux.icon = "app/assets/yakiteelogo.icns"
        ConfigOption.win.icon = "app/assets/yakiteelogo.ico"
        ConfigOption.nsis.installerIcon = "app/assets/yakiteelogo.ico"
        ConfigOption.nsis.uninstallerIcon = "app/assets/yakiteelogo.ico"
        break
    case "se":
        ConfigOption.appId = "io.yaklang.enpritraceagent"
        ConfigOption.productName = "EnpriTraceAgent"
        ConfigOption.copyright = "Copyright © 2021 v1ll4n"
        ConfigOption.extraMetadata = {name: "enpritraceagent"}
        ConfigOption.mac.icon = "app/assets/yakitselogo.icns"
        ConfigOption.linux.icon = "app/assets/yakitselogo.icns"
        ConfigOption.win.icon = "app/assets/yakitselogo.ico"
        ConfigOption.nsis.installerIcon = "app/assets/yakitselogo.ico"
        ConfigOption.nsis.uninstallerIcon = "app/assets/yakitselogo.ico"
        break

    default:
        ConfigOption.appId = "io.yaklang.yakit"
        ConfigOption.productName = "Yakit"
        ConfigOption.copyright = "Copyright © 2024 yaklang.io"
        delete ConfigOption.extraMetadata
        ConfigOption.mac.icon = "app/assets/yakitlogo.icns"
        ConfigOption.linux.icon = "app/assets/yakitlogo.icns"
        ConfigOption.win.icon = "app/assets/yakitlogo.ico"
        ConfigOption.nsis.installerIcon = "app/assets/yakitlogo.ico"
        ConfigOption.nsis.uninstallerIcon = "app/assets/yakitlogo.ico"
        break
}

const autoDiscoveryIdentity = process.env.CSC_IDENTITY_AUTO_DISCOVERY
if (autoDiscoveryIdentity == "true") {
    ConfigOption.afterSign = "packageScript/buildHook/after-sign.js"
} else {
    delete ConfigOption.afterSign
}

module.exports = {...ConfigOption}
