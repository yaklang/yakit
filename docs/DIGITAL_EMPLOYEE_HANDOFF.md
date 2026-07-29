# 数字员工功能交接文档

更新时间：2026-07-29 15:52

## 1. 当前目标

Memfit 启动并连接引擎后，先展示“选择你的数字员工”页面。用户确认员工后进入 AI Agent：

- 左侧：8 名数字员工列表，可切换员工
- 中上：当前员工介绍与技能标签
- 中下：精简后的 AI ReAct 聊天区
- 聊天首次启动参数必须携带当前员工对应 AIForge 的真实 `ForgeName`

选择页应按 1280×720 参考稿还原，并使用 `app/renderer/src/main/src/assets/newAssets/` 中已拆分的 `senso-*` 素材组合，禁止使用完整 UI 截图作为背景。

## 2. 已完成的核心功能

### 2.1 数字员工模型与 Forge 解析

目录：`app/renderer/src/main/src/pages/digitalEmployee/`

- `config.ts`
  - 维护固定顺序的 8 名员工
  - `ForgeVerboseName` 分别为：
    1. 威胁分析专家
    2. 渗透测试专家
    3. 运营服务管家
    4. 数字猎手
    5. 数字情报官
    6. 首席信息安全官
    7. 数字教师
    8. 应急响应专家
- `resolver.ts`
  - `findForgeByVerboseName` 对 `ForgeVerboseName` 做 trim 后精确匹配
  - `applyForgeNameToStartParams` 将真实 `ForgeName` 写入 AI 启动参数
- `DigitalEmployeeContext.tsx`
  - 引擎连接后通过 `grpcQueryAIForge` 查询技能库
  - 普通模糊匹配技能不会进入员工列表
  - 未匹配员工状态为 `missing`，不可确认
  - 选择只保存在当前渲染进程，不持久化

### 2.2 启动选择门控

文件：`app/renderer/src/main/src/components/layout/UILayout.tsx`

- `DigitalEmployeeProvider` 包裹 UILayout
- Memfit 引擎连接、项目与许可证检查完成后：
  - 未确认员工：渲染 `DigitalEmployeeSelectPage`
  - 已确认员工：渲染原 `props.children`
- 非 Memfit 版本继续使用原流程

### 2.3 AI Agent 工作区

涉及文件：

- `pages/ai-agent/AIAgent.tsx`
- `pages/ai-agent/AIAgent.module.scss`
- `pages/digitalEmployee/DigitalEmployeeWorkspace.tsx`
- `pages/digitalEmployee/DigitalEmployeeWorkspace.module.scss`

当前实现：

- 左侧主栏替换为数字员工列表
- “会话与设置”保留为次级可展开入口
- 顶部员工介绍读取员工配置与 `AIForge.Description/Tag`
- 切换员工时发送 `NEW_CHAT`，旧会话仍保留历史
- 原底部详情栏不再占据主工作区

### 2.4 聊天精简与 Forge 绑定

涉及文件：

- `pages/ai-agent/aiChatWelcome/AIChatWelcome.tsx`
- `pages/ai-agent/aiChatWelcome/AIChatWelcome.module.scss`
- `pages/ai-agent/aiChatContent/AIChatContent.tsx`
- `pages/ai-agent/aiChatContent/AIChatContent.module.scss`
- `pages/ai-agent/template/template.tsx`
- `pages/ai-agent/template/type.ts`
- `pages/ai-re-act/aiReActChat/AIReActChat.tsx`

当前实现：

- 数字员工模式移除欢迎页推荐广场与资源抽屉
- 数字员工模式绕过任务树、HTTP、风险等主分栏
- 隐藏非必要 Plan 开关，保留消息、发送、附件等能力
- `AIReActChat` 创建会话时将当前员工真实 `ForgeName` 写入 `AIStartParams`
- `AISession.StartParams` 也会保存该 `ForgeName`

## 3. 最新素材替换进度

上一位子代理已开始修改，但执行被中断。当前已经落盘的改动包括：

- `config.ts` 已改用：
  - `senso-agent-01-portrait-transparent.png` 至 `08`
  - `senso-agent-01-badge.png` 至 `08`
- `DigitalEmployeeSelectPage.tsx` 已引用：
  - `senso-brand-logo.png`
  - `senso-header-title-strip.png`
  - `senso-pagination.png`
  - `senso-card-frame-normal.png`
  - `senso-card-selected-overlay-border-button-text.png`
  - 6 个快捷导航图标
- `DigitalEmployeeSelectPage.module.scss` 已引用：
  - `senso-page-background-1280x720.png`
  - `senso-button-select-bg.png`
  - `senso-button-confirm-bg.png`
  - `senso-quick-nav-bg.png`

素材用途与尺寸见：

`app/renderer/src/main/src/assets/newAssets/senso-assets-manifest.json`

## 4. 必须继续检查和修复

### 4.1 默认选中第一位员工

当前 `DigitalEmployeeContext.tsx` 的 `selectedId` 初始值仍可能是 `undefined`。

应改为默认选中 `DIGITAL_EMPLOYEES[0].id`，同时保持“技能未安装时确认按钮不可用”。

### 4.2 hover/selected 状态

当前 JSX 仅对第一张卡渲染 `senso-card-selected-overlay-border-button-text.png`：

```tsx
{firstEmployee && (
  <img className={styles['selected-overlay']} src={selectedOverlay} alt="" aria-hidden="true" />
)}
```

需要确认最终行为满足：

