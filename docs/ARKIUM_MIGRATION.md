# Arkium Migration Guide

本文档描述在同一 `yakit` 代码库中维护 **Yakit** 与 **Arkium** 两条产品线的架构、差异与演进计划。Arkium 是面向海外 Burp 用户的 Web/API 安全测试发行版，不是一次性 fork，而是长期通过 **Brand / Edition / i18n** 三层抽象演进。

---

## 1. Arkium 与 Yakit 的差异

| 维度 | Yakit | Arkium |
|------|-------|--------|
| 品牌 | Yaklang / Yakit | Arkium Tech LLC / Arkium |
| 默认语言 | zh-CN | en-US |
| 构建变量 | 默认（无 `REACT_APP_BRAND`） | `REACT_APP_BRAND=arkium`, `REACT_APP_EDITION=arkium` |
| 导航 | 完整专家/扫描菜单 + ExtraMenu | 固定 6 项核心导航，无 ExtraMenu |
| 首页 | Yakit Home | Arkium Welcome |
| 首次进主窗口 | 生产环境需选项目 | 自动进入 Default Project → Welcome |
| 核心命名 | MITM / WebFuzzer / PoC / Plugin Hub | Proxy / History / Repeater / Scanner / Extensions / Projects |
| Send 动作文案 | Send to Web Fuzzer | Send to Repeater（仅用户可见 label） |
| 官网 / GitHub | yaklang.com / yaklang/yakit | arkium.app / Arkiumapp |

**底层不变**：引擎仍为 Yaklang Engine；`YakitRoute`、业务页面、IPC、数据库结构均未 fork。

---

## 2. Edition 架构设计原则

### 2.1 三层抽象

```
┌─────────────────────────────────────────────────────────┐
│  Brand（品牌外壳）                                        │
│  REACT_APP_BRAND → 产品名、Logo、官网、默认语言            │
├─────────────────────────────────────────────────────────┤
│  Edition（功能集合）                                      │
│  REACT_APP_EDITION → featureFlags、导航白名单、门禁策略    │
├─────────────────────────────────────────────────────────┤
│  i18n（文案层）                                           │
│  product / startup 命名空间 → 导航、Welcome、Actions      │
└─────────────────────────────────────────────────────────┘
         ↓ 均映射到现有 YakitRoute + 业务组件，零重写
```

### 2.2 设计约束（长期遵守）

1. **不 fork 仓库、不重写业务页**：Arkium 差异优先落在 `config/brand/`、导航层、i18n、壳组件。
2. **Yakit 默认行为不变**：所有 Arkium 逻辑必须 `isArkiumEdition()` / `isArkiumBrand()` 守卫；未指定构建变量时等同 Yakit。
3. **Edition 与商业发行版正交**：`REACT_APP_EDITION=arkium`（功能集合）与 `REACT_APP_PLATFORM`（CE/EE/IRify 等）互不替代。
4. **导航映射 ≠ 路由重命名**：Burp 术语（Proxy/Repeater）仅出现在导航与 product i18n；`YakitRoute`、IPC `type: 'fuzzer'` 等内部标识保持稳定。
5. **Hide 与 Block 分离**：菜单隐藏（ExtraMenu、HeardMenu 白名单）与 Route Guard（待实现）应分层，避免仅改 UI 仍被 deep link 绕过。
6. **配置集中化**：新增 Arkium 能力时优先扩展 `brandConfig.ts`、`featureFlags.ts`、`arkiumNav.ts`，避免散落硬编码。

### 2.3 构建与开发

```bash
# Yakit（行为与改造前一致）
yarn dev:yakit
yarn build:yakit

# Arkium
yarn dev:arkium
yarn build:arkium
```

主渲染端 profile：`app/renderer/src/main/.env-cmdrc` → `arkium`  
引擎连接窗 profile：`app/renderer/engine-link-startup/.env.arkium`

---

## 3. 已实现功能（Phase 1 / Sprint 1A–1B）

### 3.1 Brand 与构建

- [x] `brandConfig.ts`：yakit / arkium 双品牌配置
- [x] 根 `package.json`：`dev:yakit` / `dev:arkium` / `build:yakit` / `build:arkium`
- [x] `.env-cmdrc` arkium profile；engine-link `.env.arkium`
- [x] Logo 切换（启动窗、主窗口 FuncDomain、NewYakitLoading）
- [x] 官网 / GitHub 按 brand 切换（HelpDoc、DownloadYakit、website.ts）

