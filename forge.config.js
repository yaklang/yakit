const {FusesPlugin} = require("@electron-forge/plugin-fuses")
const {FuseV1Options, FuseVersion} = require("@electron/fuses")

// 根据环境变量选择产品配置
const platform = process.env.PLATFORM

// 定义不同产品的配置映射
const productConfigs = {
    memfit: {
        name: "MemfitAI",
        productName: "Memfit AI",
        copyright: "Copyright © 2021 v1ll4n",
        icon: "app/assets/memfitlogo",
        ignore: [/^\/app\/assets\/(?!memfit-close\.png$|memfitlogo.*|yakitlogo\.png$|导入模板\.xlsx$).*$/]
    }
}

const current = productConfigs[platform]

// packagerConfig 基础配置
const packagerConfig = {
    asar: true,
    // 应用名称
    name: current.name,
    appCopyright: current.copyright,
    // 应用图标路径 不带扩展名，Forge 会自动查找 .icns/.ico/.png
    icon: current.icon,
    ignore: [
        ...(current.ignore || []),
        // ========= 忽略其他不需要的文件夹 =========
        /^\/\.github/,
        /^\/multibuilder/,
        /^\/scripts/,
        /^\/buildutil/,
        /^\/buildHooks/,
        /^\/build/,
        /^\/backups/,
        /^\/app\/renderer\/src/,
        /^\/cli/,
        /^\/bin/,
        /^\/report/,
        // ========= engine-link-startup 只保留 dist =========
        /^\/app\/renderer\/engine-link-startup\/(?!dist)/,
        // ========= 文件类型排除 =========
        /\.p12$/,
        /^\/imgs/,
        /\.gitignore$/,
        /vitest\.config\.ts$/,
        /electron-builder\.yaml$/,
        /forge.config\.js$/,
        /LICENSE\.md$/,
        /package\.json\.pre-commit\.bak$/,
        /prettier\.config\.js$/,
        /ELECTRON_GUIDE\.md$/,
        /^\/README.*/
    ],
    // 指向你本地 electron zip 所在文件夹（sw_64 electron包名需要改为：electron-v25.9.7-linux-sw_64）
    electronZipDir: "/root/electron-cache"
}

module.exports = {
    // 控制打包行为的配置
    packagerConfig,
    rebuildConfig: {},
    // 定义安装程序生成器
    makers: [
        // Linux RPM 包（适配申威统信服务器版）
        {
            name: "@electron-forge/maker-rpm",
            config: {
                options: {
                    name: current.name,
                    productName: current.productName,
                    icon: "app/assets/memfitlogo.ico",
                    maintainer: "v1ll4n",
                    homepage: "https://yaklang.io",
                    // 可选：指定架构，申威通常为 sw_64
                    arch: "sw_64"
                }
            }
        }
    ],
    // 集成额外功能插件
    plugins: [
        {
            name: "@electron-forge/plugin-auto-unpack-natives",
            config: {}
        },
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true
        })
    ]
}
