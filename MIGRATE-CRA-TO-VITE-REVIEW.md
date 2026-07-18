# 主渲染端 CRA → Vite 迁移评估文档

| 项 | 内容 |
| --- | --- |
| 主题 | 把主渲染端 `app/renderer/src/main/` 从 CRA（Create React App）迁移到 Vite |
| 评审日期 | 2026-07-18 |
| 涉及模块 | `app/renderer/src/main/`（主渲染端，dev 端口 3000） |
| 参考样板 | `app/renderer/engine-link-startup/`（Link 渲染端，已完成 Vite 迁移） |

---

## 一、背景与目标

Yakit 是 Electron 桌面应用，包含两个渲染端：

| 渲染端 | 路径 | 当前工具链 | dev 端口 | 产物路径 |
| --- | --- | --- | --- | --- |
| 主渲染端 | `app/renderer/src/main/` | CRA + react-app-rewired + customize-cra | 3000 | `app/renderer/pages/main/` |
| Link 渲染端 | `app/renderer/engine-link-startup/` | **Vite 6**（已迁移） | 5173 | `app/renderer/engine-link-startup/dist/` |

**目标**：把主渲染端从 CRA 迁移到 Vite，与 Link 渲染端技术栈对齐，获得更快的冷启动与 HMR，并解除 CRA/react-scripts 5（已停止维护）的依赖锁定。

**约束**：迁移改动必须**完全隔离**在 `app/renderer/src/main/` 目录内，不得触碰 Electron 主进程、electron-builder 打包配置、根目录脚本、Link 渲染端。

---

## 二、现状分析

### 2.1 当前工具链

- `react-scripts@5.0.1`（CRA 底座，位于 dependencies）
- `react-app-rewired@^2.1.8` + `customize-cra@^1.0.0`（CRA 配置覆盖）
- `env-cmd` + `.env-cmdrc`（多版本环境变量注入）
- 30 条 scripts 全部走 `react-app-rewired start|build`

### 2.2 关键配置（`config-overrides.js`，218 行）

| 能力 | 实现方式 | Vite 对应 |
| --- | --- | --- |
| 双 entry（main + aux） | HtmlWebpackPlugin × 2 | `rollupOptions.input` |
| 产物输出到 `pages/main/` | 改 `paths.appBuild` + `output.path` | `build.outDir` |
| 相对路径 `publicPath: './'` | webpack output.publicPath | `base: './'` |
| `@/*` → `src/*` 别名 | `addWebpackAlias` | `resolve.alias` |
| Monaco worker | `MonacoWebpackPlugin` | `?worker` 导入 |
| Node polyfill | `NodePolyfillPlugin` | `vite-plugin-node-polyfills` |
| vendor 分组 | splitChunks cacheGroups | `manualChunks` |
| CSS Modules 命名 | `localIdentName: '[name]_[local]_[hash:base64:5]'` | `css.modules.generateScopedName` |
| antd 按需加载 | `fixBabelImports` | 移除（antd 4 已支持 tree-shaking） |
| dev 写磁盘 | `devMiddleware.writeToDisk: true` | Vite dev 原生按需编译，无需此配置 |
| 打包进度条 | `ProgressBarPlugin` | Vite 内建进度 |

### 2.3 入口与 HTML

- 主入口：`src/index.tsx` + `public/index.html`（含 `%PUBLIC_URL%` 占位符 × 3）
- 辅助入口：`src/auxWindow/aux-entry.tsx` + `public/yakit-aux.html`（含 `%PUBLIC_URL%` × 1）
- `index.html` 含内联 `<script>`（判断子窗口 loading）与内联 `<style>`（spinner 动画）

### 2.4 CRA 特有引用统计（改动量评估）

| 类别 | 数量 | 位置 |
| --- | --- | --- |
| `%PUBLIC_URL%` | 4 处 | 2 个 HTML 模板 |
| `~antd/dist/antd.css`（webpack sass 语法） | 1 处 | `src/index.css:1` |
| `process.env.REACT_APP_*`（应用源码） | 3 处 | `envfile.tsx`、`EnterpriseJudgeLogin.tsx` |
| `process.env.NODE_ENV`（应用源码） | 0 处 | 仅 vendored `ali-react-table-dist` |
| `require.context` / `module.hot` / `__DEV__` / webpack 魔法注释 | 0 处 | — |
| `window.require('electron')` | 306 处 | **无需改动**（浏览器端 require，非 CommonJS） |

> 结论：CRA 特有引用极少，迁移源码改动集中在 3 个文件。

### 2.5 主进程对主渲染端的引用（迁移后必须保持兼容）

| 文件 | dev 引用 | prod 引用 |
| --- | --- | --- |
| `app/main/index.js:249-250` | `loadURL('http://127.0.0.1:3000')` | `loadFile('../renderer/pages/main/index.html')` |
| `app/main/handlers/assets.js:1021-1023` | `loadURL('http://127.0.0.1:3000/?...')` | `loadFile('../../renderer/pages/main/index.html')` |
| `app/main/handlers/auxWindowManager/AuxWindowManager.js:7,72` | `loadURL('http://127.0.0.1:3000/yakit-aux.html?...')` | `loadFile('../../../renderer/pages/main/yakit-aux.html')` |
| `app/main/handlers/openNewChildWindow/index.js:125-127` | `loadURL('http://127.0.0.1:3000/?window=child')` | `loadFile('../../../renderer/pages/main/index.html')` |