### 3.2 Edition 与导航

- [x] `featureFlags.ts`：Arkium 关闭 yakScript / advancedTools / experimentalFeatures
- [x] `arkiumNav.ts`：6 项核心导航 + feature flag
- [x] `getArkiumPrivateMenu()`、`HeardMenu` Arkium 固定菜单（禁用自定义菜单）
- [x] `MainOperator`：Arkium 使用 HeardMenu 而非 PublicMenu
- [x] `ArkiumWelcome` 首页 + 默认 Tab / 路由落点

### 3.3 首次体验（Sprint 1A）

- [x] 跳过 Project Management 门禁：`onLinkedEngine` 自动 `getDefaultProjectEx`（失败回退选手页）
- [x] 隐藏 ExtraMenu：HeardMenu / PublicMenu 不渲染 + `getExtraMenu()` 返回 `[]`

### 3.4 Burp 工作流（Sprint 1B）

- [x] History 一级导航（`DB_HTTPHistory`）
- [x] Send to Repeater 用户可见文案（`arkiumCopy.ts` + product `Actions.*`）
- [x] 触点：HTTPFlowTable、HTTPHistoryFilter、HTTPFlowMiniTable、extraYakitEditor、MITMManual

### 3.5 i18n（部分）

- [x] 主工程 `product` 命名空间（en / zh / zh-TW）
- [x] engine-link-startup `startup` 命名空间 + 局部组件英文化（StartupPage、YakitLoading、LocalEngine）

### 3.6 Arkium 导航顺序与路由映射

| 导航 | YakitRoute | 业务页 |
|------|------------|--------|
| Proxy | `MITMHacker` | MITM 交互式劫持 |
| History | `DB_HTTPHistory` | HTTP History |
| Repeater | `HTTPFuzzer` | Web Fuzzer |
| Scanner | `PoC` | 专项漏洞检测 |
| Extensions | `Plugin_Hub` | 插件仓库 |
| Projects | `YakRunner_Project_Manager` | 项目管理 |

---

## 4. 已修改文件列表

### 4.1 新增

```
app/renderer/src/main/src/config/brand/
  brandConfig.ts
  featureFlags.ts
  arkiumNav.ts
  arkiumCopy.ts

app/renderer/src/main/src/pages/arkiumWelcome/
  ArkiumWelcome.tsx
  ArkiumWelcome.module.scss

app/renderer/src/main/public/locales/{en,zh,zh-TW}/product.json
app/renderer/src/main/src/assets/arkiumLogo.png

app/renderer/engine-link-startup/.env.arkium
app/renderer/engine-link-startup/public/locales/{en,zh,zh-TW}/startup.json
app/renderer/engine-link-startup/src/i18n/i18n.ts
app/renderer/engine-link-startup/src/i18n/useI18nNamespaces.ts
app/renderer/engine-link-startup/src/assets/Arkiumlogo.png
app/renderer/engine-link-startup/src/assets/ArkiumLogoDark.png
app/renderer/engine-link-startup/src/assets/Arkium-right.png

docs/ARKIUM_MIGRATION.md
```

### 4.2 修改

