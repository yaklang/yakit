const {
    override,
    fixBabelImports,
    addWebpackResolve,
    addWebpackExternals,
    addWebpackPlugin,
    addWebpackAlias,
    addWebpackModuleRule,
    overrideDevServer,
    setWebpackTarget,
    addBabelPresets
} = require('customize-cra')
const path = require('path')
const ProgressBarPlugin = require('progress-bar-webpack-plugin'); // 打包进度
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin")
const UglifyJsPlugin = require("uglifyjs-webpack-plugin")
const HotModuleReplacementPlugin = require('webpack/lib/HotModuleReplacementPlugin');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")

const OUTPUT_PATH = path.resolve(__dirname, "..", "..", "pages", "main")

module.exports = {
    webpack: override(
        addWebpackResolve({
            fallback: {
                // 添加其它需要的核心模块
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
        addWebpackPlugin(new HotModuleReplacementPlugin()),
        addWebpackPlugin(new NodePolyfillPlugin()),
        addWebpackModuleRule({
            test: [/\.css$/, /\.scss$/], // 可以打包后缀为sass/scss/css的文件
            use: ["style-loader", "css-loader", "sass-loader"]
        }),
        addWebpackExternals(
            { "./cptable": "var cptable" },
            // {
            //     test: /\.js[x]?$/, // 设置所匹配要解析的文件
            //     use: {
            //         loader: 'babel-loader',  // 使用的loader
            //         options: { // loader的配置
            //             presets: [ // 设置预设
            //                 ['@babel/preset-env', { // 高级语法解析预设
            //                     // useBuiltIns 有三个值
            //                     // false：不对polyfill做操作。
            //                     // entry：根据配置的浏览器兼容, 引入浏览器不兼容的 polyfill。需要在入口处手动引入polyfill
            //                     // usage：根据配置的浏览器兼容,及代码中使用到的高级语法按需求引入polyfill
            //                     useBuiltIns: 'usage',
            //                     corejs: 3 // core-js的使用版本
            //                 }],
            //                 '@babel/preset-react', // 解析
            //             ]
            //         },
            //     },
            //     exclude: /node_modules/, // 一般依赖已经经过转换，所以排除安装的依赖包，只转换我们自己的代码提高速度。
            // },
        ),
        (config) => {
            config.output.path = OUTPUT_PATH
            // config.output.publicPath = "./"
            //暴露webpack的配置 config ,evn
            // 去掉打包生产map 文件
            config.devtool = config.mode === 'development' ? 'cheap-module-source-map' : false;
            // if (process.env.NODE_ENV === "production") 
            // if (process.env.NODE_ENV !== "development") config.plugins = [...config.plugins, ...myPlugin]
            console.log('config-webpack', config, OUTPUT_PATH)
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
            console.log('config-devServer', newConfig)
            return newConfig
        },
        // watchAll()
    ),
}