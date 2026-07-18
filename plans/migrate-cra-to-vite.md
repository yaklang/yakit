# 执行计划：主渲染端 CRA → Vite 迁移

> **给 agent 的使用说明**：本文件是自包含的迁移执行指令。用 `@plans/migrate-cra-to-vite.md` 引入后，严格按「阶段 A → G」顺序执行，每阶段完成后向用户报告该阶段结果，再进入下一阶段。所有改动**必须隔离在 `app/renderer/src/main/` 目录内**。

---

## 任务目标

把主渲染端 `app/renderer/src/main/` 从 CRA（react-scripts + react-app-rewired + customize-cra）迁移到 Vite，对齐已迁移的 Link 渲染端（`app/renderer/engine-link-startup/`）。

## 核心约束（必须遵守）

1. **只改 `app/renderer/src/main/` 目录内的文件**。
2. **绝对禁止改动**以下文件/目录（保持零改动）：
   - `app/main/`（Electron 主进程，含 `index.js`、`handlers/*`）
   - `packageScript/`（electron-builder 配置）
   - 根目录 `package.json`
   - `app/renderer/engine-link-startup/`（Link 渲染端）
   - `app/renderer/src/main/.env-cmdrc`
3. **保持三个不变**：
   - 产物输出路径：`app/renderer/pages/main/`
   - dev server 端口：`3000`
   - 环境变量机制：`env-cmd` + `.env-cmdrc`（注入 `process.env.REACT_APP_*`）
4. **不要**在 `package.json` 中添加 `"type": "module"`（`scripts/cli.js`、`tailwind.config.js` 是 CommonJS）。
5. 每完成一个阶段，简要报告该阶段改了什么，再继续下一阶段。

---

## 前置确认（阶段 0）

执行前先读取以下文件，核对现状与本计划描述一致。若发现重大偏差，停下并询问用户：

- `app/renderer/src/main/package.json`（确认 `react-scripts` 5.0.1、`react-app-rewired`、30 条 scripts）
- `app/renderer/src/main/config-overrides.js`（确认双 entry、OUTPUT_PATH、Monaco 配置）
- `app/renderer/src/main/src/index.tsx`（确认 `MonacoEnvironment.getWorkerUrl` 硬编码 `static/js/monaco`）
- `app/renderer/src/main/public/index.html` 和 `public/yakit-aux.html`（确认 `%PUBLIC_URL%` 占位符）
- `app/renderer/src/main/src/index.css` 第 1 行（确认 `@import '~antd/dist/antd.css'`）
- `app/main/index.js` 第 249-250 行（确认主进程加载 `:3000` 和 `pages/main/index.html`）

---

## 阶段 A：依赖调整

**文件**：`app/renderer/src/main/package.json`

### A.1 从 `dependencies` 移除

```
"customize-cra": "^1.0.0",
"file-loader": "^6.2.0",
"monaco-editor-webpack-plugin": "^7.1.0",
"react-app-rewired": "^2.1.8",
"react-scripts": "5.0.1",
"sass-resources-loader": "^2.2.5",
```

### A.2 从 `devDependencies` 移除

```
"babel-plugin-import": "^1.13.8",
"mini-css-extract-plugin": "^2.7.6",
"node-polyfill-webpack-plugin": "^3.0.0",
"progress-bar-webpack-plugin": "^2.1.0",
"sass-loader": "^12.6.0",
"source-map-loader": "^4.0.2",
"webpack-bundle-analyzer": "^4.10.1",
```

### A.3 新增到 `devDependencies`

```
"@vitejs/plugin-react": "^4.0.0",
"autoprefixer": "^10.4.0",
"vite-plugin-node-polyfills": "^2.0.0",
```

### A.4 升级（devDependencies）

```
"vite": "^6.0.0",          （原 "4.4.9"）
"vitest": "^1.0.4",        （原 "0.34.6"）
"@types/node": "^20.0.0",  （原 "^12.0.0"，dependencies 里也要同步改）
```

> `@types/node` 当前在 `dependencies`，改为 `^20.0.0` 并保留在 `dependencies`（与 Link 渲染端一致放 devDeps 也可，二选一，保持一致即可）。

### A.5 删除 `resolutions` 字段

```diff
- "resolutions": {
-   "//": "See https://github.com/facebook/create-react-app/issues/11773",
-   "react-error-overlay": "6.0.11"
- },
```

### A.6 保留（不动）

