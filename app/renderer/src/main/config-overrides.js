const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin")
const { override, fixBabelImports, addWebpackExternals, addWebpackAlias, addWebpackPlugin, overrideDevServer, addWebpackModuleRule, addBabelPresets, setWebpackTarget, addPostcssPlugins, addWebpackResolve, adjustStyleLoaders } = require('customize-cra');
const ProgressBarPlugin = require('progress-bar-webpack-plugin'); // 打包进度
const UglifyJsPlugin = require("uglifyjs-webpack-plugin")
const path = require("path")


const OUTPUT_PATH = path.resolve(__dirname, "..", "..", "pages", "main")



module.exports = {
    webpack: override(
        addWebpackResolve({
            fallback: {
                // 添加其它需要的核心模块
                fs: false,
                buffer: false,
                assert: false,
                timers: false,
                crypto: false,
                // fs: require.resolve('fs'),
                // buffer: require.resolve('buffer'),
                // crypto: require.resolve("crypto-browserify"),
                // assert: require.resolve("assert/"),
                // timers: require.resolve("timers-browserify")
            },
        }),
        fixBabelImports('import', { //配置按需加载
            libraryName: 'antd',
            libraryDirectory: 'es',
            style: 'css',
        }),
        addWebpackAlias({ //路径别名
            '@': path.resolve(__dirname, 'src'),
        }),
        // 打包进度条
        addWebpackPlugin(new ProgressBarPlugin()),
        addWebpackPlugin(new MonacoWebpackPlugin({
            languages: ["json", "javascript", "go", "markdown", "html", "yaml", "java"]
        })),
        // addPostcssPlugins([require("postcss-px2rem")({ remUnit: 37.5 })]),
        // process.env.NODE_ENV === "development" ?
        //     addWebpackPlugin(new UglifyJsPlugin({
        //         uglifyOptions: {
        //             // 删除警告
        //             warnings: false,
        //         },
        //     })) : addWebpackPlugin(new UglifyJsPlugin({
        //         // 开启打包缓存
        //         cache: true,
        //         // 开启多线程打包
        //         parallel: true,
        //         uglifyOptions: {
        //             // 删除警告
        //             warnings: false,
        //             // 压缩
        //             compress: {
        //                 // 移除console
        //                 drop_console: true,
        //                 // 移除debugger
        //                 drop_debugger: true,
        //             },
        //         },
        //     })),
        addWebpackPlugin(new UglifyJsPlugin({
            // // 开启打包缓存
            // cache: true,
            // // 开启多线程打包
            // parallel: true,
            uglifyOptions: {
                // 删除警告
                warnings: false,
                // 压缩
                // compress: {
                //     // 移除console
                //     drop_console: true,
                //     // 移除debugger
                //     drop_debugger: true,
                // },
            },
        })),
        addWebpackExternals(
            { "./cptable": "var cptable" },
        ),
        setWebpackTarget('node'),
        addWebpackModuleRule({
            test: [/\.css$/, /\.scss$/], // 可以打包后缀为sass/scss/css的文件
            use: ["style-loader", "css-loader", "sass-loader"]
        }),
        // adjustStyleLoaders(({ use: [, css, postcss, resolve, processor] }) => {
        //     css.options.sourceMap = true;         // css-loader
        //     postcss.options.sourceMap = true;     // postcss-loader
        //     // when enable pre-processor,
        //     // resolve-url-loader will be enabled too
        //     if (resolve) {
        //         resolve.options.sourceMap = true;   // resolve-url-loader
        //     }
        //     // pre-processor
        //     if (processor && processor.loader.includes('sass-loader')) {
        //         processor.options.sourceMap = true; // sass-loader
        //     }
        // }),
        (config) => {
            config.output.path = OUTPUT_PATH
            config.output.publicPath = "./"
            // config.externals = [{ "./cptable": "var cptable" }]
            // config.plugins.push(
            //     new MonacoWebpackPlugin({
            //         languages: ["json", "javascript", "go", "markdown", "html", "yaml", "java"]
            //     })
            // )
            //暴露webpack的配置 config ,evn
            // 去掉打包生产map 文件
            // if (process.env.NODE_ENV === "production") config.devtool = false
            // if (process.env.NODE_ENV !== "development") config.plugins = [...config.plugins, ...myPlugin]
            //1.修改、添加loader 配置 :
            // 所有的loaders规则是在config.module.rules(数组)的第二项 
            // 即：config.module.rules[2].oneof  (如果不是，具体可以打印 一下是第几项目)
            // 修改 sass 配置 ，规则 loader 在第五项(具体看配置)
            // const loaders = config.module.rules.find(rule => Array.isArray(rule.oneOf)).oneOf;
            // loaders[5].use.push({
            //     loader: 'sass-resources-loader',
            //     options: {
            //         // resources: path.resolve(__dirname, 'src/asset/base.scss')//全局引入公共的scss 文件
            //     }
            // })
            return config
        }
    ),
    devServer: overrideDevServer(
        config => ({
            ...config,
            hot: true,
            // devMiddleware: {
            //     writeToDisk: true,
            // }
            // writeToDisk: true,
            // host: process.env.HOST || "0.0.0.0",
            // sockHost: process.env.WDS_SOCKET_HOST,
            // sockPath: process.env.WDS_SOCKET_PATH,// default: '/sockjs-node'
            // sockPort: process.env.WDS_SOCKET_PORT,
        })
    )
};