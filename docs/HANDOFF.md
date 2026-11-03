# AI Senso 当前交接入口

更新时间：2026-11-03（Asia/Shanghai）。适用于新对话接手当前项目；功能实施及验收缺陷记录日期仍为 2026-11-02。

同日后续：[聊天页日志按钮修复](changes/2026-11-02-chat-log-window.md) 已完成，辅助窗口地址跟随主界面端口，7 条新增回归及真实 Electron 日志显示烟测通过。客户端已重启，详见最终快照开头补充；不影响原功能子项计数。

**最新窗口交接：[最终快照（更新至 2026-11-03）](HANDOFF-2026-11-02-NEXT-CHAT.md)。本轮功能、默认 Plan 和日志窗口修正已提交至本地 `3f1ae975f`，提交前 38 文件 / 226 条回归及类型检查通过。文档独立后续提交，未推送。计划内 29 个功能子项已实施 5 个、待实施 24 个；B0 和缺陷修正单独计。新三单元仍在人工验收，快照包含剩余清单、源码边界及运行注意事项。**

> 当前后续工作入口：[功能增量计划](MEMFIT_INCREMENTAL_UPDATE_PLAN.md) 与 [测试矩阵及实际结果](MEMFIT_INCREMENTAL_TEST_MATRIX.md)。固定前端参考 `D:\qianduan\cankaodeYAKIT\_memfit` 的 `9fc639fbb`；保持 AI Senso 整体风格，允许局部演进。[B1-A](changes/2026-11-02-b1a-runtime-context.md) / [B1-B](changes/2026-11-02-b1b-runtime-context-hotpatch.md) 已完成，用户初测未发现问题。随后实施 [B2-A 持续时长、B2-B 验收条件、B3-A 只读看板](changes/2026-11-02-b2-goal-b3-task-board.md)，再补默认 Plan 和日志窗口修正；提交前最终 38 文件 / 226 条回归及类型检查通过。新三个单元仍在人工验收；不重做 B1 或再次迁入这批功能。

当前验收采用编译后的轻量页面服务（18080）加连接页服务（19080），不自动热更新源码。曾因开发编译 / 检查进程占用约 9 GB 而出现全白；现已释放编译进程并恢复显示，用户确认过。新一批应先独立类型检查，再生成页面，释放编译内存后启动 Electron；必须同步生成目录中的 locale JSON。实际过程及脚本位置见本批记录，不重复同时启动多套大型编译服务。

2026-11-02 最新职责约定：引擎由另一位同事维护，客户端开发默认官方最新版已就绪，不再把本机引擎版本排查 / 下载 / 替换作为每批前置。需要核对实现时，参考 `D:\360MoveData\Users\Titee_G\Desktop\yaklang_backed` 并先同步远端；本次原分支分叉，已保留原分支并获取最新 `origin/main`，通过 Git 引用只读核对。详见 B1-B 记录，不修改引擎源码。默认最新版是协作前提，不等同于已经完成真实引擎联调。

## 1. 先读：用户已经确认的维护策略

**引擎保持官方最新；所有改动发生在客户端。客户端工作分成两条线：AI Senso 产品定制，以及对照官方最新 Memfit 前端同步核心功能。**

这是用户在 2026-10-30 明确补充的长期策略，后续工作应按此理解：

| 工作线 | 目标 | 实施方式 |
| --- | --- | --- |
| A：AI Senso 定制 | 保留自有品牌与业务入口 | 名称、Logo、主题、数字员工选择页与工作区、角色归属，以及已有客户端授权和交付适配 |
| B：官方 Memfit 功能同步 | 核心能力跟随官方前端 | 以当次核实的官方最新 Memfit 前端为参照，直接迁入实现及相关依赖，再接回 A 类定制 |

2026-11-02 最新 UI 约定：当前轮固定参考快照，不自动追随参考仓库移动；保持 AI Senso 的品牌、配色体系、整体组件风格与产品辨识度，具体页面布局、尺寸、间距、局部样式、控件和交互可随功能调整。逐批说明变化并验证风格一致和新旧功能可用性，不要求旧布局固定或截图逐像素相同。继续按功能单元实施，不顺带全局升级框架。

