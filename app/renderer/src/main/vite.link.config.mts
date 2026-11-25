import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { yakitUiIconsPurePlugin } from '../../vite-plugins/yakitUiIconsPurePlugin.mjs'
import { createProcessEnvDefines } from '../../vite-plugins/yakitProcessEnv.mjs'

/**
 * Link 窗口独立配置：与主窗口同一份源码树，但使用 Link 专属 alias、dev server 和独立产物 / chunk 图。
 * dev 起在 :3001 提供 engine-link.html；build 输出 pages/link。
 */
const rootDir = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(rootDir, '../../pages/link')
/** Link 只需要 theme.css，不复制主窗口整套 public 资源 */
const linkPublicDir = path.resolve(rootDir, '.link-public')
const mainPagesRoot = path.resolve(rootDir, 'src/pages')
const mainNewAppRoot = path.resolve(rootDir, 'src/newApp')
/** 供 icon migration 审计使用：Link 实际模块图包含主窗共享组件，不能只按 engineLinkStartup 扫源码 */
const linkSourceManifest = path.resolve(outDir, '../.link-module-manifest.json')

const normalizeModuleId = (id: string) => id.replace(/\\/g, '/').split('?')[0]
const mainPagePrefix = `${normalizeModuleId(mainPagesRoot)}/`
const mainNewAppPrefix = `${normalizeModuleId(mainNewAppRoot)}/`

/** 已解析模块 id 是否属于主窗口页面/新应用目录；dev 的 load 与 build 的 generateBundle 共用 */
export const isForbiddenLinkModule = (id: string) => {
  const moduleId = normalizeModuleId(id)
  return moduleId.startsWith(mainPagePrefix) || moduleId.startsWith(mainNewAppPrefix)
}

/**
 * Link dev/build 都不应包含主窗口页面模块，也不应出现 window.require。
 * 按模块图判断，避免与 Vite 生成的 chunk 名耦合。
 */