`env-cmd`、`cross-env`、`sass`、`tailwindcss`、`postcss-normalize`、`patch-package`、`monaco-editor`、`react-monaco-editor`、`vite-tsconfig-paths`（devDeps，可留可删，建议保留备用）。

---

## 阶段 B：新建 `vite.config.ts`

**文件**：`app/renderer/src/main/vite.config.ts`（新增）

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

const PLATFORM = process.env.REACT_APP_PLATFORM || ''

/**
 * main / aux 双 entry 共用的重型 vendor 分组。
 * 对齐原 config-overrides.js 的 splitChunks.cacheGroups，避免 monaco / markdown 栈重复打进多个 chunk。
 */
function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return
  if (/[\\/]node_modules[\\/](monaco-editor|react-monaco-editor)[\\/]/.test(id)) return 'vendor-monaco'
  if (/[\\/]node_modules[\\/](streamdown|@streamdown|mermaid|katex|@uiw[\\/]react-md-editor)[\\/]/.test(id)) {
    return 'vendor-streamdown'
  }
  if (/[\\/]node_modules[\\/](@milkdown|prosemirror-)[\\/]/.test(id)) return 'vendor-milkdown'
}

export default defineConfig({
  // Electron 打包后用 file:// 加载，必须用相对路径
  base: './',
  plugins: [
    react(),
    // 替代 CRA 的 NodePolyfillPlugin；排除 fs（渲染端不需要）
    nodePolyfills({ exclude: ['fs'] }),
  ],
  server: {
    host: true,
    // 保持 3000 端口，主进程 4 处 loadURL 零改动
    port: 3000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  css: {
    modules: {
      // 对齐原 webpack localIdentName，避免样式错位
      generateScopedName: '[name]_[local]_[hash:base64:5]',
    },
  },
  define: {
    // 保留 env-cmd 注入的 process.env.REACT_APP_*，源码零改动
    'process.env.REACT_APP_PLATFORM': JSON.stringify(PLATFORM),
    'process.env.REACT_APP_DEVTOOL': JSON.stringify(process.env.REACT_APP_DEVTOOL || ''),
    'process.env.REACT_APP_REQUIRE_ENTERPRISE_LICENSE': JSON.stringify(
      process.env.REACT_APP_REQUIRE_ENTERPRISE_LICENSE || ''
    ),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  build: {
    // 输出到原 CRA 的产物路径，主进程 loadFile / electron-builder files 零改动
    outDir: path.resolve(__dirname, '../../pages/main'),
    emptyOutDir: true,
    target: 'esnext',
    sourcemap: false, // 对齐原 GENERATE_SOURCEMAP=false
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        aux: path.resolve(__dirname, 'yakit-aux.html'),
      },
      output: {
        format: 'es',
        manualChunks,
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd', 'monaco-editor'],
  },
})
```

---

## 阶段 C：新建 `postcss.config.js`

**文件**：`app/renderer/src/main/postcss.config.js`（新增）

> CRA 内置 postcss 会自动加载 Tailwind，Vite 需显式声明。

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    'postcss-normalize': {},
  },
}
```

---

## 阶段 D：HTML 模板迁移

Vite 约定 HTML 入口放在**项目根目录**（非 `public/`），`public/` 仅放静态资源。

### D.1 `public/index.html` → `index.html`（项目根目录）

**新建文件**：`app/renderer/src/main/index.html`

基于原 `public/index.html` 内容，做以下改动：
1. 全部 `%PUBLIC_URL%/` 替换为 `./`（favicon、logo192、manifest）
2. 在 `<div id="root">...</div>` 之后、`</body>` 之前，新增入口 script：
   ```html
   <script type="module" src="/src/index.tsx"></script>
   ```
3. 保留内联 `<style>`（spinner 动画）和判断子窗口的内联 `<script>`
4. 删除 CRA 的注释块（关于 `%PUBLIC_URL%` 说明的那些）

**完整目标内容**：

```html
<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="./favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Yakit" />
    <meta name="referrer" content="no-referrer" />
    <link rel="apple-touch-icon" href="./logo192.png" />
    <link rel="manifest" href="./manifest.json" />
    <link rel="stylesheet" href="./initial-loading.css" />
    <title id="app-html-title">Loading</title>
    <style>
      html,
      body {
        height: 100vh;
        margin: 0;
        padding: 0;
      }

      #initial-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: var(--yakit-colors-Neutral-0);
      }

      #initial-loading span {
        margin-right: 10px;
        font-size: 24px;
        color: var(--yakit-colors-Neutral-80);
      }

      #initial-loading .initial-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid var(--yakit-colors-Neutral-40);
        border-top: 2px solid var(--yakit-colors-Neutral-80);
        border-radius: 50%;
        animation: initial-spinner 0.8s linear infinite;
        box-sizing: border-box;
      }

      @keyframes initial-spinner {
        0% {
          transform: rotate(0deg);
        }

        100% {
          transform: rotate(360deg);
        }
      }
    </style>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root">
      <script>
        // 判断是否子窗口
        const isChild = window.location.search.includes('window=child')
        if (isChild) {
          document.write(`
        <div id="initial-loading">
          <span>正在加载中</span>
          <div class="initial-spinner"></div>
        </div>
      `)
        }
      </script>
    </div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

### D.2 `public/yakit-aux.html` → `yakit-aux.html`（项目根目录）

**新建文件**：`app/renderer/src/main/yakit-aux.html`

基于原 `public/yakit-aux.html`，做以下改动：
1. `%PUBLIC_URL%/favicon.ico` → `./favicon.ico`
2. 在 `<div id="root">...</div>` 之后新增入口 script：
   ```html
   <script type="module" src="/src/auxWindow/aux-entry.tsx"></script>
   ```
3. 保留内联 loading 样式

**完整目标内容**：

```html
<!doctype html>
<html lang="zh-cn" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="./favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Yakit Aux Window" />
    <meta name="referrer" content="no-referrer" />
    <title>Yakit</title>
    <style>
      html,
      body {
        height: 100vh;
        margin: 0;
        padding: 0;
      }

      #initial-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: var(--yakit-colors-Neutral-0, #fff);
      }

      #initial-loading span {
        margin-right: 10px;
        font-size: 16px;
        color: var(--yakit-colors-Neutral-80, #868c97);
      }

      #initial-loading .initial-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--yakit-colors-Neutral-40, #ccd0d6);
        border-top: 2px solid var(--yakit-colors-Neutral-80, #868c97);
        border-radius: 50%;
        animation: initial-spinner 0.8s linear infinite;
        box-sizing: border-box;
      }

      @keyframes initial-spinner {
        0% {
          transform: rotate(0deg);
        }

        100% {
          transform: rotate(360deg);
        }
      }
    </style>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root">
      <div id="initial-loading">
        <span>正在加载</span>
        <div class="initial-spinner"></div>
      </div>
    </div>
    <script type="module" src="/src/auxWindow/aux-entry.tsx"></script>
  </body>
</html>
```

### D.3 删除原 HTML

- 删除 `app/renderer/src/main/public/index.html`
- 删除 `app/renderer/src/main/public/yakit-aux.html`

> `public/` 下其余文件（favicon.ico、logo192.png、logo512.png、manifest.json、robots.txt、initial-loading.css、icons/、locales/）**保持原位不动**，Vite 会原样拷贝到 outDir 根。

---

## 阶段 E：源码必要改动（仅 3 个文件）

### E.1 `src/index.css`（第 1 行）

```diff
- @import '~antd/dist/antd.css';
+ @import 'antd/dist/antd.css';
```

> Vite 的 CSS 处理不支持 webpack sass-loader 的 `~` 前缀。

### E.2 `src/index.tsx`（重写 MonacoEnvironment）

**找到**这段代码（约第 24-48 行）：

```ts
const MONACO_WORKER_BASE = 'static/js/monaco'

window.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    switch (label) {
      case 'json':
        return `${MONACO_WORKER_BASE}/json.worker.js`
      case 'yaml':
        return `${MONACO_WORKER_BASE}/yaml.worker.js`
      case 'java':
        return `${MONACO_WORKER_BASE}/java.worker.js`
      case 'go':
        return `${MONACO_WORKER_BASE}/go.worker.js`
      case 'html':
      case 'markdown':
        return `${MONACO_WORKER_BASE}/html.worker.js`
      case 'css':
        return `${MONACO_WORKER_BASE}/css.worker.js`
      default:
        return `${MONACO_WORKER_BASE}/editor.worker.js`
    }
  },
}
```

**替换为**（在文件顶部 import 区，其他 import 之后，新增 worker 导入；并重写 MonacoEnvironment）：

```ts
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

