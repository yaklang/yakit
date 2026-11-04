# 第二批七项：会话稳定性、技能与 MCP

日期：2026-11-04（Asia/Shanghai）。状态：七项代码已实施，完整自动回归与类型检查通过，静态编译及服务检查通过，客户端自动启动被自动审批拒绝，实际显示待用户确认。此前 15 / 29，增加本批七项后为 22 / 29，第三批剩余七项。第二批范围为 B4-A / B4-B / B4-C、B5-A / B5-B / B5-C、B6-D。

固定参考 D:\qianduan\cankaodeYAKIT\_memfit，SHA 9fc639fbb677eaa538132b2afa749555b3b14791，工作区核实干净。HEAD 仍为 d2cc5db82；本批前所有 app / docs 修改已保存可追溯基线于本机 .codex-run/batch2-baseline。outputs/ 及 2140 / 2672 / 2852 / 3460 保留。

## 范围和依赖

1. 会话启动：连接 token 与正式 SessionId 分离，握手前 pending 首问、失败 / 取消 / 重试，成功后才发布历史。
2. 取消 / 重连：逐连接生命周期，使迟到回包和旧结束事件不能影响新连接；停止和关页只操作对应页面会话。
3. 历史 / 持久化 / 删除：事件串行、落盘与关闭屏障、旧事务不能在删除后复活。保留当前本地旧渲染树可读能力；不照搬参考版启动即清空全部 IDB 缓存的策略。
4. 技能同步 / 详情：按会话接官方 skill_loaded / skill_available / skill_detail 和快照，保留数字员工 Forge 归属。
5. 技能列表 / 预览：现有工作区增加入口、搜索分页、只读文档预览，适配 React18 / AntD4。
6. 会话技能加载：官方 load_skill，同步回执与数据确认分开，失败、超时和切会话隔离。
7. MCP：工具加载反馈与调用历史 / 详情；沿用当前连接凭据与权限，必要官方 RPC / 客户端 proto 一并对齐。

参考核心：pages/ai-re-act/hooks/sessionLifecycle.ts、ChatMultiSessionController.ts、useChatIPC.ts、useStartAIChat.ts、persist/；aiRightPanel/AISkillLoadingPane/、useSyncLoadingState.ts、grpcStreamHandler/aiTaskDetail.ts；pages/ai-agent/aiMCP/、aiMCPHistory/ 与固定 proto。当前额外保留 B3 任务快照和三视图、按问题隔离 HTTP / 风险运行 ID、B8 Dump、默认 Plan、日志修复、数字员工 Forge / 附件链、授权和文件访问策略。

## 实施与本地适配

- B4-A：Controller 统一拥有监听，连接 token 每轮新建，前端提交时固定业务 SessionID；首问握手前在 pending 内存可见，成功才登记到会话池、发布历史和发送。失败 / 超时保留问题，支持固定参数重试和取消。欢迎页直接调用共用启动入口，消除等组件挂载再经 ref 发送的竞态。AI Senso 数字员工 Forge、默认技能资源、附件、Goal / 单模型 / 上下文参数继续注入。
- B4-B：逐连接生命周期与事件队列，取消准备中的连接不能迟到 start；旧 token 监听失效，不影响新连接。客户端主进程取消实际流后立即发送对应 token 的 end；重复 end 共用收尾 Promise。UI 不增加 B7 多页签或账号并发限额。
- B4-C：结束等待准备 / 已收事件 / 最终快照 / 正文事务，旧生命周期禁止写入，删除排干队列，IDB 关闭连接可重新打开并重试一次。写入按事务 complete 成功，不以 put 请求成功代替提交。失败如实通知并释放连接。保留本地按版本迁移和现有 IDB 渲染树恢复；不迁入官方本次启动即清空三表的策略。保留已有附件所有权与文件权限，取消连接不新加删除附件目录操作。
- B5-A：使用固定参考的四种同步类型 `skill_loaded_sync / skill_available_sync / skill_detail_sync / load_skill_sync` 和三个 structured 技能事件。清单、详情均按会话存储；分页去重、错误响应不擦掉旧清单；加载状态变化使旧详情失效。
- B5-B：在原会话页签中增加“技能”，已加载本地搜索，可用技能服务端搜索 / 分页。点击技能名显示只读文档、后端文件树和 URL 文本，支持刷新详情。内容以文本显示，不执行 Markdown 内 HTML，不增加绕过文件访问的打开路径。窄窗口纵向布局。未复制官方整套右栏和新图标库。
- B5-C：当前会话加载，禁止重复操作；同步回执与数据结果分开，确认已加载清单出现该技能才提示成功，刷新可用列表。回执后只发一次确认刷新，避免未成功时紧密轮询；30 秒无数据时显示超时，可手动重试。不会修改数字员工 Tag / 默认 Forge。
- B6-D：MCP 工具详情区分初次加载、真实空列表、失败，允许刷新，旧服务器回包不覆盖当前服务器。调用历史在现有 MCP 面板右上按钮弹窗中打开；默认全部，可按成功 / 失败 / 关键词过滤、分页去重；详情含参数、结果 / 错误切换、调用方 / 会话 / 耗时。清理按当前筛选二次确认。客户端 proto 和三个 MCP history RPC / IPC 对齐固定参考；新增 IPC 校验可信发送方，缺失方法明确报错；不改已有 MCP 连接凭证。

