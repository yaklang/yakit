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
 * link 窗口独立构建：与主窗口同一份源码树，但单独产物 / chunk 图。
 * dev 由 vite.config.mts 的 :3000 统一服务 engine-link.html；本文件只负责生产构建。
 */
const rootDir = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(rootDir, '../../pages/link')
/** Link 只需要 theme.css，不复制主窗口整套 public 资源 */
const linkPublicDir = path.resolve(rootDir, '.link-public')
const mainPagesRoot = path.resolve(rootDir, 'src/pages')
const mainNewAppRoot = path.resolve(rootDir, 'src/newApp')
const linkPagesRoot = path.resolve(rootDir, 'src/engineLinkStartup/pages')

const normalizeModuleId = (id: string) => id.replace(/\\/g, '/').split('?')[0]

/**
 * Link 构建不应包含主窗口页面模块，也不应出现 window.require。
 * 按模块图判断，避免与 Vite 生成的 chunk 名耦合。
 */
function linkModuleBoundaryPlugin(): Plugin {
  const mainPagePrefix = `${normalizeModuleId(mainPagesRoot)}/`
  const mainNewAppPrefix = `${normalizeModuleId(mainNewAppRoot)}/`
  const linkPagePrefix = `${normalizeModuleId(linkPagesRoot)}/`

  return {
    name: 'link-module-boundary',
    apply: 'build',
    transform(code, id) {
      const moduleId = normalizeModuleId(id)
      if (moduleId.startsWith('\0') || moduleId.includes('/node_modules/')) return
      if (/\b(?:window|globalThis)\s*\.\s*require\s*\(/.test(code)) {
        this.error(`Link 构建禁止 window.require，请改用 preload bridge：${moduleId}`)
      }
    },
    generateBundle() {
      const leaked = [...this.getModuleIds()]
        .map(normalizeModuleId)
        .filter(
          (id) => (id.startsWith(mainPagePrefix) && !id.startsWith(linkPagePrefix)) || id.startsWith(mainNewAppPrefix),
        )

      if (leaked.length) {
        this.error(
          `Link 构建包含主窗口页面模块，请检查 Link 入口是否引用了 @/pages 或 @/newApp：\n${leaked.slice(0, 10).join('\n')}`,
        )
      }
    },
  }
}

/** public/theme.css 已从版本库移除，构建时重新生成；Link 只复制 theme.css 到独立 public 目录 */
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

export default defineConfig(({ mode }) => {
  const sourcemap = process.env.YAKIT_SOURCEMAP === 'true'

  return {
    root: rootDir,
    base: './',
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