window.MonacoEnvironment = {
  getWorker(_, label) {
    switch (label) {
      case 'json':
        return new jsonWorker()
      case 'css':
        return new cssWorker()
      case 'html':
      case 'markdown':
        return new htmlWorker()
      case 'typescript':
      case 'javascript':
        return new tsWorker()
      // go / java / yaml 非 Monaco 内置语言，原 webpack 版也无独立 worker，走 editor worker 兜底
      default:
        return new editorWorker()
    }
  },
}
```

> 说明：原 CRA 版的 `yaml/java/go.worker.js` 其实也是 MonacoWebpackPlugin 按基础 editor worker 生成的（Monaco 并没有这些语言的独立 worker），所以兜底到 `editor.worker` 行为一致。

### E.3 `src/react-app-env.d.ts`

```diff
- /// <reference types="react-scripts" />
+ /// <reference types="vite/client" />
```

> 保留文件中其余的 CSS/SCSS 模块声明（`declare module '*.css'` 等）不动。

---

## 阶段 F：scripts 改写

**文件**：`app/renderer/src/main/package.json` 的 `scripts` 字段

**规则**：所有 `react-app-rewired start` → `vite`，所有 `react-app-rewired build` → `vite build`。保留 `env-cmd` 包装结构。

### F.1 dev 类脚本

```jsonc
"electron-render": "env-cmd -e noBrouser,devTool -f ./.env-cmdrc vite",
"electron-render-enterprise": "env-cmd -e noBrouser,devTool,enterprise -f ./.env-cmdrc vite",
"electron-render-simple-enterprise": "env-cmd -e noBrouser,devTool,simpleEE -f ./.env-cmdrc vite",
"electron-render-irify": "env-cmd -e noBrouser,devTool,irify -f ./.env-cmdrc vite",
"electron-render-irify-enterprise": "env-cmd -e noBrouser,devTool,irifyEnterprise -f ./.env-cmdrc vite",
"electron-render-memfit": "env-cmd -e noBrouser,devTool,memfit -f ./.env-cmdrc vite",
```

### F.2 build 类脚本

```jsonc
"build": "cross-env GENERATE_SOURCEMAP=false vite build",
"build-test": "env-cmd -e devTool -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-enterprise": "env-cmd -e enterprise -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-enterprise-no-license": "env-cmd -e enterprise,enterpriseNoLicense -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-enpritrace": "env-cmd -e enterprise -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-test-enterprise": "env-cmd -e enterprise,devTool -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-test-enterprise-no-license": "env-cmd -e enterprise,devTool,enterpriseNoLicense -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-simple-enterprise": "env-cmd -e simpleEE -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-irify": "env-cmd -e irify -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-memfit": "env-cmd -e memfit -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-irify-enterprise": "env-cmd -e irifyEnterprise -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-enpritrace-agent": "env-cmd -e simpleEE -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-test-simple-enterprise": "env-cmd -e simpleEE,devTool -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-test-irify": "env-cmd -e irify,devTool -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-test-irify-enterprise": "env-cmd -e irifyEnterprise,devTool -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-test-memfit": "env-cmd -e memfit,devTool -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
"build-breachtrace": "env-cmd -e breachtrace -f ./.env-cmdrc cross-env GENERATE_SOURCEMAP=false vite build",
```

### F.3 其他脚本

```jsonc
// 删除（CRA 专用）
- "eject": "react-app-rewired eject",

