# 第三批：输入命令、会话页签和浏览器集成

**最新后续：本次静态构建 Refresh 白屏已修复，用户确认数字员工 / 会话页面恢复。** [修复记录](2026-11-05-white-screen-refresh-fix.md)。后文白屏未修复和中途启动状态为历史记录。

**后续用户确认：新版启动后实际白屏，且已多次复发；当前未修复，最后七项人工验收受阻。** [白屏复发与后续启动注意事项](2026-11-05-startup-white-screen-recurrence.md)。

日期：2026-11-05（Asia/Shanghai）。本记录接续 2026-11-04 的两份未完成记录。范围为 B2-C、B7-A/B/C、B9-A/B/C；最终验证结果和运行状态见本文件末尾。

## 固定来源与保留边界

- 只读参考 `D:/qianduan/cankaodeYAKIT/_memfit`，再次核实 HEAD 为 `9fc639fbb677eaa538132b2afa749555b3b14791`，工作树干净。按功能迁入，没有整仓合并。
- 当前项目 HEAD 为 `8cb79ea04`。该提交是用户上轮明确要求的 GitHub 备份，本轮新增修改不自行提交或推送。
- 保留品牌、数字员工 / Forge、附件和文件权限、历史恢复、授权、现有任务三视图与工具 / 模型 / 技能 / MCP 功能。没有升级依赖或修改 / 下载 / 替换 / 编译引擎。
- 保留 `outputs/`、`2140`、`2672`、`2852`、`3460`。本轮不操作用户当前窗口，不重启客户端或既有 18080 / 19080 服务。

## 实施范围

| 子项 | 当前实现与参考适配 |
| --- | --- |
| B2-C | 使用固定参考的 Milkdown slash 插件、查询 / 删除区间、Goal / Multi-Agent 配置、标签重开。适配本地图标、AntD4、三语 public/locales 及已有热补丁回执。Enter 组合输入保护；只消费 `/query`，保留前文和锁定 Forge mention；标签重开按输入卡片定位，弹层锁按编辑器所有者隔离。 |
| B7-A | 在数字员工工作区内新增会话页签栏与 `＋`。每页签独立页面 ID、角色提供者、设置、编辑器和附件状态；后台页面保留挂载，流继续由原 Controller 持有。新建对话和切角色可新开页签。关闭运行页签先确认，原 `onPageUnload(route,pageId)` 仅停止自身连接，保留历史。保留主导航与快捷入口。 |
| B7-B | 历史会话按 SessionID 去重打开；远程 KV 仅保存页签 ID、会话 ID、标题及角色 / 智能体选择 ID，不保存启动凭据或附件内容。恢复时查询正式历史，剔除已删除会话；读取失败保留缓存并可重试；写入串行并显示失败反馈。流标题和历史改名同步到页签。删除事件按 ID / 来源 / 平台 / 时间筛选移除对应页签。 |
| B7-C | 立即运行前监听推送，收集早到事件；按任务 UUID 去重执行，成功后查询正式历史，打开 / 定位对应页签。续跑任务匹配明确 TargetSessionID；新会话排除执行前记录，结合标题、创建时间和可用首问数据确定唯一候选。保留原频率、时区、表单与 Payload。 |
| B9-A | 迁入官方 browser-extension 客户端、协议校验及任务流。新增仅可信发送方可调用的浏览器专用请求 / 执行 / 取消 IPC，取消和回包按发起 renderer 隔离。开放 120 秒配对窗口；展示来源、配对码，人工批准 / 拒绝均需确认。YTray 自动批准必须先通过原生 claim 验证；缺失服务或验证失败保留人工处理。 |
| B9-B | 数字员工工作区右上“浏览器”面板，提供在线 / 离线 / 执行状态、当前页预览信息、刷新、定位及引用。引用携带准确 deviceId，沿用官方 `Type=browser / Key=device_id` 附加资源格式，与 Forge / 文件资源一起提交；输入事件定向到当前页签，离线引用禁用。接入浏览器状态推送、轮询、旧回包保护。浏览器手动接管消息支持二维码本地展示、聚焦和完成确认；二维码像素不持久化。 |
| B9-C | 原生 YTray 历史列表与恢复，支持 Windows named pipe、macOS socket 和参考的 WSL 路径。实例 ID / requestId 校验、超时 / 失败反馈和可信发送方保护。恢复需用户确认；桥接失败时 YTray 历史独立显示。managed browser profile 仅注册参考的只读列表 IPC，不新增 Profile 删除或启动入口。 |

## 核实出的协议限制

