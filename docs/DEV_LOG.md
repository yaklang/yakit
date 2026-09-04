# 开发记录

用于记录本仓库开发过程中的关键改动、问题与处理结论，方便后续追溯。

> 文档路径：`docs/DEV_LOG.md`（使用英文文件名，避免 Windows/资源管理器中文路径显示异常）

记录约定：

- 按时间倒序追加（最新在上）
- 每条包含：日期、事项、改动点、原因/结论
- 与运行环境相关的问题尽量写清端口、代理、路径等关键信息

---

## 2026-09-04

### AI SenSo 授权入口与安装包信息泄露加固

- **主进程门禁**：Memfit 主业务窗口启动时保持空白且隐藏；引擎连接完成后，由独立启动渲染器展示授权申请码和授权码输入，Electron 主进程再次校验引擎缓存授权，成功后才加载主业务 HTML
- **兼容原授权**：复用已有 `GetLicense/CheckLicense/GetKey/SetKey` 协议及 `LICENSE_ACTIVATION` 缓存格式，主渲染器原 `EnterpriseJudgeLogin` 保留为二次校验；非 Memfit 产品不改变启动流程
- **开发工具限制**：生产环境不注册 `trigger-devtool`，菜单移除 DevTools，辅助窗口忽略生产环境的 `openDevTools` 请求；开发调试入口保留
- **安装包清理**：Electron Builder 排除 `docs/`、`packageScript/`、测试、报告和覆盖率目录，避免交接文档、开发日志和测试代码进入 `app.asar`
- **防篡改**：Electron 由 `27.0.0` 升级为 `30.5.1` 以获得 Windows ASAR Integrity 支持；启用 `EnableEmbeddedAsarIntegrityValidation` 与 `OnlyLoadAppFromAsar`，并关闭 `NODE_OPTIONS`、Node CLI inspect Fuse
- **验证**：主进程授权服务 5 项定向测试通过；Memfit 引擎连接页生产构建、主渲染端 TypeScript、主进程 JavaScript语法和 `git diff --check` 通过；Windows 目录包成功写入 ASAR 完整性资源，Fuse 实读确认生效，包内容审计确认无 `docs/`、`packageScript/` 和主渲染 source map
- **安全边界**：客户端门禁和完整性校验用于阻止普通绕过与篡改，不作为核心能力授权；AI 对话等实际能力仍必须由引擎拒绝未授权调用

### 安全测试报告第一阶段 P0 整改

- **命令注入修复**：`install-yak-engine` 删除 `childProcess.exec` 和 `cp/copy/chmod` 字符串拼接，改用 `fs.promises.copyFile` 与 `chmod`；普通主窗口和 `EngineLink:` 两套下载、校验、安装流程统一校验版本字符集和引擎目录边界，并绑定正确发送窗口
- **文件能力授权**：系统打开/保存对话框按发送方 `webContents` 发放 30 分钟临时文件能力；`fetch-file-content`、`write-file`、`delelte-code-file`、`rename-file`、`is-exists-file` 必须命中同一发送方已选择的文件或目录，保存写入限制 64 MiB，重命名禁止覆盖已有文件
- **sender 收紧**：敏感 IPC 拒绝 iframe 和错误窗口；`file://` 仅信任应用目录内渲染文件，不再信任任意本地 HTML。应用管理的 YakRunner 代码目录通过 `fetch-code-path` 显式授权，保留正常编辑流程
- **安装包清理补漏**：新增排除根 `scripts/`、`*.log`、`.codex-*`、`.codex-run/`、`.env*`、`*.map`、Markdown、依赖 docs/examples；修复上一轮目录包仍携带本地 `.codex` 调试日志的问题
- **报告覆盖**：生产 DevTools 和前端 Hook License 绕过由上一节修复；本节完成任意文件读写与引擎安装命令注入整改，覆盖报告现有四项复现问题
- **验证**：授权门禁、sender、文件能力与引擎安装 4 个测试文件共 21 项通过；主进程语法、主渲染 TypeScript、Memfit 启动页生产构建和 Windows 打包通过；`app.asar` 审计确认 docs、构建脚本、测试、日志、环境文件、source map、Markdown 数量均为 0，包内引擎安装使用文件 API 且 Fuse 保持生效
- **交付物**：`release/AI Senso-1.4.8-0711-windows-amd64.exe`，`181962957` 字节，SHA256 `3B175AC93B67FA133168E34D8AFA1D312E46C72684E6E14F4885309CBB38D5E5`
- **后续边界**：`nodeIntegration/contextIsolation`、原始 `ipcRenderer`、Terminal 和全量高权限 IPC 审计不在第一阶段 P0 内，必须作为第二阶段继续处理