function linkModuleBoundaryPlugin(): Plugin {
  return {
    name: 'link-module-boundary',
    resolveId(source) {
      if (
        source === '@/pages' ||
        source.startsWith('@/pages/') ||
        source === '@/newApp' ||
        source.startsWith('@/newApp/')
      ) {
        this.error(`Link 禁止引用主窗口页面模块：${source}`)
      }
    },
    load(id) {
      if (isForbiddenLinkModule(id)) {
        this.error(`Link 禁止引用主窗口页面模块：${normalizeModuleId(id)}`)
      }
    },
    transform(code, id) {
      const moduleId = normalizeModuleId(id)
      if (moduleId.startsWith('\0') || moduleId.includes('/node_modules/')) return
      if (/\b(?:window|globalThis)\s*\.\s*require\s*\(/.test(code)) {
        this.error(`Link 构建禁止 window.require，请改用 preload bridge：${moduleId}`)
      }
    },
    generateBundle() {
      const moduleIds = [...this.getModuleIds()].map(normalizeModuleId)
      const leaked = moduleIds.filter(isForbiddenLinkModule)

      if (leaked.length) {
        this.error(
          `Link 构建包含主窗口页面模块，请检查 Link 入口是否引用了 @/pages 或 @/newApp：\n${leaked.slice(0, 10).join('\n')}`,
        )
      }

      const sourcePrefix = `${normalizeModuleId(path.resolve(rootDir, 'src'))}/`
      const sourceFiles = moduleIds
        .filter((id) => id.startsWith(sourcePrefix) && /\.(?:[cm]?[jt]sx?)$/.test(id))
        .filter((id) => !id.split('/').some((segment) => ['__test__', '__tests__'].includes(segment)))
        .filter((id) => !/\.(?:test|spec)\.[^/]+$/.test(id))
        .sort()
      fs.mkdirSync(path.dirname(linkSourceManifest), { recursive: true })
      fs.writeFileSync(linkSourceManifest, `${JSON.stringify({ source_files: sourceFiles }, null, 2)}\n`)
    },
  }
}

/** public/theme.css 已从版本库移除，dev/build 启动时重新生成；Link 只复制 theme.css 到独立 public 目录 */
function generateThemeCssPlugin(): Plugin {
  return {
    name: 'generate-theme-css',
    config() {
      if (process.env.THEME_CSS_PREGENERATED !== '1') {
        execFileSync(process.execPath, [path.resolve(rootDir, 'scripts/generate-theme-css.cjs')], {
          stdio: 'inherit',
          cwd: rootDir,
        })
      }
      fs.mkdirSync(linkPublicDir, { recursive: true })
      fs.copyFileSync(path.join(rootDir, 'public/theme.css'), path.join(linkPublicDir, 'theme.css'))
    },
  }
}

export default defineConfig(({ mode, command }) => {
  const isServe = command === 'serve'
  const sourcemap = process.env.YAKIT_SOURCEMAP === 'true'

  return {
    root: rootDir,
    // 与主窗口 dev server 分开缓存，避免两个 Vite 进程争用同一 optimizeDeps 目录
    cacheDir: path.resolve(rootDir, 'node_modules/.vite-link'),
    // dev 走 http://127.0.0.1:3001，生产 file:// 必须使用相对路径
    base: isServe ? '/' : './',
    publicDir: linkPublicDir,
    envPrefix: ['YAKIT_', 'REACT_APP_', 'VITE_'],
    define: { ...createProcessEnvDefines(mode, rootDir), __YAKIT_LINK_ENTRY__: 'true' },
    plugins: [
      generateThemeCssPlugin(),
      linkModuleBoundaryPlugin(),
      yakitUiIconsPurePlugin(),
      react(),
      nodePolyfills({
        include: ['buffer', 'process', 'stream', 'util', 'events', 'path', 'crypto', 'timers', 'vm'],
        globals: {
          Buffer: true,
          global: true,
          process: false,
        },
        protocolImports: true,
      }),
    ],
    server: {
      host: true,
      port: 3001,
      strictPort: true,
      compress: false,
      warmup: {
        clientFiles: [
          './engine-link.html',
          './src/engineLinkStartup/main.tsx',
          './src/engineLinkStartup/bootstrap.tsx',
        ],
      },
    },
    preview: {
      host: true,
      port: 3001,
      strictPort: true,
    },
    optimizeDeps: {
      // 只列 Link 入口；共享组件依赖由 Vite 沿静态 import 继续 crawl，避免把主窗口页面扫进来。
      holdUntilCrawlEnd: true,
      entries: [
        'engine-link.html',
        'src/engineLinkStartup/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/__test__/**',
        '!src/**/__tests__/**',
      ],
    },
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'ahooks'],
      alias: [
        // 共享主窗模块只允许使用 link preload 具备的窄 facade
        {
          find: '@/services/electronBridge',
          replacement: path.resolve(rootDir, 'src/engineLinkStartup/utils/bridgeFacade.ts'),
        },
        // link 只保留自己的 locale chunk，避免主窗口全部 locale JSON 进入 pages/link
        {
          find: '@/i18n/localeLoader',
          replacement: path.resolve(rootDir, 'src/engineLinkStartup/i18n/localeLoader.ts'),
        },
        {
          find: '@/i18n/inlineResources',
          replacement: path.resolve(rootDir, 'src/engineLinkStartup/i18n/inlineResources.ts'),
        },
        // link 不需要主窗口的全量空状态图，避免 36 张 PNG 进入 pages/link
        {
          find: '@/hook/useResultEmpty/SearchEmpty',
          replacement: path.resolve(rootDir, 'src/engineLinkStartup/utils/emptyImage.ts'),
        },
        { find: '@', replacement: path.resolve(rootDir, 'src') },
        { find: /^~antd/, replacement: path.resolve(rootDir, 'node_modules/antd') },
        { find: /^~/, replacement: '' },
        { find: /^react$/, replacement: path.resolve(rootDir, 'node_modules/react') },
        { find: /^react-dom$/, replacement: path.resolve(rootDir, 'node_modules/react-dom') },
        {
          find: 'react-resize-detector',
          replacement: path.resolve(rootDir, 'src/utils/shims/reactResizeDetector.tsx'),
        },
        { find: 'xterm-for-react', replacement: path.resolve(rootDir, 'src/utils/shims/xtermForReact.tsx') },
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
          silenceDeprecations: ['legacy-js-api', 'global-builtin', 'import'],
        },
        less: {
          javascriptEnabled: true,
          math: 'always',
        },
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
      target: 'esnext',
      modulePreload: { polyfill: false },
      sourcemap,
      minify: process.env.YAKIT_E2E_BOUNDED_BUILD === '1' ? false : 'oxc',
      // link 冷启动优先：lazy 页面/编辑器的 CSS 不并入首屏
      cssCodeSplit: true,
      cssMinify: 'esbuild',
      chunkSizeWarningLimit: 2000,
      rolldownOptions: {
        input: {
          link: path.resolve(rootDir, 'engine-link.html'),
        },
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vite-preload',
                test: /\0vite\/preload-helper\.js$/,
                priority: 70,
              },
              {
                name: 'vendor-react',
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler|@babel[\\/]runtime|rc-[a-z-]+|@rc-component)([\\/]|$)/,
                priority: 60,
              },
            ],
          },
        },
      },
    },
    worker: {
      format: 'es',
    },
    json: {
      stringify: true,
    },
  }
})
