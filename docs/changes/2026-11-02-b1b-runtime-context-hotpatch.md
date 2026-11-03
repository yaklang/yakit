# B1-B：当前会话运行时上下文阈值热更新

日期：2026-11-02。客户端沿用固定官方前端快照 `9fc639fbb677eaa538132b2afa749555b3b14791`。引擎由另一位同事维护，按用户要求默认官方最新版已就绪，本任务不构建、替换或升级引擎。

## 用户可见变化与验收

1. 进入数字员工对话，点击输入框下方的齿轮配置，新增“运行时上下文大小”。整体 AI Senso 风格不变，弹层标签比例作局部调整。
2. 新会话显示全局默认值；已有会话读取自己的 `StartParams.RuntimeContextSizeLimit`，除以 1024 显示。全局设置页继续作为新会话默认配置，不会覆盖当前会话阈值。
3. 在运行中的会话输入 600，客户端仅向当前会话发送官方 `IsConfigHotpatch: true`、`HotpatchType: RuntimeContextSizeLimit`、`Params.RuntimeContextSizeLimit: 614400`。不会新建对话或插入用户消息，同时保存 600 作为新会话默认值。
4. 快捷输入沿用参考前端规则：最小 60、整数；较小数值失焦后校正为 60，小数失焦后取整。清空不发送重置，重开弹层恢复当前会话值。全局设置页仍支持 0 / 留空使用引擎默认。
5. 未连接、已停止、ID 不匹配或历史恢复期间不记成会话已发送的配置，只保存新会话默认值。重新打开会显示当前会话原值，可恢复连接后重试。
6. 切换会话后再调阈值，只更新新选中的会话；连续调整阈值及同步意图识别不会丢失另一个配置。历史列表合并部分 `StartParams`，保留 Forge、Strategy、附件和其他参数。

沿用官方前端的发送边界：`onSend` 返回 boolean 表示客户端通过连接 / 历史加载等守卫并提交 IPC，不代表引擎已回执、压缩已完成或数据已经落盘。本批不增加引擎确认协议，不把发送接受显示为执行成功，也未声称覆盖所有异步 IPC / gRPC 写入失败。

## 引擎源码核对

用户指定目录：`D:\360MoveData\Users\Titee_G\Desktop\yaklang_backed`，来源 `https://github.com/yaklang/yaklang.git`。

- 执行了 `git pull --ff-only`；本地 `xdr_yx` 与远端重写后的分支分叉，快进合并被 Git 拒绝。保留本地 `ca952e326188c24c5fea9aa2b2e596351b8a03e6` 和干净工作区，没有 reset、rebase、merge 或切换分支。
- 随后执行 `git fetch --no-tags origin main:refs/remotes/origin/main` 成功，用 `git show origin/main:路径` 只读查看更新后的官方代码。最新核对 SHA 为 `d705e2a1a0468fc7fda23f2b0fead3ebecd2c431`，提交时间 2026-11-02 15:18:34 +08:00。工作区文件仍在原分支，不能把它们当作最新 main 文件读取。
- `common/ai/aid/aicommon/config_hotpatch.go`：官方热补丁名为 `RuntimeContextSizeLimit`，读取同名启动参数，旧 `TimelineContentSizeLimit` 不参与该热补丁；持久化时只合并目标字段。
- `common/ai/aid/aicommon/config_hotpatch_test.go`：上游已有更新运行时阈值及持久化启动参数、保留其他参数的测试。本任务只阅读，未运行 Go 测试或修改引擎。

单位记录：固定前端快照使用 KB / K 展示并乘 1024 下发；本轮保留该 UI 和换算。最新引擎 `config.go` 将内部阈值注释为 token，因此不能把 UI 的 KB 标注解释成引擎物理内存字节限制。该前后端命名差异已记录，后续与引擎同事或新一轮官方前端同步时统一，不在 B1-B 中自行改写协议数值。

## 实现及验证

- `AIReActTaskChat.tsx`、类型及三语文案：既有输入配置弹层增项；`useRuntimeContextSizeLimit.ts` 处理显示来源。
- `useChatIPC.ts`、`ChatMultiSessionController.ts`、默认 Context：透传发送接受结果；断连、历史恢复和同步发送异常返回 false，避免未发送的配置更新会话快照。
- `AIAgent.tsx`：会话阈值来自会话自身，隔离全局新会话默认值。
- `historyChat/sessionUpdates.ts`、`HistoryChat.tsx`：部分启动参数合并，避免覆盖数字员工 Forge。
- 新增 UI / 控制器 / hook / 历史合并用例，扩展真实 protobuf 序列化测试。B1-B 新增 30 条，与 B1-A、启动修复及定制保护回归合计 **27 个文件、136 条测试通过**；主渲染 `tsc --noEmit` 通过。
- 报告：本地 `.codex-run/memfit-b1b-verified-20261102.json`；日志 `.codex-run/memfit-b1b-regression.log`、`.codex-run/memfit-b1b-tsc.log`。保留旧 Testing Library / Vite 的兼容警告，未升级依赖。
- 新版引擎真实热更新、界面实机视觉及安装包验收仍待人工完成。本批未重打生产安装包。

### 本地开发检查内存

恢复开发服务时，webpack 已完成编译，但后续增量检查中的 `fork-ts-checker` 子进程触及默认 2048 MB 堆限制并退出，连带开发服务停止；独立 `tsc` 已通过，这不是本批类型错误。`config-overrides.js` 增加仅开发模式、显式设置环境变量时生效的内存配置：`YAKIT_DEV_TSC_MEMORY_LIMIT_MB=4096`。本次临时启动脚本使用该值，已实际加载 webpack 配置确认检查器获得 4096 MB；生产模式及未配置该变量时维持原行为。开发服务使用主前端 18080、连接页 19080，临时脚本和日志留在忽略的 `.codex-run/`。

恢复后开发 webpack 编译通过（7 条警告），主页面、`static/js/main.bundle.js` 以及连接页均返回 HTTP 200；独立 TypeScript 检查通过。此启动检查不代表已完成真实引擎热补丁验收。

本批未迁入 Strategy / Goal、会话 ID 重构、看板、单模型模式或时间线 Dump。下一功能单元为 B2-A；先验收当前齿轮配置入口。回退仅撤销 B1-B 客户端变更，不清空历史或修改引擎数据库。
