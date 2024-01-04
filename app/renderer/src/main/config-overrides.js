const {
    override,
    fixBabelImports,
    addWebpackResolve,
    addWebpackExternals,
    addWebpackPlugin,
    addWebpackAlias,
    addWebpackModuleRule,
    overrideDevServer,
    watchAll
} = require('customize-cra')
const path = require('path')
const ProgressBarPlugin = require('progress-bar-webpack-plugin'); // 打包进度
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin")
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")

const OUTPUT_PATH = path.resolve(__dirname, "..", "..", "pages", "main")

module.exports = {
    webpack: override(
        addWebpackResolve({
            fallback: {
                fs: false,
            },
        }),
        fixBabelImports('import', {
            libraryName: 'antd',
            libraryDirectory: 'es',
            style: 'css'
        }),
        addWebpackAlias({
            '@': path.resolve(__dirname, 'src')
        }),
        // 打包进度条
        addWebpackPlugin(new ProgressBarPlugin()),
        addWebpackPlugin(new MonacoWebpackPlugin({
            languages: ["json", "javascript", "go", "markdown", "html", "yaml", "java"],
        })),
        // addWebpackPlugin(new HotModuleReplacementPlugin()),
        addWebpackPlugin(new NodePolyfillPlugin()),
        addWebpackModuleRule({
            test: [/\.css$/, /\.scss$/], // 可以打包后缀为sass/scss/css的文件
            use: ["style-loader", "css-loader", "sass-loader"]
        }),
        addWebpackExternals(
            { "./cptable": "var cptable" },
        ),
        (config) => {
            if (config.mode !== 'development') {
                config.output.path = OUTPUT_PATH
                config.output.publicPath = "./"
            }
            // 去掉打包生产map 文件
            config.devtool = config.mode === 'development' ? 'cheap-module-source-map' : false;
            // console.log('config-webpack', config)
            return config
        }
    ),
    devServer: overrideDevServer(
        config => {
            const newConfig = {
                ...config,
                hot: true,
                devMiddleware: {
                    writeToDisk: true,
                },
            }
            return newConfig
        },
        watchAll()
    ),
    paths: function (paths, env) {
        // 修改build下的输出目录
        paths.appBuild = OUTPUT_PATH
        return paths
    }
}