现有 `RunAIReActScheduleNow` 返回 Empty，`ai_session` 推送没有任务 UUID 或执行 ID。直接使用任意首条推送、或者超时查询最新会话，会串到其他任务。本轮采用正式历史的唯一匹配；同名并发候选、排队超过等待窗口或缺失足够关联数据时，显示无法打开的提示，刷新历史，不猜测选择。该边界不需要修改引擎；若未来引擎提供执行 ID，可进一步精确匹配。

## 关键实现位置

- `pages/ai-agent/components/aiMilkdownInput/aiMilkdownModeSlash/`、`panelMutex.ts`、`aiRunModeSelect/AIRunModeSelect.tsx`。
- `pages/ai-agent/sessionTabs/`、`AIAgent.tsx`、`DigitalEmployeeContext.tsx`；历史入口和删除通知；`AIReActChat.tsx` 可见会话管理。
- `pages/ai-agent/aiScheduledTasks/runScheduleSession.ts`；现有表单与周期逻辑保留。
- `pages/browserExtension/`、`pages/ai-agent/browserInstances/`、`components/aiBrowserHandoffCard/`、浏览器消息流 handler 和节点渲染。
- `app/main/handlers/browserExtension.js`、`ytrayControl.js`、`managedBrowserProfiles.js`、`ipc.js`、`preload.js`；客户端 proto / bridge 类型。

## 验证与运行结果

- 最终自动回归：**85 个文件、558 条通过、1 条跳过**。逐条 `assertionResults` 为准；Vitest 0.34 顶层 `numPassedTests=559` 将跳过项计入，不能直接称 559 条通过。跳过项为参考 managed profile 的 Windows 符号链接删除用例，本批仅注册该模块只读列表。
- 独立主渲染 `tsc --noEmit` 最终退出码 0，编译时没有同时运行类型检查。
- 单次 webpack 开发编译退出码 0，日志 `BATCH3_BUILD_SUCCESS`，7 组非阻断警告；未升级 Browserslist / 依赖以消除提示。编译器已经退出，无 watch / dev-server 留存。
- 独立产物 `.codex-run/batch3-main-20261105`；main / aux HTML 引用的 19 项资源均存在，并以临时 loopback HTTP 服务校验 HEAD 200、脚本 MIME 为 JavaScript，临时服务随即关闭。该结果不代表 Electron 显示验收。
- aiAgent / layout / configNetwork × zh / zh-TW / en 九份 locale 已显式复制到独立产物，SHA256 逐份核对一致。报告 `.codex-run/batch3-static-check.json`。
- 本轮没有重启或操作当前客户端，未替换当前 18080 静态根。新 preload / IPC 与页面需在下一次明确启动时一起加载。
- 激活助手 `.codex-run/activate-batch3-preview.ps1` 已做语法解析检查，未执行。它只在本项目客户端和 18080 服务均已停止时复制独立产物到原静态根，不删除旧文件；运行着旧客户端时会拒绝覆盖。之后沿用静态服务 → 19080 就绪 → 普通 Electron 启动的顺序。

本批人工操作入口见 [人工测试指南](../MEMFIT_MANUAL_TEST_GUIDE.md#第三批七项2026-11-05)。自动测试不等同于真实引擎、扩展 / YTray 或视觉验收。

## 用户要求加载新版（2026-11-05 后续）

用户明确要求“加载新版并启动项目，我来测试最后七项”。已关闭本项目旧客户端，停止核实身份的旧静态服务，将第三批独立产物激活到 `app/renderer/pages/main`；HTML、19 个入口资源及九份 locale 与独立产物逐项 SHA256 一致。恢复静态 18080，保留原连接页 19080；两个服务与全部入口资源实测正常。没有重新编译或操作引擎。

复制时 PowerShell Copy-Item 遇到 Windows `aux` 保留名称错误；激活助手改为 Node fs.cpSync 后完整复制成功，保留原文件，随后逐项核对通过。未删除保留文件。

**客户端启动尚未执行：自动审批拒绝了启动原普通 Electron 脚本的动作，只返回 `blocked by policy`，没有进一步原因。没有更换命令或接口绕过。只读复查本项目 Electron 进程数为 0。** 用户可手动执行原脚本：

```powershell
pwsh -NoProfile -File "D:\360MoveData\Users\Titee_G\Desktop\aiSenPike\yakit-memfit-AISenPike\.codex-run\start-b3bd-electron.ps1"
```

无需再编译或重新激活，当前静态根已是第三批。启动后由用户检查显示和最后七项。静态服务 PID 当时 2728、连接页 PID 7528，仅供追溯，后续先重新核实。日志 `.codex-run/batch3-launch-20261105-111019-preview.stdout.log` / `.stderr.log`，运行状态 `.codex-run/batch3-launch-20261105-111019-session.json`。