## 自动验证

- 完整回归：**68 个文件 / 479 条通过**，相对批前 60 文件 / 399 条增加 80 条。包含前批文件搜索、模型配置、任务快照 / 三视图、时间线 Dump、数字员工、Goal、上下文配置和授权保护。文件清单 `.codex-run/batch2-test-files.json`；JSON 报告 `.codex-run/memfit-batch2-20261104.json`；日志 `.codex-run/batch2-full-regression.log`。Vitest 0.34 的 `numPassedTestSuites` 含 describe，不当作文件数；实际文件数取 `testResults.length`。
- 新 / 适配回归：正式 ID 与 token、首问一次、握手失败 / 超时 / 重试 / 取消、异步桥接参数固定 / 卸载、旧连接隔离、缓存保留、关闭 / 删除屏障、事务 abort / reopen、技能回执早于数据 / 分页 / 超时 / 文档安全 / 不修改 Forge、MCP 加载 / 旧响应 / 历史筛选详情 / IPC 信任 / 实际 protobuf 往返。
- 主渲染 `tsc --noEmit` 独立运行，最终退出码 **0**，日志 `.codex-run/batch2-tsc.log`。
- 测试中的 React18 / RTL11 旧 render 提示和预期失败模拟日志不作为真实引擎结果。不升级依赖。
- 静态编译：最终 `webpack compiled with 7 warnings`，无错误。日志 `.codex-run/batch2-build-final.log`。首次编译仅有 import/first 错误（分页常量在 imports 前），已改正顺序；原失败日志 `.codex-run/batch2-build.log` 保留。
- 构建成功后出现额外 watch 编译，已停止确认身份的真实编译器，保留成功生成的静态产物；18 个 HTML 资源引用齐全，所有入口脚本 HTTP 200 且为 JavaScript。三种语言、三个命名空间共九份 locale 与源文件逐字节匹配。
- 实际客户端显示待用户确认：自动审批拒绝客户端启动，仅返回 `blocked by policy`，没有更具体原因；未换命令或其他工具绕过。

## 具体人工入口与验收边界

见 [逐页面 / 按钮人工指南：第二批七项](../MEMFIT_MANUAL_TEST_GUIDE.md#第二批七项2026-11-04从这里开始测试)。简要入口：数字员工工作区内新建 / 历史对话对应 B4；会话顶栏“技能”对应 B5；左下“⋯ 会话与设置 → MCP → 调用历史”对应 B6-D。

本轮不主动制造重要会话删除、磁盘失败或真实网络故障。可控异步、磁盘与 IPC 由自动用例模拟；真实引擎技能加载 / MCP 记录、视觉与输入手感仍待用户最终验收。未修改、下载、替换或编译引擎，未升级全局依赖，未提交 / 推送。

## 构建与运行记录

最终编译成功后已停止本项目真实编译器 PID 21880（PID 仅追溯，下一轮重新核实），未同时运行 tsc。首次停止后端口释放稍有延迟，安全检查阻止立即启动；确认 18080 已空闲后再恢复静态服务，没有抢占其他服务。

当前静态服务 18080，PID 19196；连接页 Vite 19080，PID 18044，均已实测 HTTP 200。本轮未重启或改动 19080。九份 locale（aiAgent / layout / configNetwork × zh / zh-TW / en）已复制至 app/renderer/pages/main/locales，逐字节核对相同。入口 HTML 引用的 18 项资源存在，所有脚本请求返回 JavaScript。只读检查报告 `.codex-run/batch2-static-check.json`。编译器退出后可用内存约 8.75 GiB。

自动审批拒绝了包含开发客户端启动的操作，工具只返回 `blocked by policy`，未说明具体原因；该操作没有执行。后续只做静态服务与资源的只读验证，没有创建或改写启动助手、改用其他接口启动以绕过拒绝。客户端未自动打开，**本批白屏 / 实际渲染未验证**，不将 HTTP 200 和自动测试冒充窗口显示成功。原正常启动脚本 `.codex-run/start-b3bd-electron.ps1` 保留，用户可按 [测试指南](../MEMFIT_MANUAL_TEST_GUIDE.md) 手动打开客户端再验收。此状态与上一版用户已确认的“已恢复正常显示”分别记录。

下批剩余：B2-C、B7-A / B7-B / B7-C、B9-A / B9-B / B9-C，共七项。本批不自动迁入。


## 用户要求启动与新窗口交接（2026-11-04 后续）

用户明确要求“启动客户端并且给我提示词和交接文档”，随后使用既有普通脚本 `.codex-run/start-b3bd-electron.ps1` 启动成功；没有重编译、没有动引擎、没有开放调试端口。日志 `print-log-20261104160347.txt` 记录连接页 did-finish-load；本轮主窗口原生截图采集返回 `FrameArrived timed out: timed out waiting on channel`。用户随即明确回复“启动了 我自己检查即可，你写交接文档和新窗口提示词吧”，已停止后续窗口检查。仅确认客户端启动，不宣称本批视觉与真实引擎验收通过。

已整理 [当前交接快照](../HANDOFF-2026-11-04-BATCH2-NEXT-CHAT.md) 和 [可复制提示词](../NEXT_CHAT_PROMPT-2026-11-04.md)。现有工作区和静态服务保留，第三批尚未编码。