这里“前端 / 客户端”包含 React 两套渲染器、Electron 主进程 / preload / IPC、客户端 protobuf 定义和构建打包代码。仓库已有这些位置的改动，不能误解为只能修改 TSX / CSS。

**不维护定制 Yak 引擎分支，不为客户端功能另写引擎协议或执行逻辑。** `grpc.proto` 的变更应与官方引擎和前端对齐；界面适配通过官方已有接口完成。遇到实际官方能力缺口时，记录证据、寻找客户端可行方案或向官方反馈，不默认转成“请修改我们自己的引擎”。

本轮已按固定参考实施 B1-A / B1-B、B2-A / B2-B 和 B3-A，未升级或定制引擎。B2-C `/` 入口、甘特图、排序、会话重构及其余批次未迁入。具体范围见 [同步流程与台账](UPSTREAM_SYNC.md)，不表示业务代码已经与参考版本整体一致。

## 2. 当前仓库与工作区

| 项目 | 本次核对结果 |
| --- | --- |
| 工作区 | `D:\360MoveData\Users\Titee_G\Desktop\aiSenPike\yakit-memfit-AISenPike` |
| 分支 / 本轮提交前基线 | `main` / `afc69b034`；本轮功能提交见最终窗口交接，当前 HEAD 以 `git log` 为准 |
| GitHub | `origin`：`git@github.com:why-2018/AISenso.git` |
| Gitee 备用 | `gitee`：`https://gitee.com/a1543733438/ai-sense.git` |
| 产品身份 | 显示名 `AI Senso`，appId `com.aisenso.desktop` |
| 内部模式 | `memfit`；旧路径中仍可能出现 `AI SenPike`、`Yakit` |
| 本次文档整理前状态 | 上一轮新增 `docs/PROJECT_OVERVIEW.zh-CN.md` 尚未跟踪；另有既存 `outputs/` 未跟踪，未读取或清理其内容 |
| 当前轮范围 | B1、B2-A / B2-B、B3-A、默认 Plan 与日志窗口修复及交接；按用户要求整理本地代码与文档提交。未推送或重打安装包 |

本轮提交前的 `afc69b034` 可达 63 个提交，根提交 `acaae6997` 在 2026-07-29 一次性导入 3104 个文件，导入时已经包含数字员工。因此无法只靠本地 Git 历史还原全部原始定制差异。该限制不妨碍按用户既定方式迁入官方前端；今后逐次补全同步来源即可。

## 3. 当前产品模型与必须保留的行为

### 数字员工与智能体

- 固定八个角色：威胁分析专家、渗透测试专家、运营服务管家、数字猎手、数字情报官、首席信息安全官、数字教师、应急响应专家。
- 一个角色可关联多个 AI Forge；角色定义在 `digitalEmployee/config.ts`，归属保存在官方既有 `AIForge.Tag` 字段的 `senso-role:<role-id>` 标签中。
- 无有效角色标签的 Forge 属于“未分配”；不按返回顺序、中文名称或关键词猜归属。展示技能文字也不等于引擎新增能力。
- 当前角色默认选中按 ID 升序排列的第一个智能体；刷新保留有效的手动选择，切换角色重新取默认项。
- 欢迎页输入框保持可见；无可用智能体时不能发送。名称、描述和可见标签搜索在前端完成。
- 选中智能体经默认锁定 forge mention、真实 `ForgeName` 和 `AttachedResourceInfo` 进入原有请求链；继续允许用户附加其他技能、工具、知识库等资源。
- 切换智能体需清理旧锁定标签；已有会话可按 `StartParams.ForgeName` 恢复角色和智能体。

### 入口、导航与任务界面

- 授权及主界面初始化后进入数字员工选择流程；确认角色或点击快捷入口后进入主工作区。
- 六个快捷入口：智能体广场、知识库、记忆库、工具库、插件仓库、流量历史。
- 快捷导航先保存一次性目标，由 `MainOperatorContent` 完成默认标签初始化后消费。早于默认初始化开页会被覆盖回 AI Agent；不要改回随意延时或在选择页直接发事件。
- 右侧任务清单读取真实会话任务数据。当前 `DigitalEmployeeTaskProgress.tsx` 使用当前问题的 `rawData.taskDetailsMap.get(questionID)?.todoList` 及 `chatTodoListUpdate`，不是旧文档中的 `casualChat.planDetails.todoList`。
- Plan / 规划、文件和任务展示应跟随当前官方核心组件接入；不要按 7 月旧记录重新隐藏已恢复的功能，也不要伪造执行状态和进度。