- 任意卡片 hover 都有蓝色发光边框和“选择 TA / 进入”
- 已选中卡片移出后仍保持选中态
- 未选中卡片移出后恢复普通态
- 卡片大小和占位不变，不产生布局跳动
- 覆盖层 `position: absolute`
- 覆盖层 `pointer-events: none`
- 覆盖层等比例缩放，不能拉伸

注意：`senso-card-selected-overlay-border-button-text.png` 含第一张卡固定文字。第 2—8 张不能显示该固定文字。推荐做法：

- 第一张可使用该透明叠加层
- 第 2—8 张使用 CSS 发光边框
- 编号、名称、描述和按钮全部由各自 DOM 文本渲染

### 4.3 标题可维护性

当前标题使用带完整文字的 `senso-header-title-strip.png`。用户明确要求“优先无文字背景，文字用 DOM”，后续应评估改成背景装饰 + DOM 标题和说明，便于国际化。

### 4.4 透明人物白边

在实际背景上逐张检查 8 个透明 PNG。如白边明显，将对应员工改用：

`senso-agent-XX-portrait-original.png`

不要整批盲目切换。

### 4.5 清理旧临时素材

旧目录：

`app/renderer/src/main/src/assets/digitalEmployees/`

其中 8 张人物是从低分辨率参考截图裁出的临时回退素材。确认 `config.ts` 和页面不再引用后，可删除旧人物和旧 logo；删除前先全局搜索引用。

## 5. 验证状态

已通过：

```text
yarn test:vitest run app/renderer/src/main/src/pages/digitalEmployee/__test__/resolver.test.ts
Test Files 1 passed
Tests 4 passed
```

测试覆盖：

- `ForgeVerboseName` 精确匹配
- 模糊结果不会误匹配
- 空名称安全处理
- 选中员工 `ForgeName` 注入启动参数

完整 Memfit 构建历史：

1. 首次构建因 `PaginationSchema` 使用了错误字段 `Sort` 失败，已改为 `Order`
2. 第二次构建因环境变量 `CI=true` 将项目原有大量 warning 当作 error，未发现新增 TypeScript 错误
3. 当前有一条构建命令曾启动：

```powershell
$env:CI="false"
$env:NODE_OPTIONS="--max-old-space-size=8192"
yarn build-render-memfit
```

交接时该构建仍处于 `Creating an optimized production build...`。它启动在素材替换修改之前，因此即使成功，也不能作为最新代码的最终验证。接手后先检查进程是否仍运行，避免重复启动；素材改完后必须重新构建。

## 6. 运行环境注意事项

- Windows 保留端口范围包含 `2910-3009`，默认端口 `3000` 无法使用
- 主渲染开发端口使用 `2800`
- 启动页 Vite 端口使用 `5173`
- 本地代理端口为 `10808`
- Electron 开发模式已增加 `no-proxy-server`
- `app/main/security.js` 已将 `2800` 加入可信开发端口
- `app/main/index.js` 支持环境变量 `YAKIT_DEV_RENDERER_URL`
- 主渲染开发服务曾因 Node 4GB 堆上限 OOM，启动时建议：

```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"
```

## 7. 下一位开发者建议执行顺序

1. 检查并结束遗留构建进程，或等待其完成
2. 阅读 `senso-assets-manifest.json`
3. 检查当前 `DigitalEmployeeSelectPage.tsx/.module.scss`
4. 修复默认选中第一位员工
5. 完成 8 张卡片 hover/selected/mouseleave 状态
6. 确认第 2—8 张没有显示第一张固定文字
7. 在 1280×720、1024×576 和常见桌面尺寸检查：
   - 无横向溢出
   - 无布局跳动
   - 人物不被叠加层遮挡
   - 所有文字不串位
8. 运行 Prettier、数字员工测试和最新 Memfit 构建
9. 启动 Electron 人工检查选择、确认、员工切换和聊天
10. 更新 `docs/DEV_LOG.md`

## 8. 相关文件总览

新增：

- `app/renderer/src/main/src/pages/digitalEmployee/config.ts`
- `app/renderer/src/main/src/pages/digitalEmployee/resolver.ts`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeContext.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.module.scss`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.module.scss`
- `app/renderer/src/main/src/pages/digitalEmployee/__test__/resolver.test.ts`

修改：

- `app/renderer/src/main/src/components/layout/UILayout.tsx`
- `app/renderer/src/main/src/pages/ai-agent/AIAgent.tsx`
- `app/renderer/src/main/src/pages/ai-agent/AIAgent.module.scss`
- `app/renderer/src/main/src/pages/ai-agent/aiChatWelcome/AIChatWelcome.tsx`
- `app/renderer/src/main/src/pages/ai-agent/aiChatWelcome/AIChatWelcome.module.scss`
- `app/renderer/src/main/src/pages/ai-agent/aiChatContent/AIChatContent.tsx`
- `app/renderer/src/main/src/pages/ai-agent/aiChatContent/AIChatContent.module.scss`
- `app/renderer/src/main/src/pages/ai-agent/template/template.tsx`
- `app/renderer/src/main/src/pages/ai-agent/template/type.ts`
- `app/renderer/src/main/src/pages/ai-re-act/aiReActChat/AIReActChat.tsx`
- `app/main/index.js`
- `app/main/security.js`
- `docs/DEV_LOG.md`

仓库当前 git 状态会将大量原有文件显示为 untracked，不要执行 `git clean`、`reset --hard` 或其他清理命令。
