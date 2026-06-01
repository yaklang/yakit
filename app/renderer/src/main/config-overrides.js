const {
  override,
  addWebpackResolve,
  addWebpackExternals,
  addWebpackPlugin,
  addWebpackAlias,
  addWebpackModuleRule,
  overrideDevServer,
  removeModuleScopePlugin,
  watchAll,
} = require('customize-cra')
const path = require('path')
const ProgressBarPlugin = require('progress-bar-webpack-plugin') // 打包进度
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const devMode = process.env.NODE_ENV !== 'production'
const AUX_ENTRY = path.resolve(__dirname, 'src/auxWindow/aux-entry.tsx')
// Windows 保留设备名 aux，不可用 aux.html
const AUX_HTML_TEMPLATE = path.resolve(__dirname, 'public/yakit-aux.html')

const OUTPUT_PATH = path.resolve(__dirname, '..', '..', 'pages', 'main')

/**
 * main / aux 双 entry 共用的重型 vendor，避免 monaco、markdown 渲染栈打进多个 chunk。
 * streamdown 生态含 mermaid / katex 等独立 node_modules，需一并抽出。
 */
const SHARED_VENDOR_CACHE_GROUPS = {
  monaco: {
    test: /[\\/]node_modules[\\/](monaco-editor|react-monaco-editor)([\\/]|$)/,
    name: 'vendor-monaco',
    chunks: 'all',
    priority: 50,
    enforce: true,
    reuseExistingChunk: true,
  },
  streamdown: {
    test: /[\\/]node_modules[\\/](streamdown|@streamdown|mermaid|katex|@uiw[\\/]react-md-editor)([\\/]|$)/,
    name: 'vendor-streamdown',
    chunks: 'all',
    priority: 50,
    enforce: true,
    reuseExistingChunk: true,
  },
  milkdown: {
    test: /[\\/]node_modules[\\/](@milkdown|prosemirror-)([\\/]|$)/,
    name: 'vendor-milkdown',
    chunks: 'all',
    priority: 49,
    enforce: true,
    reuseExistingChunk: true,
  },
}

module.exports = {
  webpack: override(
    addWebpackResolve({
      fallback: {
        fs: false,
      },
    }),
    addWebpackAlias({
      '@': path.resolve(__dirname, 'src'),
    }),
    // 打包进度条
    addWebpackPlugin(new ProgressBarPlugin()),
    addWebpackPlugin(
      new MonacoWebpackPlugin({
        languages: ['json', 'javascript', 'go', 'markdown', 'html', 'yaml', 'java', 'css'],
        filename: 'static/js/monaco/[name].worker.js',
      }),
    ),
    process.env.REACT_APP_ANALYZER &&
      addWebpackPlugin(
        new BundleAnalyzerPlugin({
          analyzerPort: 3000,
        }),
      ),
    addWebpackPlugin(new NodePolyfillPlugin()),
    !devMode &&
      addWebpackPlugin(
        new MiniCssExtractPlugin({
          filename: '[name].css',
          chunkFilename: '[id].css',
        }),
      ),
    addWebpackModuleRule(
      {
        test: [/\.css$/, /\.scss$/], // 可以打包后缀为scss/css的文件
        exclude: [/\.module\.(css|scss)/],
        use: [devMode ? 'style-loader' : MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
      },
      {
        test: /\.module\.(css|scss)/,
        use: [
          devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]_[local]_[hash:base64:5]',
              },
            },
          },
          'sass-loader',
        ],
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'media/[name].[hash:8].[ext]',
            },
          },
        ],
      },
    ),
    addWebpackExternals({ './cptable': 'var cptable' }),
    removeModuleScopePlugin(),
    (config) => {
      if (config.mode !== 'development') {
        config.output.path = OUTPUT_PATH
        config.output.publicPath = './'
      }
      // 去掉打包生产map 文件
      config.devtool = config.mode === 'development' ? 'cheap-module-source-map' : false
      config.ignoreWarnings = [/Failed to parse source map/]

      // 辅助窗口独立 entry，避免加载主应用整包
      if (typeof config.entry === 'string') {
        config.entry = { main: config.entry }
      } else if (Array.isArray(config.entry)) {
        config.entry = { main: config.entry }
      }
      config.entry.aux = AUX_ENTRY

      // main + aux 共用 vendor-monaco / vendor-streamdown，减少 asar 内重复体积
      const splitChunks = config.optimization.splitChunks || {}
      config.optimization.splitChunks = {
        ...splitChunks,
        chunks: 'all',
        maxInitialRequests: 30,
        cacheGroups: {
          ...splitChunks.cacheGroups,
          ...SHARED_VENDOR_CACHE_GROUPS,
        },
      }
      // 单 runtime，双 entry 共用 webpack 引导代码
      config.optimization.runtimeChunk = 'single'

      // CRA dev 默认所有 entry 输出到 bundle.js，多 entry 会互相覆盖导致白屏
      if (config.mode === 'development') {
        config.output.filename = 'static/js/[name].bundle.js'
      } else {
        config.output.chunkFilename = 'static/js/[name].[contenthash:8].chunk.js'
      }

      const htmlPluginIndex = config.plugins.findIndex(
        (plugin) => plugin.constructor && plugin.constructor.name === 'HtmlWebpackPlugin',
      )
      if (htmlPluginIndex !== -1) {
        const existingPlugin = config.plugins[htmlPluginIndex]
        const existingOptions = existingPlugin.userOptions || existingPlugin.options || {}
        config.plugins[htmlPluginIndex] = new HtmlWebpackPlugin({
          ...existingOptions,
          excludeChunks: ['aux'],
        })
      }

      config.plugins.push(
        new HtmlWebpackPlugin({
          inject: true,
          template: AUX_HTML_TEMPLATE,
          filename: 'yakit-aux.html',
          // 仅挂载 aux entry；vendor-monaco / vendor-streamdown 等依赖 chunk 由 webpack 图自动注入
          chunks: ['aux'],
          excludeChunks: ['main'],
        }),
      )

      return config
    },
  ),
  devServer: overrideDevServer((config) => {
    const newConfig = {
      ...config,
      hot: true,
      devMiddleware: {
        writeToDisk: true,
      },
      client: {
        overlay: {
          errors: true,
          warnings: false,
          runtimeErrors: false,
        },
      },
    }
    return newConfig
  }, watchAll()),
  paths: function (paths, env) {
    // 修改build下的输出目录
    paths.appBuild = OUTPUT_PATH
    return paths
  },
}