### 品牌、授权和桌面交付

- 保留 AI Senso 文案、高清 Logo / 人物素材、主题、窗口与安装包身份。`memfit` 等内部标识不宜全局替换。
- 当前 Memfit 主进程会在引擎连接完成后复验授权，验证成功才加载主业务渲染器；主界面保留二次校验。
- 授权复用 `GetLicense`、`CheckLicense`、`GetKey`、`SetKey`，缓存键 `LICENSE_ACTIVATION`；当前 `CompanyVersion` 仍为 `EnpriTrace`，须按官方协议核对，不能因品牌改名直接替换。
- 当前 `memfitLicense.js` 已没有旧文档提到的 `MEMFIT_LICENSE_REQUIRED` 常量。不要按历史“改开关”说明操作。
- 保留已有文件访问限制、sender 校验、生产调试限制、主进程字节码和运行资源校验。迁入官方代码时须比较这些交叉修改，避免整文件覆盖丢失。
- 启动窗口已使用隔离 bridge；主业务窗口仍有旧 Node / IPC 兼容路径。不能把局部加固描述为全应用隔离改造完成。

## 4. 核心代码导航

下表 `src/` 指 `app/renderer/src/main/src/`。

| 入口 | 文件或目录 | 作用 |
| --- | --- | --- |
| 启动 / 主窗口 | `app/main/index.js` | 窗口、加载时序、主进程授权复验 |
| 启动页 | `app/renderer/engine-link-startup/src/pages/StartupPage/` | 引擎连接、启动授权与品牌 |
| 授权服务 | `app/main/memfitLicense.js` | 调用官方引擎授权接口 |
| 全局布局 | `src/components/layout/UILayout.tsx` | 连接状态、二次授权、数字员工 Provider / Gate |
| 定制业务 | `src/pages/digitalEmployee/` | 角色定义、归属、选择、欢迎页、工作区与请求适配 |
| 广场与编辑 | `src/pages/aiForge/AIForge.tsx`、`forgeEditor/ForgeEditor.tsx`、`marketplaceRoleFilter.ts` | 角色筛选、卡片和角色 Tag 保存 |
| 主菜单 | `src/routes/newRoute.tsx` | Memfit 可见菜单和既有路由 |
| 快捷导航消费 | `src/pages/layout/mainOperatorContent/MainOperatorContent.tsx` | 默认页初始化后消费目标 |
| AI 核心 UI | `src/pages/ai-agent/` | 输入、历史、模型、任务、运行模式和定时任务页面 |
| 会话与流事件 | `src/pages/ai-re-act/hooks/` | `useChatIPC.ts`、`ChatMultiSessionController.ts`、状态与持久化 |
| AI 执行请求 | `src/pages/ai-re-act/aiReActChat/AIReActChat.tsx` | 选中 Forge、输入资源与发送 |
| 主进程桥接 | `app/main/preload.js`、`engineLinkPreload.js`、`ipc.js`、`handlers/ai-agent.js` | IPC 与官方 gRPC 转发 |
| 官方协议对齐 | `app/protos/grpc.proto` | 客户端 RPC / 消息定义 |
| 构建交付 | `packageScript/`、`scripts/`、`.github/workflows/` | 打包、签名、字节码、模板、运行验证和发布 |

AI 消息链：React 输入与资源 → 会话控制器 → Electron IPC → `StartAIReAct` gRPC → 官方引擎 → 流事件回传 → 会话状态与界面。不要用另一套请求或伪造任务状态替代。

## 5. 官方同步与定制交叉点

重点核对 `UILayout.tsx`、`AIAgent.tsx`、`AIAgentChat.tsx`、`AIReActChat.tsx`、输入框 / mention、`aiForge`、`newRoute.tsx`、`MainOperatorContent.tsx`、`preload` / IPC、依赖配置。这些文件同时可能有官方核心代码和本地适配，迁入前先保存差异，再把定制重新接入。

近期历史包含：

