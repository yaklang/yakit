import { execFileSync } from 'node:child_process'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { visualizer } from 'rollup-plugin-visualizer'
import checker from 'vite-plugin-checker'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(rootDir, '../../pages/main')

/**
 * 将 REACT_APP_* / NODE_ENV 注入为 process.env（整体对象）。
 * 平台 PLATFORM：优先 process.env（env-cmd / CI 注入），再合并 loadEnv 文件值；
 * 发行版 PLATFORM 以 .env-cmdrc 为准，仅 .env.development 保留本地 DEVTOOL 等。
 * 使用整体 define 而非逐键 `process.env.XXX`，避免与 vite-plugin-node-polyfills
 * 的 process shim 冲突导致标识符被拆坏（如残留裸标识符 REACT_APP_DEVTOOL）。
 */
function reactAppProcessEnvDefines(mode: string): Record<string, string> {
  const fileEnv = loadEnv(mode, rootDir, ['REACT_APP_', 'VITE_'])
  const merged: Record<string, string> = {
    NODE_ENV: process.env.NODE_ENV || (mode === 'development' ? 'development' : 'production'),
    ...fileEnv,
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (value == null || value === '') continue
    if (key.startsWith('REACT_APP_') || key.startsWith('VITE_')) {
      merged[key] = value
    }
  }
  return {
    // 字符串形式的对象字面量，使 process.env.FOO 变为 ({...}).FOO
    'process.env': JSON.stringify(merged),
  }
}

/** 构建分析：REACT_APP_ANALYZER=true */
function analyzerPlugin(): Plugin | null {
  if (process.env.REACT_APP_ANALYZER !== 'true') return null
  return visualizer({
    filename: path.resolve(outDir, 'stats.html'),
    open: true,
    gzipSize: true,
  }) as unknown as Plugin
}

/**
 * pro-layout 是 barrel 全量导出，其组件（如 SettingDrawer）会 import 'antd/es/xxx/style'
 * ——antd 逐组件 less 源（实际解析到 pro-layout 下嵌套的 node_modules/antd 副本）。
 * dev 无 tree-shaking，这些裸 .ant-xxx 默认样式随懒加载页面很晚才注入 <style>，
 * 把组件 module 样式整体覆盖（YakitButton 失效即由此导致）。
 * 入口已全局引入 antd/dist/antd.css（含全部组件样式），per-component 样式纯属冗余，
 * 统一替换为空模块（dev / build 同时生效）。CRA 时代靠 webpack tree-shaking 丢弃而未暴露。
 * 注意要同时匹配裸说明符与已解析绝对路径——optimizeDeps chunk 里保存的是后者。
 */
const ANTD_COMPONENT_STYLE_RE = /(^|[\\/])antd[\\/](es|lib)[\\/][\w-]+[\\/]style([\\/](index\.(less|css)|css(\.js)?))?$/

/** public/theme.css 已从版本库移除，dev/build 启动时重新生成（含子窗口副本） */
function generateThemeCssPlugin(): Plugin {
  return {
    name: 'generate-theme-css',
    buildStart() {
      execFileSync(process.execPath, [path.resolve(rootDir, 'scripts/generate-theme-css.cjs')], {
        stdio: 'inherit',
        cwd: rootDir,
      })
    },
  }
}

function noopAntdComponentStylePlugin(): Plugin {
  return {
    name: 'noop-antd-component-style',
    enforce: 'pre',
    resolveId(source) {
      if (ANTD_COMPONENT_STYLE_RE.test(source)) {
        return '\0virtual:noop-antd-style'
      }
      return null
    },
    load(id) {
      if (id === '\0virtual:noop-antd-style') return 'export default {}'
      return null
    },
  }
}

