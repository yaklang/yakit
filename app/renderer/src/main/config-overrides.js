const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin")
const path = require("path")
const OUTPUT_PATH = path.resolve(__dirname, "..", "..", "pages", "main")
// const { override, addWebpackAlias } = require('customize-cra')

// 配置全局公共scss变量
/* const styleLoader = (rule) => {
    if (rule.test.toString().includes("scss")) {
        rule.use.push({
            loader: require.resolve("sass-resources-loader"),
            options: {resources: "./src/assets/index.scss"}
        })
    }
} */

module.exports = {
    webpack: function (config, env) {
        config.output.path = OUTPUT_PATH
        config.output.publicPath = "./"
        config.plugins.push(
            new MonacoWebpackPlugin({
                languages: ["json", "javascript", "go", "markdown", "html", "yaml", "java"]
            })
        )

        // 支持别名
        config.resolve.alias = {
            "@": path.resolve(__dirname, "src")
        }
        // 支持scss预处理器
        let loaderList = config.module.rules[1].oneOf
        loaderList.splice(loaderList.length - 1, 0, {
            test: /\.scss$/,
            use: ["style-loader", "css-loader", "sass-loader"]
        })
        //配置全局公共scss变量
        /* const mode = process.env.NODE_ENV === "production" ? "prod" : "dev"
        const loader = mode === "prod" ? "css-extract-plugin" : "style-loader"
        const loaders = config.module.rules.find((rule) => Array.isArray(rule.oneOf)).oneOf
        const styleLoaders = loaders.filter(({use}) => use && use[0] && (use[0].loader || use[0]).includes(loader))
        styleLoaders.forEach((loader) => styleLoader(loader)) */

        return config
    },
    devServer: function (configFunction) {
        return function (proxy, allowedHost) {
            const config = configFunction(proxy, allowedHost)

            // 将文件输出到硬盘
            config.writeToDisk = true
            // 修改sock相关配置保证热更新功能正常
            config.host = process.env.HOST || "0.0.0.0"
            config.sockHost = process.env.WDS_SOCKET_HOST
            config.sockPath = process.env.WDS_SOCKET_PATH // default: '/sockjs-node'
            config.sockPort = process.env.WDS_SOCKET_PORT

            return config
        }
    },
    paths: function (paths, env) {
        // 修改build下的输出目录
        paths.appBuild = OUTPUT_PATH
        return paths
    }
    // addWebpackAlias: () => {
    //     return {
    //         ['@']: path.resolve(__dirname, './src'),
    //         ['@components']: path.resolve(__dirname, './src/components')
    //     }
    // }
}

// module.exports = override(
//     addWebpackAlias({
//         ['@']: path.resolve(__dirname, './src'),
//         ['@components']: path.resolve(__dirname, './src/components')
//     })
// )
// module.exports = function override(config, env) {
//     config.plugins.push(new MonacoWebpackPlugin({
//         languages: ['json', "javascript", 'go', 'markdown', 'html']
//     }));
//     return config;
// }