// test 暂保留（本次不迁移测试框架），如 react-app-rewired 已移除导致无法运行，改为：
"test": "vitest",   // 或保留原值待后续单独迁移

// analyzer 改用 vite（rollup-plugin-visualizer 可后续按需加），暂改为普通 build：
"analyzer": "cross-env REACT_APP_ANALYZER=true vite build",

// 保留不动
"cli": "node scripts/cli.js",
"postinstall": "patch-package",
"release-render": "node scripts/release-render.js",
```

> 注意：`BROWSER`、`GENERATE_SOURCEMAP` 这两个 env var 会被 Vite 忽略（无害），保留是为了脚本结构最小改动；后续可清理。

---

## 阶段 G：删除 `config-overrides.js`

**文件**：`app/renderer/src/main/config-overrides.js`（删除）

> 功能已完全由 `vite.config.ts` 取代。删除前确认阶段 B 的 vite.config.ts 已覆盖以下原 config-overrides 的所有能力：
> - [x] `@` 别名
> - [x] 双 entry（main + aux）
> - [x] 产物输出到 `pages/main/`
> - [x] `base: './'`
> - [x] Monaco（改用 `?worker`，见阶段 E.2）
> - [x] Node polyfill（`vite-plugin-node-polyfills`）
> - [x] vendor 分组（`manualChunks`）
> - [x] CSS Modules 命名（`generateScopedName`）
> - [x] sourcemap 关闭（`build.sourcemap: false`）

---

## 验证清单（阶段 H）

执行完 A-G 后，按顺序验证：

### H.1 安装依赖

```bash
cd app/renderer/src/main
yarn install
```

**预期**：无报错，`postinstall`（patch-package）正常执行。

### H.2 dev server

```bash
yarn electron-render
```

**预期**：
- Vite 在 `http://127.0.0.1:3000` 启动
- 浏览器访问无控制台报错
- 页面正常渲染（非白屏）