export default defineConfig(({ mode }) => {
  const sourcemap = process.env.GENERATE_SOURCEMAP === 'true'

  return {
    root: rootDir,
    base: './',
    publicDir: 'public',
    envPrefix: ['REACT_APP_', 'VITE_'],
    define: reactAppProcessEnvDefines(mode),
    plugins: [
      generateThemeCssPlugin(),
      noopAntdComponentStylePlugin(),
      react(),
      nodePolyfills({
        // 对齐 CRA fallback.fs=false：不要注入浏览器内存版 fs（主窗口 nodeIntegration 下真 Node fs 可用）
        include: ['buffer', 'process', 'stream', 'util', 'events', 'path', 'crypto', 'timers', 'vm'],
        globals: {
          Buffer: true,
          global: true,
          // process.env 由 define 注入；勿再全局替换 process 标识符，否则会拆坏 define
          process: false,
        },
        protocolImports: true,
      }),
      analyzerPlugin(),
      checker({
        // 仅 dev 模式启用（build 时跳过，避免与 type-check 脚本重复）
        enableBuild: false,
        // overlay 配置：仅 error 时自动展开面板
        overlay: {
          initialIsOpen: 'error',
        },
        // TypeScript 检查：使用 checker 专用配置（加 assumeChangesOnlyAffectDirectDependencies 加速增量）
        // tsconfig.app.json 保持给 CI/build 用，不污染其配置
        typescript: {
          root: rootDir,
          tsconfigPath: 'tsconfig.checker.json',
          buildMode: false,
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(rootDir, 'src') },
        // antd / pro-layout less 里的 ~antd 写法
        { find: /^~antd/, replacement: path.resolve(rootDir, 'node_modules/antd') },
        { find: /^~/, replacement: '' },
      ],
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: '[name]_[local]_[hash:base64:5]',
      },
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          // sass 1.54 → 1.93 新增的弃用警告刷屏；旧全局函数语法待统一迁移（Dart Sass 3.0 才移除），先静音
          silenceDeprecations: ['legacy-js-api', 'global-builtin', 'import'],
          logger: {
            // 颜色关键字插值警告（aqua→cyan / gray→grey 是 dart-sass 既有行为，CRA 时代相同，非迁移回归）
            warn(message) {
              if (message.includes("don't mean to use the color value")) return
              console.warn(message)
            },
          },
        },
        less: {
          javascriptEnabled: true,
          math: 'always',
        },
      },
    },
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      // Electron 通过 localhost 加载，无需 gzip/brotli 压缩，关闭可省 CPU
      compress: false,
      // 首屏前预热入口，减少运行中途发现新 dep 触发 504 Outdated Optimize Dep
      warmup: {
        clientFiles: ['./index.html', './yakit-aux.html', './src/index.tsx', './src/auxWindow/aux-entry.tsx'],
      },
    },
    preview: {
      host: true,
      port: 3000,
      strictPort: true,
    },
    optimizeDeps: {
      // 等静态依赖爬完再对外服务，避免浏览器拿着旧 hash 打到已失效的预构建产物
      holdUntilCrawlEnd: true,
      // 与 build.target 对齐，跳过 down-level 转译，加速预构建
      esbuildOptions: { target: 'esnext' },
      // lazy 路由架构下，冷启动 crawl 全量 src，一次性发现 node_modules 依赖，避免首访页签 504 Outdated Optimize Dep
      // 显式 entries 会覆盖默认 html 推断，须保留 index / yakit-aux
      entries: [
        'index.html',
        'yakit-aux.html',
        'src/**/*.{ts,tsx}',
        '!src/**/__test__/**',
        '!src/**/__tests__/**',
      ],
      // 重型 CJS 编辑器栈显式预构建（与 entries 互补；新增 lazy 页一般无需再改此处）
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'antd',
        'antd/es/date-picker/locale/zh_CN',
        'antd/es/date-picker/locale/zh_TW',
        'antd/es/date-picker/locale/en_US',
        '@ant-design/icons',
        'monaco-editor',
        'react-monaco-editor',
        'buffer',
        'ahooks',
        'lodash',
        'lodash/omit',
        'lodash/has',
        'lodash/isArray',
        'zustand',
        'uuid',
        'moment',
        'moment/locale/zh-cn',
        'moment/locale/zh-tw',
        'moment/locale/en-gb',
        're-resizable',
        'react-draggable',
        'react-sparklines',
        'react-codemirror2',
        'codemirror',
        'codemirror/mode/javascript/javascript',
        'codemirror/mode/xml/xml',
        'codemirror/mode/css/css',
        'codemirror/mode/python/python',
        'codemirror/mode/markdown/markdown',
        'codemirror/mode/php/php',
        'codemirror/mode/ruby/ruby',
        'codemirror/mode/shell/shell',
        'codemirror/mode/sql/sql',
        'codemirror/mode/yaml/yaml',
        'codemirror/mode/dockerfile/dockerfile',
        'codemirror/mode/htmlmixed/htmlmixed',
        'codemirror/mode/clike/clike',
        'codemirror/addon/hint/show-hint',
        'codemirror/addon/hint/javascript-hint',
        'codemirror/addon/selection/active-line',
        'codemirror/addon/edit/matchbrackets',
        '@uiw/react-md-editor',
        'rehype-sanitize',
        'streamdown',
        '@streamdown/code',
        '@streamdown/math',
        '@streamdown/mermaid',
        'prop-types',
      ],
    },
    build: {
      outDir,
      emptyOutDir: true,
      target: 'esnext',
      // Electron 本地 file:// 加载，不需要 module preload polyfill
      modulePreload: { polyfill: false },
      sourcemap,
      // Local/WSL Electron E2E builds keep production React semantics but skip
      // minification, whose minify workers can exceed 10 GiB in this project.
      // Build metadata prevents comparison with fully minified performance runs.
      // 对应 CRA config-overrides.js: config.optimization.minimize = false
      minify: process.env.YAKIT_E2E_BOUNDED_BUILD === '1' ? false : 'esbuild',
      // Vite 8 粒粒度 css chunk 会把入口 css（含 antd）排到组件 css 之后，
      // 同优先级下 antd 反噬组件样式（与 CRA 顺序相反）。Electron 本地加载无需 css 分包，
      // 关掉后按模块导入顺序合成单文件：antd 最早导入 → 排在最前 → 组件样式可正常覆盖
      cssCodeSplit: false,
      // milkdown 等包存在非法嵌套 var()，LightningCSS 会炸；回退 esbuild
      cssMinify: 'esbuild',
      chunkSizeWarningLimit: 2000,
      rolldownOptions: {
        input: {
          main: path.resolve(rootDir, 'index.html'),
          aux: path.resolve(rootDir, 'yakit-aux.html'),
        },
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor-monaco',
                test: /[\\/]node_modules[\\/](monaco-editor|react-monaco-editor)([\\/]|$)/,
                priority: 50,
              },
              {
                name: 'vendor-streamdown',
                test: /[\\/]node_modules[\\/](streamdown|@streamdown|mermaid|katex|@uiw[\\/]react-md-editor)([\\/]|$)/,
                priority: 50,
              },
              {
                name: 'vendor-milkdown',
                test: /[\\/]node_modules[\\/](@milkdown|prosemirror-)([\\/]|$)/,
                priority: 49,
              },
            ],
          },
        },
      },
    },
    worker: {
      format: 'es',
    },
  }
})