| 提交 | 内容线索 | 接手时如何理解 |
| --- | --- | --- |
| `9ca044ea0` / `0c87a80b8` | 角色一对多与角色查询兼容 | 定制接口与官方数据字段的交叉点 |
| `de4131599` | 客户端授权加固 | 不应被 UI 同步覆盖掉的桌面适配 |
| `ac62cf39e` | 361 文件的会话和定时任务改造 | 核心范围较大；不能仅按早期数字员工文档理解 |
| `030c27441` | 任务展示和运行隔离相关改动 | 继续核对当前代码，不能只看提交标题推断能力 |
| `67b0f9474` 至 `afc69b034` | 原生构建、字节码、模板、资源、公证重试 | 属于客户端交付链 |

依据用户说明，核心功能长期通过官方 Memfit 前端对照迁入；上述历史的每次具体上游 SHA 尚未核实，不能因此将这些提交全部标为原创或全部标为某个官方版本。

## 6. 环境、启动与构建

三个依赖工程：根目录、`app/renderer/src/main/`、`app/renderer/engine-link-startup/`，各自有 `package.json` 和受 Git 跟踪的 `yarn.lock`。

已有依赖时，从根目录执行：

```powershell
yarn dev
```

该 Windows 脚本启动主渲染器 `3000`、启动页 `127.0.0.1:5713`，等待端口后启动 Electron；显式设置 `YAKIT_APP_PLATFORM=memfit`。主渲染器使用 `REACT_APP_PLATFORM=memfit`，启动页使用 `VITE_PLATFORM=memfit`，打包使用 `PLATFORM=memfit`。普通 `start-render` 会进入其他产品模式。

若依赖缺失，分别在三处按锁文件安装，不要顺带升级依赖。主渲染器首次编译可能较慢，避免重复启动多套进程。历史文档中的 `2800/5173` 是旧环境方案，当前入口以根脚本为准。

```powershell
yarn build-renders-memfit
yarn pack-win-memfit
```

第一条构建两套渲染器；第二条依次构建渲染器、主进程字节码和 Windows 包。主渲染器是 CRA / react-app-rewired，启动页是 Vite，主进程生产构建是 electron-vite。

云端手动流程是 **Multi-Platform Build Develop**，定义在 `.github/workflows/multi-platform-build.yml`。默认 Memfit、五个平台 / 架构原生构建、包含引擎、不签名、产物保存到独立 GitHub Release。正式发布和验证细节见 [全平台打包说明](github-desktop-packaging.md)。

**策略与当前更新入口需区分：** CI 的引擎版本参数为空时，`scripts/ci-build-plan.js` 在该次构建开始时读取官方 latest，再把确定版本用于各平台；已安装客户端不会因此持续自动变成最新。`UILayout.tsx` 当前在 Memfit 下跳过部分引擎版本检查和更新入口。用户的“引擎保持官方最新”不等于授权本次顺带重新打开这些入口；如果后续任务是更新机制，再单独按目标处理。

## 7. 验证与已知状态

2026-11-02 最新回归为 37 个文件 / 215 条通过，主渲染 TypeScript 与开发页面编译通过。B2 / B3-A 新增 79 条用例，覆盖 Goal 条件、真实模式入口、策略热补丁、历史恢复边界、看板状态和时间、原地流更新及任务 / 会话切换。B1 获用户初步使用确认；新三个单元的真实引擎执行和实机视觉仍待验收。未声称全平台安装包或远端 Actions 已验收，详见测试矩阵。

历史证据：`DEV_LOG.md` 记录 2026-10-09 交付过基于 `814619fc4` 的五平台启动验证预发布包；该旧包不包含后续报告模板等修复。此记录不能证明当前 HEAD 五平台交付均已验收。

后续按改动范围验证：

- 数字员工 / 输入适配：运行该目录相关已有测试与主渲染类型检查；实际验证默认选择、切换、搜索、发送和历史恢复。
- 核心同步：验证新会话、多会话切换、流式输出、取消 / 结束、历史恢复、任务状态、Plan / 文件展示；同步定时任务时另测相应接口。
- 授权：启动页、主进程、主界面定向测试，加实际官方引擎与签发服务联调。
- 桌面 / 构建：使用现有 `scripts/__test__/` 定向检查及实际目标平台构建，区分渲染构建、包启动和完整业务验收。
- 按需使用根 `yarn test:vitest run <测试路径> --threads=false`、`yarn ci:tsc`、`yarn build-renders-memfit`；命令列在这里不代表本次已执行。