### H.3 构建

```bash
yarn build
```

**预期产物**（检查 `app/renderer/pages/main/`）：
- [ ] `index.html` 存在
- [ ] `yakit-aux.html` 存在
- [ ] `assets/` 目录含 JS/CSS
- [ ] `locales/`（中/英/繁翻译）被拷贝
- [ ] `icons/`（文件类型图标）被拷贝
- [ ] `favicon.ico`、`manifest.json`、`initial-loading.css` 被拷贝

### H.4 Electron 集成

在**根目录**执行：

```bash
yarn start-electron
```

**回归验证点**：
- [ ] 主窗口正常加载（非白屏）
- [ ] 子窗口（`window=child`）正常加载
- [ ] aux 辅助窗口正常加载
- [ ] markdown-pdf-print 窗口正常加载
- [ ] Monaco 编辑器各语言高亮正常（json/javascript/go/markdown/html/yaml/java/css）
- [ ] antd 组件样式正常（按钮、菜单、表格、表单）
- [ ] CSS Modules 样式无错位
- [ ] Tailwind 工具类生效
- [ ] i18n 中/英/繁加载正常
- [ ] 路由懒加载（动态 import）正常
- [ ] 各 vendor chunk（vendor-monaco / vendor-streamdown / vendor-milkdown）正常加载

### H.5 多版本构建（按需）

```bash
yarn build-enterprise
yarn build-irify
yarn build-memfit
```

**预期**：各版本产物 `index.html` 中注入的 `process.env.REACT_APP_PLATFORM` 值正确（enterprise / irify / memfit）。

---

## 禁止项（红线）

执行过程中**绝对不能**：

1. ❌ 修改 `app/main/` 下任何文件（主进程）
2. ❌ 修改 `packageScript/` 下任何文件（electron-builder 配置）
3. ❌ 修改根目录 `package.json`
4. ❌ 修改 `app/renderer/engine-link-startup/` 下任何文件（Link 渲染端）
5. ❌ 修改 `app/renderer/src/main/.env-cmdrc`
6. ❌ 在 `package.json` 添加 `"type": "module"`
7. ❌ 改动 `app/renderer/pages/main/` 的产物路径（必须保持）
8. ❌ 改动 dev 端口（必须保持 3000）
9. ❌ 提交 git（除非用户明确要求）
10. ❌ 删除 `public/` 下的静态资源（favicon、locales、icons 等）

---

## 完成标准

全部满足才算迁移完成：

1. ✅ `app/renderer/src/main/` 内文件按 A-G 全部处理
2. ✅ `yarn electron-render` 在 `:3000` 启动无报错
3. ✅ `yarn build` 产物输出到 `app/renderer/pages/main/`，含 `index.html` + `yakit-aux.html`
4. ✅ 根目录 `yarn start-electron` 能正常加载主/子/aux 三类窗口
5. ✅ Monaco / antd / CSS Modules / Tailwind / i18n / 懒加载 均正常
6. ✅ 主进程、electron-builder、根脚本、Link 渲染端 零改动

---

## 遇到问题的处理

- **某阶段卡住**：停下，报告当前阶段、错误信息、已尝试的方案，询问用户。
- **发现计划与现状不符**：停下，报告差异，询问用户如何调整。
- **build 报 `Module externalized for browser`**：通常是某三方包需要 Node polyfill，在 `vite-plugin-node-polyfills` 的 `include` 或 `globals` 中补充，报告并继续。
- **Monaco 某语言高亮异常**：检查是否项目自定义注册了该语言（`monaco.languages.register`），按需补充对应 worker 或保持 editor worker 兜底（与原行为一致）。
- **样式错位**：检查 `generateScopedName` 输出是否与原 `[name]_[local]_[hash:base64:5]` 一致，必要时调整模板。