> 共 4 处 `:3000` 端口引用 + 4 处 `pages/main/` 产物路径引用。

### 2.6 electron-builder 打包配置

`packageScript/electron-builder.config.js` 的 `files` 数组：
- `!app/renderer/src/**/*`（排除主渲染端源码）
- 无显式放行 `pages/main/`（靠 `**/*` 兜底收入）

> 只要产物仍输出到 `app/renderer/pages/main/`，打包配置无需改动。

---

## 三、迁移决策

| 决策项 | 选择 | 理由 |
| --- | --- | --- |
| **产物路径** | 保持 `app/renderer/pages/main/` 不变 | 主进程 4 处 `loadFile`、electron-builder `files` 零改动，影响面完全隔离 |
| **环境变量** | 保留 `env-cmd` + `.env-cmdrc`，通过 Vite `define` 注入 `process.env.REACT_APP_*` | 源码 3 处 `process.env.REACT_APP_*` 零改动，30 条脚本结构不变 |
| **dev 端口** | 保持 3000 | 主进程 4 处 `loadURL` 零改动 |
| **`"type": "module"`** | **不添加** | `scripts/cli.js`、`tailwind.config.js` 均为 CommonJS，加 ESM 会触发连锁重命名 |
| **测试框架** | 本次不迁移（保留 `react-app-rewired test` 或后续单独迁 vitest） | 测试用例少，避免一次改太多 |

---

## 四、改动清单

### 4.1 新增文件

| 文件 | 说明 |
| --- | --- |
| `app/renderer/src/main/vite.config.ts` | Vite 配置（别名、base、双 entry、define、manualChunks、nodePolyfills） |
| `app/renderer/src/main/postcss.config.js` | Tailwind + autoprefixer + postcss-normalize |
| `app/renderer/src/main/index.html` | 从 `public/index.html` 迁移，加 `<script type="module">`，去 `%PUBLIC_URL%` |
| `app/renderer/src/main/yakit-aux.html` | 从 `public/yakit-aux.html` 迁移，同上 |

### 4.2 修改文件

| 文件 | 改动 |
| --- | --- |
| `app/renderer/src/main/package.json` | 依赖增删升级（见 4.4）；scripts 中 `react-app-rewired` → `vite`；删 `eject` |
| `app/renderer/src/main/src/index.css` | 第 1 行 `~antd/dist/antd.css` → `antd/dist/antd.css` |
| `app/renderer/src/main/src/index.tsx` | 重写 `MonacoEnvironment`（从 `getWorkerUrl` 改为 `?worker` 导入） |
| `app/renderer/src/main/src/react-app-env.d.ts` | `/// <reference types="react-scripts" />` → `/// <reference types="vite/client" />` |

### 4.3 删除文件

| 文件 | 说明 |
| --- | --- |
| `app/renderer/src/main/config-overrides.js` | 功能完全由 `vite.config.ts` 取代 |
| `app/renderer/src/main/public/index.html` | 已迁移到根目录 `index.html` |
| `app/renderer/src/main/public/yakit-aux.html` | 已迁移到根目录 `yakit-aux.html` |

### 4.4 依赖调整

**移除（CRA/webpack 专属）**：
`react-scripts`、`react-app-rewired`、`customize-cra`、`monaco-editor-webpack-plugin`、`node-polyfill-webpack-plugin`、`mini-css-extract-plugin`、`progress-bar-webpack-plugin`、`webpack-bundle-analyzer`、`sass-loader`、`sass-resources-loader`、`file-loader`、`source-map-loader`、`babel-plugin-import`
（并删除 `resolutions.react-error-overlay` 这个 CRA 专用 workaround）

**新增**：
- `@vitejs/plugin-react` ^4.0.0
- `vite-plugin-node-polyfills` ^2.0.0
- `autoprefixer` ^10.4.0

**升级（对齐 Link 渲染端）**：
- `vite` 4.4.9 → ^6.0.0
- `vitest` 0.34.6 → ^1.0.4
- `@types/node` ^12 → ^20

**保留**：`env-cmd`、`cross-env`、`sass`、`tailwindcss`、`postcss-normalize`、`patch-package`、`monaco-editor`、`react-monaco-editor`

---

## 五、影响范围与隔离边界

### 5.1 改动范围（仅 `app/renderer/src/main/` 内）

```
app/renderer/src/main/
├── vite.config.ts         (新增)
├── postcss.config.js      (新增)
├── index.html             (新增，从 public/ 迁移)
├── yakit-aux.html         (新增，从 public/ 迁移)
├── package.json           (修改)
├── config-overrides.js    (删除)
├── public/
│   ├── index.html         (删除)
│   └── yakit-aux.html     (删除)
└── src/
    ├── index.css          (修改 1 行)
    ├── index.tsx          (修改 MonacoEnvironment)
    └── react-app-env.d.ts (修改 1 行)
```

