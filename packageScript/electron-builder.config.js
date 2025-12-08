// app 信息配置
let appInfoOption = null

// 各平台图标配置
let macIcon = null
let linuxIcon = null
let winIcon = null
let nsisInstallerIcon = null
let nsisUninstallerIcon = null

// 生成构建包的自定义配置
const platform = process.env.PLATFORM
switch (platform) {
    case "ee":
        appInfoOption = {
            appId: "io.yaklang.enpritrace",
            extraMetadata: {name: "enpritrace"},
            productName: "EnpriTrace",
            copyright: "Copyright © 2021 v1ll4n"
        }
        macIcon = "app/assets/yakiteelogo.icns"
        linuxIcon = "app/assets/yakiteelogo.icns"
        winIcon = "app/assets/yakiteelogo.ico"
        nsisInstallerIcon = "app/assets/yakiteelogo.ico"
        nsisUninstallerIcon = "app/assets/yakiteelogo.ico"
        break
    case "se":
        appInfoOption = {
            appId: "io.yaklang.enpritraceagent",
            extraMetadata: {name: "enpritraceagent"},
            productName: "EnpriTraceAgent",
            copyright: "Copyright © 2021 v1ll4n"
        }
        macIcon = "app/assets/yakitselogo.icns"
        linuxIcon = "app/assets/yakitselogo.icns"
        winIcon = "app/assets/yakitselogo.ico"
        nsisInstallerIcon = "app/assets/yakitselogo.ico"
        nsisUninstallerIcon = "app/assets/yakitselogo.ico"
        break
    case "irify":
        appInfoOption = {
            appId: "io.yaklang.irify",
            extraMetadata: {name: "irify"},
            productName: "IRify",
            copyright: "Copyright © 2021 v1ll4n"
        }
        macIcon = "app/assets/yakitsslogo.icns"
        linuxIcon = "app/assets/yakitsslogo.icns"
        winIcon = "app/assets/yakitsslogo.ico"
        nsisInstallerIcon = "app/assets/yakitsslogo.ico"
        nsisUninstallerIcon = "app/assets/yakitsslogo.ico"
        break
    case "irifyee":
        appInfoOption = {
            appId: "io.yaklang.irifyee",
            extraMetadata: {name: "irifyee"},
            productName: "IRifyEnpriTrace",
            copyright: "Copyright © 2021 v1ll4n"
        }
        macIcon = "app/assets/yakitsslogo.icns"
        linuxIcon = "app/assets/yakitsslogo.icns"
        winIcon = "app/assets/yakitsslogo.ico"
        nsisInstallerIcon = "app/assets/yakitsslogo.ico"
        nsisUninstallerIcon = "app/assets/yakitsslogo.ico"
        break
    case "memfit":
        appInfoOption = {
            appId: "io.yaklang.memfit",
            extraMetadata: {name: "memfit"},
            productName: "Memfit AI",
            copyright: "Copyright © 2021 v1ll4n"
        }
        macIcon = "app/assets/memfitlogo.icns"
        linuxIcon = "app/assets/memfitlogo.icns"
        winIcon = "app/assets/memfitlogo.ico"
        nsisInstallerIcon = "app/assets/memfitlogo.ico"
        nsisUninstallerIcon = "app/assets/memfitlogo.ico"
        break

    default:
        // ce
        appInfoOption = {
            appId: "io.yaklang.yakit",
            productName: "Yakit",
            copyright: "Copyright © 2024 yaklang.io"
        }
        macIcon = "app/assets/yakitlogo.icns"
        linuxIcon = "app/assets/yakitlogo.icns"
        winIcon = "app/assets/yakitlogo.ico"
        nsisInstallerIcon = "app/assets/yakitlogo.ico"
        nsisUninstallerIcon = "app/assets/yakitlogo.ico"
        break
}

const configOption = {
    ...(appInfoOption || {}),
    /** @description extraFiles 可以在各自平台独立配置 */
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
        "!app/renderer/src/**/*",
        "!cli/*",
        "!env/*"
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
        entitlements: "packageScript/plist/entitlements.mac.plist",
        entitlementsInherit: "packageScript/plist/entitlements.mac.plist",
        target: [{target: "dmg", arch: ["x64", "arm64"]}],
        icon: macIcon
    },
    linux: {
        target: [{target: "AppImage", arch: ["x64", "arm64"]}],
        icon: linuxIcon
    },
    win: {
        target: [{target: "nsis", arch: ["x64"]}],
        icon: winIcon
    },
    nsis: {
        oneClick: false,
        perMachine: false,
        deleteAppDataOnUninstall: true,
        allowToChangeInstallationDirectory: true,
        installerIcon: nsisInstallerIcon,
        uninstallerIcon: nsisUninstallerIcon,
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

// extraFiles 是否配置-构建兼容旧平台的扩展文件
const isLegacy = process.env.THE_LEGACY == "true"
if (isLegacy) {
    configOption.extraFiles.push({
        from: "bins/yakit-system-mode.txt",
        to: "bins/yakit-system-mode.txt"
    })
}

// 是否执行公证流程
const autoDiscoveryIdentity = process.env.CSC_IDENTITY_AUTO_DISCOVERY
if (autoDiscoveryIdentity == "true") {
    /** 提取公证关键信息，判断是否有执行公证的环境 */
    const {TEAM_ID, CERT_BASE64, CERT_PASSWORD} = process.env
    if (TEAM_ID && CERT_BASE64 && CERT_PASSWORD) {
        configOption.afterSign = "packageScript/buildHook/after-sign.js"
    }
}

module.exports = {...configOption}
