# 开发记录

用于记录本仓库开发过程中的关键改动、问题与处理结论，方便后续追溯。

> 文档路径：`docs/DEV_LOG.md`（使用英文文件名，避免 Windows/资源管理器中文路径显示异常）

记录约定：

- 按时间倒序追加（最新在上）
- 每条包含：日期、事项、改动点、原因/结论
- 与运行环境相关的问题尽量写清端口、代理、路径等关键信息

---

## 2026-07-30

### 数字员工聊天详情与任务进度优化

- **重复消息**：保留原版乐观展示和 IPC 发送链路；`react_task_dequeue` 缺少临时输入 UUID 时，以最近同文未确认问题作为回退进行节点替换，避免单次输入显示两条
- **员工侧栏**：增加展开/收起控制；已有会话详情默认收起，欢迎态默认展开，员工切换仍复用原有新会话事件
- **思考与执行**：数字员工右栏改为直接展示 `casualChat.planDetails.todoList`，移除无数据的工具统计、任务目标和意图卡片
- **状态视觉**：顶部只显示任务进度与百分比；完成为绿色对号、执行中为旋转圆环、待执行为灰色静态圆环，不显示步骤序号与可见状态字样
- **真实信息**：任务辅助信息只使用后端 `updated_at` / `created_at`，兼容秒级和毫秒级时间戳，不构造描述或时间
- **验证**：TypeScript 检查通过；数字员工与消息回显 4 个测试文件、13 个测试通过
- **运行入口纠正**：2800 只是开发端口，AI SenPike 必须使用 `yarn start-render-memfit` 注入 `REACT_APP_PLATFORM=memfit`；普通 `start-render` 会显示同仓库的通用 Yakit 界面

## 2026-07-29

### 数字员工选择页大屏比例与进入流程修复

- **整体比例**：将选择页固定为 1280×720 设计舞台，按实际内容区宽高取较小比例整体缩放，修复 2K 窗口中卡片过小、上下留白过多和间距失真的问题
- **卡片素材**：移除第一张卡片含固定文字的选中叠加图，八张卡片统一使用透明人物、普通边框和独立 DOM 文本，hover/selected 均由 CSS 发光层实现
- **确认流程**：员工选择不再被后台 Forge 查询状态阻断；默认员工或点击切换后的员工均可高亮确认按钮并进入工作区，Forge 查询结果仅用于后续技能参数增强
- **工作区切换**：员工技能仍在加载或暂未匹配时也可切换角色，避免界面因技能库状态锁死

### 数字员工选择页正式素材与交互收尾

- **素材组合**：选择页使用 `newAssets/senso-*` 独立素材组合，人物使用 8 张透明 PNG，卡片、按钮和快捷导航使用无文字背景配合 DOM 文本
- **选中状态**：默认选中第一位员工；第一张卡片使用透明专用叠加层，第 2—8 张由各自 DOM 文本配合 CSS 发光边框和按钮，避免复用“威胁分析专家”固定文字
- **交互与布局**：hover、键盘焦点和已选中状态共用稳定的绝对定位视觉层，叠加层不接收鼠标事件；背景保持比例覆盖，卡片切换不改变布局尺寸
- **可维护性**：页面标题改为 DOM 文本和 CSS 装饰，便于后续国际化；补充页面单测的样式模块隔离
- **验证**：Prettier、数字员工相关 5 项测试、TypeScript 检查和 Memfit 生产构建通过；构建仅保留仓库既有 CSS 顺序与 Browserslist 警告

### 数字员工选择页与 AI Agent 工作区重构

- **事项**：Memfit 引擎连接完成后，每次启动先进入 8 名数字员工选择页；确认员工后进入精简 AI Agent 工作区
- **员工数据来源**：通过技能库 `QueryAIForge` 按 `ForgeVerboseName` 查询并精确匹配，避免模糊搜索结果中的普通技能混入
- **员工列表**：威胁分析专家、渗透测试专家、运营服务管家、数字猎手、数字情报官、首席信息安全官、数字教师、应急响应专家
- **选择页交互**：
  - 4×2 卡片布局，提供 hover 上浮、光晕、选中描边、键盘焦点和确认按钮状态
  - 未找到对应 Forge 时显示“技能未安装”，禁止确认，避免使用错误 Prompt
  - 选择结果仅保存在当前渲染进程，每次应用启动都会重新选择
- **AI Agent 布局**：
  - 左侧改为数字员工列表，底部保留“会话与设置”次级入口
  - 中间顶部显示当前员工人物、介绍与技能标签
  - 下方仅保留 AI ReAct 消息区和输入框，移除推荐广场、任务树、HTTP/风险分栏及非必要 Plan 入口
  - 切换员工时创建新会话，历史会话继续保留
- **Forge 绑定**：聊天首次启动参数显式写入选中员工真实 `ForgeName`，由引擎加载该 Forge 的 Init/Persistent/Plan/Result Prompt
- **主要新增文件**：
  - `app/renderer/src/main/src/pages/digitalEmployee/config.ts`
  - `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeContext.tsx`
  - `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.tsx`
  - `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeWorkspace.tsx`
  - `app/renderer/src/main/src/pages/digitalEmployee/resolver.ts`
- **人物素材说明**：当前 8 张图片是从用户提供的 1024×576 参考图裁出的临时回退素材；待收到透明 PNG/WebP 原图后，按同名文件直接替换即可获得正式清晰度
- **验证**：Forge 精确匹配与启动参数注入测试共 4 项，已通过

### 启动页右侧背景图更换

- **事项**：将 Memfit / 信湃SenPike 启动页右侧背景从原 webm 视频改为静态图
- **素材来源**：`app/renderer/src/main/src/assets/newAssets/startlogo.png`
- **实际引用**：复制到 `app/renderer/engine-link-startup/src/assets/startlogo.png`，供启动页模块引用
- **改动文件**：
  - `app/renderer/engine-link-startup/src/pages/StartupPage/index.tsx`
  - `app/renderer/engine-link-startup/src/pages/StartupPage/index.module.scss`
- **说明**：`isCommunityMemfit() || isMemfit()` 分支改为渲染 `startlogo.png`；右侧容器补充 `object-fit: cover` 与圆角裁剪

### 新建开发记录文档

- **事项**：从即日起维护本文件，记录后续开发与问题处理过程
- **路径**：`docs/DEV_LOG.md`（原中文文件名在部分环境下不易打开，已改为英文文件名）

### Electron 本地开发启动与白屏排查

- **事项**：安装依赖并启动 Electron（memfit）开发模式
- **代理**：本地代理端口为 `10808`（`http://127.0.0.1:10808`），不是此前误判的 `18780`
- **端口冲突**：本机 Windows 保留端口范围包含 `2910-3009`，默认前端端口 `3000` 无法绑定，临时改用 `2800`
- **白屏原因与处理**：
  1. Electron 受系统/环境代理影响加载本地页面失败 → 开发模式增加 `no-proxy-server`
  2. 可信开发端口仅含 `3000/5173`，`2800` 被 IPC 安全校验拒绝 → `security.js` 增加 `2800`
  3. 主窗口开发地址支持环境变量 `YAKIT_DEV_RENDERER_URL`
- **相关改动文件**：
  - `app/main/index.js`
  - `app/main/security.js`
- **当前开发启动端口**：
  - 启动页（engine-link）：`http://127.0.0.1:5173`
  - 主前端：`http://127.0.0.1:2800`（因 `3000` 被系统保留）