待确认记录：默认 Forge 角色归属初始化及历史数据迁移、项目 / 设备 / 期限 / 角色授权权益的官方服务支持情况、历史 RSA 签发错误是否仍复现、当前引擎与最新前端兼容性。它们是待核实事项，**不是已经授权去改定制引擎的待办**。

角色查询目前保留前端候选集分页后精确过滤的兼容方式。若最新官方引擎已修复 Tag 查询，先用实际数据验证，再决定是否简化。

## 8. 文档阅读顺序与过期说明

1. **本文件**：当前策略、状态与接手入口。
2. [同步流程与台账](UPSTREAM_SYNC.md)：执行官方功能迁入前阅读。
   本轮具体范围看 [增量计划](MEMFIT_INCREMENTAL_UPDATE_PLAN.md)，验证看 [测试矩阵](MEMFIT_INCREMENTAL_TEST_MATRIX.md)。
3. [项目导览](PROJECT_OVERVIEW.zh-CN.md)：总体架构和目录。
4. [数字员工当前实现约定](DIGITAL_EMPLOYEE_IMPLEMENTATION.md)：当前定制接口和保留点。
5. [全平台打包](github-desktop-packaging.md)：交付操作。
6. `DEV_LOG.md`、`DIGITAL_EMPLOYEE_HANDOFF.md`、日期命名的 `AI-SenPike-handover-*`、`changes/`：用于追溯具体改动，旧状态不能覆盖当前源码与本次策略。

`DEFAULT_AGENT_ASSIGNMENT_BACKEND.md` 是历史数据交付讨论，其中“要求后端改引擎”的写法不能作为本项目当前实施方向。角色 Tag 可经官方现有 Forge 接口维护；具体初始化方案另行根据真实数据确定。

已经过期的典型说法：员工 1:1 Forge、按 Forge 顺序生成角色、`config.ts` 维护 Forge 名称映射、临时关闭授权、`MEMFIT_LICENSE_REQUIRED` 开关、右侧进度读取 `casualChat.planDetails`、Gitee 仍为主远端、2800 / 5173 为当前固定端口。

## 9. 给新对话的开场文本

```text
请先阅读 docs/HANDOFF-2026-11-02-NEXT-CHAT.md、docs/HANDOFF.md、docs/MEMFIT_INCREMENTAL_UPDATE_PLAN.md 和 docs/MEMFIT_INCREMENTAL_TEST_MATRIX.md，再按需阅读 docs/UPSTREAM_SYNC.md。
项目在 D:\360MoveData\Users\Titee_G\Desktop\aiSenPike\yakit-memfit-AISenPike。
维护策略：Yak 引擎保持官方最新，不维护定制引擎；客户端一方面保留 AI Senso 品牌和数字员工定制，另一方面对照官方最新 Memfit 前端直接迁入核心实现，再接回定制。
本轮固定前端参考 D:\qianduan\cankaodeYAKIT\_memfit 的 9fc639fbb；保持 AI Senso 整体风格，允许局部演进。B1 已获用户初测正常反馈，最新实施 B2-A / B2-B / B3-A 三个单元；随后修复新对话默认 Plan 和日志窗口，代码提交 3f1ae975f，最终 38 文件 / 226 条回归及类型检查通过。共 5 个功能子项已实施、24 个待实施，先结合验收反馈继续。引擎由同事维护，默认最新版；需要参考时先同步 D:\360MoveData\Users\Titee_G\Desktop\yaklang_backed，保留其分叉分支并用 origin/main 只读核对。验收使用轻量静态页面，先读最终快照中的生成状态、内存、locale 同步和 Electron 重启说明，不要再常驻两套大型编译进程。
先检查当前 Git 状态，保留已有改动和 outputs/，按这次具体任务继续；交接本身不代表已同步到官方最新，也不代表需要立即升级或重新打包。
```

本轮交接已完成；新对话的具体开发任务由用户继续给出。