```
package.json
app/renderer/src/main/.env-cmdrc
app/renderer/src/main/package.json
app/renderer/src/main/src/utils/envfile.tsx
app/renderer/src/main/src/i18n/i18n.ts
app/renderer/src/main/src/enums/website.ts
app/renderer/src/main/src/routes/newRoute.tsx
app/renderer/src/main/src/pages/MainOperator.tsx
app/renderer/src/main/src/pages/layout/HeardMenu/HeardMenu.tsx
app/renderer/src/main/src/pages/layout/publicMenu/PublicMenu.tsx
app/renderer/src/main/src/pages/layout/mainOperatorContent/MainOperatorContent.tsx
app/renderer/src/main/src/components/layout/UILayout.tsx
app/renderer/src/main/src/components/layout/FuncDomain.tsx
app/renderer/src/main/src/components/layout/HelpDoc/HelpDoc.tsx
app/renderer/src/main/src/components/layout/update/DownloadYakit.tsx
app/renderer/src/main/src/components/basics/NewYakitLoading.tsx
app/renderer/src/main/src/components/HTTPFlowTable/HTTPFlowTable.tsx
app/renderer/src/main/src/components/HTTPFlowMiniTable.tsx
app/renderer/src/main/src/components/yakitUI/YakitEditor/extraYakitEditor.tsx
app/renderer/src/main/src/pages/hTTPHistoryAnalysis/HTTPHistory/HTTPHistoryFilter.tsx
app/renderer/src/main/src/pages/mitm/MITMManual/MITMManual.tsx

app/renderer/engine-link-startup/package.json
app/renderer/engine-link-startup/yarn.lock
app/renderer/engine-link-startup/src/main.tsx
app/renderer/engine-link-startup/src/utils/envfile.tsx
app/renderer/engine-link-startup/src/pages/StartupPage/index.tsx
app/renderer/engine-link-startup/src/pages/StartupPage/components/YakitLoading/index.tsx
app/renderer/engine-link-startup/src/pages/StartupPage/components/LocalEngine/index.tsx
```

---

## 5. 待实现功能

### 5.1 P0 — 产品边界

- [ ] **Route Guard**：`arkiumRoutes.ts` allowlist；拦截 `openMenuPage` / `openPage` / `fetch-send-to-tab`
- [ ] **Settings 菜单裁剪**：Arkium 版 `UIOpSetting` 仅保留语言、连接、项目、快捷键、系统配置、日志等
- [ ] **pageCache sanitize**：启动时过滤非 allowlist 的已缓存 Tab
- [ ] 移除或禁用 **YakChatCS**、MessageCenter 等国内运营入口

### 5.2 P1 — Burp 心智对齐

- [ ] 页面层标题重命名（MITM → Proxy UI、WebFuzzer → Repeater UI、PoC → Scanner UI）
- [ ] Scanner 与 **Risks/Reports** 结果流统一
- [ ] Welcome Quick Start（代理 → 证书 → Repeater）
- [ ] 去掉或弱化 Welcome footer「Built on Yaklang Engine」
- [ ] 项目管理页 / 临时项目标题 Arkium 品牌化

### 5.3 P1 — i18n 与启动体验

- [ ] engine-link-startup 剩余组件 i18n（WatchDog、RemoteEngine、AgreementContentModal 等）
- [ ] 启动连接日志英文化
- [ ] Arkium 英文用户协议
- [ ] 主窗口 loading slogans 专业化（替换 Yakit 社区梗）
- [ ] 英文资源中 `Yakit` / `yakit-projects` 路径文案清扫

### 5.4 P2 — 视觉与发布

- [ ] Arkium 独立视觉主题（替换橙色 Yakit 皮肤）
- [ ] 生产打包 / CI 矩阵（`build:arkium` 流水线）
- [ ] 独立应用图标与安装包命名
- [ ] 文档站与 Help 链接 Arkium 化

---

## 6. 关键源码入口（维护者速查）

| 用途 | 路径 |
|------|------|
| 品牌配置 | `app/renderer/src/main/src/config/brand/brandConfig.ts` |
| 功能开关 | `app/renderer/src/main/src/config/brand/featureFlags.ts` |
| 导航映射 | `app/renderer/src/main/src/config/brand/arkiumNav.ts` |
| Send 文案 | `app/renderer/src/main/src/config/brand/arkiumCopy.ts` |
| 产品 i18n | `app/renderer/src/main/public/locales/*/product.json` |
| 项目门禁 | `app/renderer/src/main/src/components/layout/UILayout.tsx` → `onLinkedEngine` |
| 菜单壳 | `app/renderer/src/main/src/pages/layout/HeardMenu/HeardMenu.tsx` |
| Welcome | `app/renderer/src/main/src/pages/arkiumWelcome/ArkiumWelcome.tsx` |

---

## 7. 版本记录

| 阶段 | 分支 | 说明 |
|------|------|------|
| Phase 1 | `feature/arkium-v1` | Brand / Edition / 导航 / Welcome / 1A 门禁与 ExtraMenu / 1B History + Send to Repeater |

---

*最后更新：Arkium Alpha Phase 1 完成时。*
