# 第一批人工反馈修复：文件搜索、下拉焦点和探测反馈

日期：2026-11-04（Asia/Shanghai）。本次从用户 2026-11-03 的两张截图与反馈继续，优先修复回归，没有叠加第二批功能。功能计数仍为 **15 / 29 已实施、14 项待实施**。HEAD 仍为 `d2cc5db82`；保留全部已有改动、`outputs/`、`2140`、`2672`、`2852`、`3460`，未提交 / 推送、不动引擎或全局依赖。

用户确认截图中的任务已结束，可重新加载客户端。以下为代码及自动验证完成状态，不能替代用户真实视觉 / 引擎复验。

## 修复与证据

| 反馈 | 修改 | 验证边界 |
| --- | --- | --- |
| 文件搜索控件堆叠、文字与搜索框挤压 | 新增 FileContentSearchPanel.module.scss；范围 / 匹配方式用两列网格，Select 设置外层 wrapperStyle 宽度及 minWidth；复选框独立行并覆盖通用 16px 包装尺寸；搜索框独立行，结果限制高度 | 控件操作新增范围 / 正则 / 大小写 / Enter / 取消连接回归。jsdom 不计算真实布局，实际缩放和窄屏仍待用户核验 |
| 点击模型 / 强度下拉闪开即关 | 输入区外容器点击会调用 Milkdown view.focus()；新增 InputToolbar，为上下两组操作区阻止点击向编辑器容器冒泡，保留内部按钮动作；底部允许换行 | 使用真实 AntD Select 验证打开后 180ms 仍展开、选择成功、不抢回输入框焦点；按钮仍工作，正常点输入框仍可聚焦 |
| 探测只转圈、没有用途和结果说明 | 输入区探测按钮弹层解释仅检测 xhigh / max；显示正在探测、支持档位、不支持、失败、15 秒超时和保存失败。确认支持后选项立即可见，强度不自动切换；模型表单高级配置同步加说明 / 状态 | 支持、不支持、连接失败、超时、保存失败，以及旧模型 / 手动选择竞态回归通过。未主动消耗真实模型调用验证供应方能力 |
| 不知道其余功能入口 | 新增 [逐按钮人工测试指南](../MEMFIT_MANUAL_TEST_GUIDE.md)，说明主导航工具库、左下“会话与设置”、AI模型的＋ / 齿轮 / 铅笔、输入齿轮、文件夹图标、预览 × 和时间线 Dump | 入口按现有组件及中文 locale 核对，没有凭参考版的新布局编造入口。提供本机 .codex-run/manual-search-check 下 a.txt / b.txt，供大小写 / 正则 / 预览手工测试 |

## 自动验证和运行恢复

- **60 个文件 / 399 条回归通过**，其中本次在 392 条基础上新增 7 条。报告 `.codex-run/memfit-feedback-20261103.json`；日志 `.codex-run/feedback-regression.log`。报告文件名保留本次反馈开始日期；回归实际阶段时间见 JSON，最终交接记录为 2026-11-04。
- 主渲染 `tsc --noEmit` 退出码 **0**；日志 `.codex-run/feedback-tsc-20261104.log`。修正一处测试 beforeEach 隐式返回类型后通过，没有变更业务语义。
- 开发 webpack 成功，**7 条非阻断 CSS / Hook 类警告**，日志 `.codex-run/feedback-build-20261104.log`。不与 tsc 并行，成功后停止核实身份的编译 Node（当时 PID 10444）。
- 三语 `aiAgent.json` 和 `configNetwork.json` 六份文件与静态目录逐字节一致；新增探测文案三语齐全。
- 18080 轻量静态服务已恢复（当时 PID 8916），19080 连接页 Vite 已恢复；主页面 / bundle / locale / 连接页响应检查见本机记录。沿用 `.codex-run/start-b3bd-electron.ps1` 临时 `--disable-gpu` 启动客户端（主进程当时 PID 2456），未改系统 GPU 设置。PID 仅追溯，后续先重新确认。
- Computer Use 新版本重新选择窗口并激活后截图仍失败：`FrameArrived timed out: timed out waiting on channel`；重新选择后第二次 `window capture timed out: timed out waiting on channel`。没有复用失效坐标或宣称视觉通过。此前用户“显示和输入正常”的确认保持原边界。
- 启动日志记录过 Network service crashed, restarting service；没有将其当作本轮新组件回归或声称已修复。没有因日志操作引擎。启动 / 进程日志不能证明主界面完整显示；如客户端停在连接页，按原有工作区 / 引擎连接流程进入。

运行元数据 `.codex-run/feedback-preview-session-20261104.json`；启动日志 `.codex-run/feedback-electron-20261104.stdout.log` / `.log`；连接页日志 `.codex-run/feedback-link-20261104.stdout.log`。辅助文件在 .codex-run 中，不提交。

## 继续工作

先结合用户对本次三处修复的复验反馈；若有回归优先修复。既定下一批七项仍为 B4-A / B4-B / B4-C → B5-A / B5-B / B5-C → B6-D，第三批为 B2-C + B7 三项 + B9 三项。用户负责最后集中人工测试，不因单纯等待人工结果默认停止后续授权工作。
