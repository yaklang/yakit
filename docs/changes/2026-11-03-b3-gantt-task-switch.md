# B3-B 甘特图与 B3-D 任务详情切换

日期：2026-11-03（Asia/Shanghai）。本地基线 `d2cc5db82`；本批保留工作区变更，未提交、推送或打安装包。原未跟踪 `outputs/`、`2672`、`3460` 原样保留。

## 来源与范围

只读核实 `D:\qianduan\cankaodeYAKIT\_memfit`，HEAD 为固定 `9fc639fbb677eaa538132b2afa749555b3b14791`，工作区干净。来源为参考版 `aiTaskExecutionDetails/aiTaskGantt/`、`aiTaskSelectDropdown/`，以及 `hooks/grpcApi.ts`、`grpcStreamHandler/aiTaskDetail.ts` 中的任务索引、`task_snapshot_sync` 请求和 `task_snapshot` 回包。未联网追随新的前端 HEAD，未改动或下载引擎。

本批两个独立功能子项均已实施，计划共 29 项中已实施 7 项、待实施 22 项。B3 仅余 C（状态筛选及拖拽排序）；B4 仍是 B5 / B7 的重要前置，不在本批重构会话。

## B3-B：只读甘特图

- 在原任务详情的列表 / 看板旁增加甘特图；默认仍为列表，切换任务重置为列表。数字员工原只读看板入口保留。
- 直接读取选中任务 `taskDetailsMap` 的真实 todo；五种状态、空任务及历史缺时间条目均保留。不产生任务状态写操作。
- 复用既有 `toTaskUnixSeconds`，兼容秒 / 毫秒；`created_at` / `updated_at` 序号不作为真实时间。无有效 `created_ts` 时显示“暂无时间数据”，不造条带。
- 等待和执行条带使用真实创建 / focus / 关闭时间；终态缺关闭时间时按有效 focus / survival / age 秒数推算，缺失则收成点，不随 now 增长。执行中每五秒刷新，卸载释放计时器。
- 沿用参考的时间网格与自适应刻度；修正超过八天仍锁定 24 小时刻度的问题，超长跨度扩大到整日刻度，保持 4–8 格。
- 有意偏离参考：末段不人为拉到轴终点；终态显示结束点，不按 25% / 35% 切割出未测量的成功或跳过耗时。图例按原 AI Senso 状态配色，删除仍标为“已删除”。
- 保留参考的行选中高亮，补 Enter / Space 操作与完整任务名的可访问文本。未迁入图例筛选、统计拖拽或状态排序。

## B3-D：同会话任务切换

- 标题旁使用已有 Ant Design 4 / Yakit 下拉与按钮；任务名称截断仅影响触发器，完整名称在菜单与 title 中保留。
- 会话 `session_snapshot.tasks` 为任务索引；合并当前会话 map 和当前打开任务作为兼容兜底，按 task_id 去重。其他会话的任务不进入列表。
- 选择任务发送官方 `task_snapshot_sync`，携带当前 session token、随机 SyncID 和 `{task_id}`。发送返回 false 时保留原选择；同一任务可重选重试。发送受理不等于引擎成功回包，错误 / 空回包不冒充已同步。
- 补齐 `task_snapshot` 的真实流路由与投影：execution、perception、background processes、todo 及原有 capability 桶；没有迁入 B5 技能同步 / 详情 / 加载。
- `task_snapshot.task_id` 是物化任务归属，优先于事件 envelope 的 TaskId，保持参考行为。投影中缺 scope 的根任务条目归入该任务；显式属于其他子任务的条目继续按现有逻辑过滤。
- 新增每个会话独立的任务索引和详情刷新版本，原地 map 更新也立即重读；会话索引、session snapshot、task snapshot 分别使用 revision 水位，避免乱序列表回退，也不误丢同 revision 的互补数据。
- 切换后清除初始任务目标文案，按选中任务读取统计、感知、todo 和能力；能力编辑组件随任务重新挂载，防止旧弹层状态串入。父级 taskId / 会话变化时重新初始化选择，迟到的其他任务推送只更新其自身 map 条目。

## 自动验证

- 完整回归：**41 文件 / 265 条通过**，在提交前 38 文件 / 226 条的范围追加本批 39 条。覆盖原有数字员工、Forge / 资源 / 历史、Plan / Goal / 阈值、日志窗口、授权和文件权限保护。
- 新增用例：甘特时间工具 21 条、甘特组件 4 条、详情集成追加 6 条、真实流路由快照 8 条。使用现有 Vitest 0.34.6 / RTL 11，没有升级依赖。
- 主渲染 `tsc --noEmit`：退出码 0。新增 optional revision 字段引起的映射类型索引问题已使用 `-?` 修正；技能投影只接受当前支持的 loaded / metadata / 空状态。
- 报告：`.codex-run/memfit-b3bd-verified-20261103.json`；回归日志 `.codex-run/memfit-b3bd-regression.log`；类型检查日志 `.codex-run/b3bd-tsc-final.log`。
- 样式仍由实际 webpack 编译检查；jsdom 不验证布局。保留既有 ReactDOM.render / Vite CJS 兼容警告。