## 2026-08-26

### 数字员工角色与智能体调整为一对多

- **角色筛选兼容修复**：本地引擎能返回角色 Tag，但通过 `AIForgeFilter.Tag` 查询为空；广场角色页签改为分页读取候选 Forge 后使用统一角色解析函数在前端精确过滤，修复卡片显示角色但点击同名页签为空的问题
- **模型拆分**：八个数字员工改为固定角色，AI Forge 保持为可动态增减的智能体；删除按 Forge 返回顺序生成员工的映射
- **归属标记**：使用内部 Tag `senso-role:<role-id>` 保存智能体所属角色；无标记旧智能体进入“未分配”，不再通过名称或顺序猜测
- **聊天选择**：首页左侧只切换数字员工角色；欢迎页新增角色内智能体选择器，选中智能体后才显示带锁定 Forge mention 的输入框
- **请求复用**：首次 `ForgeName`、默认 mention、`AttachedResourceInfo` 兜底和去重全部改为读取 `selectedAgent`，原聊天 IPC 协议不变
- **创建约束**：Memfit 创建/编辑智能体时必须选择数字员工角色；内部角色 Tag 从普通能力标签中隐藏
- **广场分类**：八个角色分类改为按 `Filter.Tag` 精确查询，卡片显示真实角色或“未分配角色”
- **历史恢复**：打开包含 `StartParams.ForgeName` 的历史会话时，尝试恢复已分配的角色与智能体
- **验证**：7 个定向测试文件、17 项测试通过；TypeScript 和 `git diff --check` 通过

### 数字员工选择页快捷导航接入实际菜单

- **菜单对齐**：快捷入口调整为智能体广场、知识库、记忆库、工具库、插件仓库和流量历史，与 Memfit 实际菜单名称一致
- **跳转机制**：复用已有 `YakitRoute` 和主菜单开页函数，点击后由主界面打开或切换到目标页面
- **最终时序修复**：选择页期间主菜单尚未挂载，且 `MainOperatorContent` 自身的初始化 effect 会在早期跳转之后再次选中 `AI_Agent`。现由 `quickNavigation.ts` 只保存一次性目标，`MainOperatorContent` 完成默认页初始化后再领取并开页，不再通过菜单订阅时机回放
- **数据库入口**：数据库是菜单分组且没有独立路由，因此快捷入口指向首个可访问子页面“流量历史”
- **可访问性**：快捷项由静态容器改为原生按钮，补充键盘焦点和按下反馈
- **验证**：选择页 6 项测试通过，其中明确覆盖“先初始化数字员工页、再以快捷目标覆盖”的执行顺序；TypeScript 检查和 `git diff --check` 通过；本地开发服务返回 HTTP 200
- **功能提交**：`9b3e3b4 feat: enable digital employee quick navigation`
- **时序修复提交**：`6217c82 fix: defer quick navigation until menu mount`
- **懒加载回放修复**：`35e239f fix: replay employee quick navigation after lazy mount`
- **初始化覆盖修复**：`e4dbfac fix: apply employee quick route after menu initialization`
- **回滚**：执行 `git revert e4dbfac 35e239f 6217c82 9b3e3b4`，按新到旧顺序安全撤销完整功能，不影响其他未提交修改

## 2026-07-30

### 数字员工聊天详情与任务进度优化

- **重复消息**：保留原版乐观展示和 IPC 发送链路；`react_task_dequeue` 缺少临时输入 UUID 时，以最近同文未确认问题作为回退进行节点替换，避免单次输入显示两条
- **员工侧栏**：增加展开/收起控制；已有会话详情默认收起，欢迎态默认展开，员工切换仍复用原有新会话事件
- **思考与执行**：数字员工右栏改为直接展示 `casualChat.planDetails.todoList`，移除无数据的工具统计、任务目标和意图卡片
- **状态视觉**：顶部只显示任务进度与百分比；完成为绿色对号、执行中为旋转圆环、待执行为灰色静态圆环，不显示步骤序号与可见状态字样
- **真实信息**：任务辅助信息只使用后端 `updated_at` / `created_at`，兼容秒级和毫秒级时间戳，不构造描述或时间
- **验证**：TypeScript 检查通过；数字员工与消息回显 4 个测试文件、13 个测试通过
- **运行入口纠正**：2800 只是开发端口，AI SenSo 必须使用 `yarn start-render-memfit` 注入 `REACT_APP_PLATFORM=memfit`；普通 `start-render` 会显示同仓库的通用 Yakit 界面

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

- **事项**：将 Memfit / 信哨AI SenSo 启动页右侧背景从原 webm 视频改为静态图
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