### 5.2 明确不改动（隔离边界）

| 文件 | 原因 |
| --- | --- |
| `app/main/index.js` 及 `handlers/*.js` | 端口 3000 / 产物路径 `pages/main/` 均不变 |
| `packageScript/electron-builder.config.js` | `pages/main/` 仍在 `**/*` 兜底范围 |
| 根 `package.json` 所有 scripts | 仅 `cd` 转发，子包脚本名不变 |
| `app/renderer/src/main/.env-cmdrc` | 继续用 env-cmd |
| `app/renderer/engine-link-startup/`（Link 渲染端） | 已是 Vite，无关 |

---

## 六、风险点与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| Monaco 语言 worker（go/java/yaml） | 原由 MonacoWebpackPlugin 生成，新方案走 editor worker 兜底。若项目自定义注册了这些语言，可能高亮异常 | 验证阶段重点回归 Monaco 各语言；如异常，补充对应 `?worker` 导入 |
| Node polyfills 不全 | 个别三方包引用 `Buffer`/`process`/`path`，build 报 `Module externalized for browser` | `vite-plugin-node-polyfills` 默认覆盖主流 polyfill；按报错按需补 |
| CSS Modules 命名不一致 | `generateScopedName: '[name]_[local]_[hash:base64:5]'` 在 Vite 下 `[name]` 可能是相对路径而非文件名 | 验证样式是否错位；必要时调整 `generateScopedName` 模板 |
| xlsx 的 `./cptable` external | CRA 用 webpack externals 处理，Vite 改用 define 或让 xlsx 正常打包 | 若 build 报 cptable 相关错，用 `optimizeDeps.include` 或单独处理 |
| antd 4 按需加载 | CRA 用 `babel-plugin-import`，Vite 移除后全量打包可能增大体积 | antd 4 已支持 tree-shaking，ESM 入口自带按需；验证 bundle 体积可接受 |

---

## 七、验证步骤

### 7.1 构建验证

```bash
cd app/renderer/src/main
yarn install                # 安装新依赖
yarn electron-render        # dev server 应在 :3000 启动，浏览器访问无报错
yarn build                  # 产物应输出到 app/renderer/pages/main/
```

**检查产物**：
- `app/renderer/pages/main/index.html` 存在
- `app/renderer/pages/main/yakit-aux.html` 存在
- `app/renderer/pages/main/assets/` 含 JS/CSS
- `app/renderer/pages/main/locales/`、`icons/` 静态资源被拷贝

### 7.2 Electron 集成验证

```bash
# 根目录
yarn start-electron
```

**回归点**：
- [ ] 主窗口正常加载（非白屏）
- [ ] 子窗口（`window=child`）正常加载
- [ ] aux 辅助窗口正常加载
- [ ] markdown-pdf-print 窗口正常加载
- [ ] Monaco 编辑器各语言高亮正常（json/js/go/markdown/html/yaml/java/css）
- [ ] antd 样式正常（按钮、菜单、表格）
- [ ] CSS Modules 样式无错位
- [ ] Tailwind 类生效
- [ ] i18n 中/英/繁加载正常
- [ ] 路由懒加载正常（动态 import）

### 7.3 多版本验证（按需）

```bash
yarn build-enterprise        # 企业版
yarn build-irify             # irify 版
yarn build-memfit            # memfit 版
```

确认各版本产物 `index.html` 中注入的 `process.env.REACT_APP_PLATFORM` 值正确。

---

## 八、回滚方案

所有改动隔离在 `app/renderer/src/main/` 目录内，若迁移失败：

```bash
git revert <commit-hash>     # 单次提交即可完整回滚
```

无主进程、打包配置、根脚本的副作用需要额外处理。

---

## 九、评审签字

| 角色 | 姓名 | 日期 | 结论（通过/驳回/待修改） |
| --- | --- | --- | --- |
| 评审人 | | | |
| 评审人 | | | |
| 实施人 | | | |

---

## 附：与 Link 渲染端 Vite 实践的对齐情况

| 维度 | Link 渲染端（已迁移） | 主渲染端（本方案） | 是否对齐 |
| --- | --- | --- | --- |
| Vite 版本 | 6.x | 6.x | ✅ |
| `base` | `'./'` | `'./'` | ✅ |
| React 插件 | `@vitejs/plugin-react` | `@vitejs/plugin-react` | ✅ |
| `@` 别名 | `resolve.alias` | `resolve.alias` | ✅ |
| 环境变量 | `.env.[mode]` + `import.meta.env` | `env-cmd` + `define`（保留现状） | ⚠️ 暂不对齐 |
| 产物目录 | `dist/` | `pages/main/`（保留现状） | ⚠️ 暂不对齐 |
| `"type": "module"` | 是 | 否（因 CommonJS 配置文件） | ⚠️ 暂不对齐 |

> 带 ⚠️ 的项为**有意保留差异**，目的是最小化改动面。后续如需全面对齐，可单独评估「env-cmd → .env.*」「pages/main → dist」「CommonJS 配置 → ESM」的二次迁移。