复现回归：以 `.codex-run/memfit-commit-verified-20261103.json` 的 38 个 `testResults.name` 为基线，追加 `aiTaskExecutionDetails/aiTaskGantt/__test__` 与 `hooks/__test__/taskSnapshotStream.test.ts`，从根目录运行现有 Vitest，参数 `--threads=false`。

## 静态页面与人工验收

本批开发 webpack 最终编译成功（7 条既有类别的 CSS / ESLint 警告），构建日志 `.codex-run/b3bd-build.log`。新增甘特工具中的两条 no-loop-func 警告已修正，最终输出不再包含它们。独立类型检查与生成依次执行，以 `YAKIT_DEV_EXTERNAL_TYPECHECK=true` 避免重复检查器；编译完成后终止实际 webpack Node（当时 PID 25288），没有留下常驻编译器。最后再运行完整 41 文件 / 265 条回归与类型检查，均退出 0（`.codex-run/b3bd-check-results.json`）。

三语 locale 已复制到生成目录并逐字节核对一致。轻量静态服务已恢复，主页面 18080、主脚本 `/static/js/main.bundle.js` 及连接页 19080 的 HEAD 均为 200。静态服务元数据 `.codex-run/b3bd-preview-session.json`（本次 PID 18316），日志 `.codex-run/b3bd-preview.stdout.log`。源码后续修改仍须重新生成，静态服务不热更新；当前新功能已包含在本次生成中。

默认方式重启 Electron 时出现 `GPU process launch failed: error_code=2` / `GPU process isn't usable`，日志 `.codex-run/b3bd-electron.log`。当时空闲内存约 7.4 GiB，webpack 已退出；不能把它归为先前的低内存白屏或新业务代码回归，也没有证明 GPU 故障根因。以 **仅本次启动使用** 的 `--disable-gpu` 重试后，窗口列表出现 AI Senso（主 PID 24408），连接页记录 `did-finish-load`；启动脚本 `.codex-run/start-b3bd-electron.ps1`，日志 `.codex-run/b3bd-electron-software.log`。没有修改产品 / 系统 GPU 配置、授权或引擎。

Computer Use 两次窗口截图均返回 `window capture timed out: timed out waiting on channel`，已按技能要求停止采集。只能确认窗口存在和连接页加载日志，未核验窗口显示内容，更不能据此宣称主业务页面或新任务视图的人工视觉验收完成。后续日志表明主页面已加载；没有自动操作或绕过工作区 / 授权确认，但仍未核验屏幕内容。

**用户人工反馈补充：** 2026-11-03 用户人工反馈：当前 AI Senso 窗口“能正常显示和输入”。这确认当前显示与输入可用；不表示 Milkdown 日志错误已修复，也不涵盖甘特图、任务切换、员工切换、附件发送或真实引擎执行验收。

### 启动复核发现的既存问题（保留待排查）

日志后续出现两类实际错误，不能把本批启动概括为“无 Uncaught”：

- `fetch-check-yaklang-source` 请求 HTTP 400。仅记录既有启动流程的请求错误；未执行引擎检查 / 下载 / 升级、未修改引擎或相关源码。
- 10:38 左右主页面记录 `MilkdownError: Context "headingIdGenerator" not found`。对照上一轮 `.codex-run/b1b-white-screen-electron.log`，同错误已在 2026-11-02 出现，不能认定由本批任务可视化引入，也不能继续视为纯内存问题。当前尚无可靠操作复现，未盲改编辑器或升级依赖。

已检查当前 Milkdown 7.5 的 context / 插件注册与销毁路径；另用真实 MilkdownProvider / commonmark 编辑器快速重建十次做诊断，1 条诊断用例通过，未复现 heading context 缺失。该结果不能证明真实输入、mention 或员工切换无问题。临时诊断保留在 `.codex-run/milkdown-lifecycle-diagnosis.test.tsx` 和 `.codex-run/b3bd-editor-diagnosis.log`，不纳入 41 文件 / 265 条正式回归计数。用户随后确认当前窗口能正常显示和输入；不能将该日志直接视为当前白屏或输入不可用。继续保留错误线索，取得稳定操作步骤后修复；若实际复现功能回归，优先处理再叠加新功能，不根据简化测试或正常使用反馈宣称日志错误已修复。

重启过程中新增零字节未跟踪 `2140`、`2852`，已与原有 `2672`、`3460`、`outputs/` 一并保留，不提交、不清理。

下列仍为待验收，不能用自动测试或 HTTP 200 代替：

1. 有效授权与真实官方引擎会话中，产生至少两个任务并打开任务详情，确认列表默认、看板和甘特图内容及统计一致。
2. 任务 A → B → A，核对名称、目标、工具统计、感知、todo 和能力归属；B 未加载时不残留 A 的详情。运行中推送、历史任务和错误后重试均需验证。
3. 确认甘特任务缺时间、进行中、零时长、完成 / 跳过 / 删除的展示；长名称、纵横滚动、键盘焦点与关闭按钮在 1280×720 / 1920×1080 下可用。
4. 数字员工 → 默认 Forge → 附件资源 → 提问 → 完成 / 取消 → 历史恢复的原业务链；B2 Goal 的既有人工验收也仍未据本批自动回归宣称完成。

未重打生产包，未执行真实引擎任务和以上人工验收。回退仅撤销本批受影响源码与 locale；不清空会话、历史或授权，不改引擎。
