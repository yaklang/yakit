# 剩余 21 项三批交付：第一批七项

2026-11-04 后续人工反馈已修复，最新验证为 60 文件 / 399 条；见 [修复记录](2026-11-04-batch1-ui-feedback.md) 和 [逐按钮测试指南](../MEMFIT_MANUAL_TEST_GUIDE.md)。下方 392 条为第一批最初交付结果。

日期：2026-11-03（Asia/Shanghai）。状态：七项代码、自动回归、类型检查与开发页面生成完成，轻量验收服务和客户端已恢复。真实引擎和人工视觉由用户最后集中验收，不作为下一批的默认等待条件。

本批为 B6-A / B6-B / B6-C、B8-A / B8-B / B8-C / B8-D。此前 8 项保留，完成后总计 15 / 29，剩余 14 项。HEAD 保持 `d2cc5db82`；没有新提交、推送、全仓合并、依赖升级或引擎操作。既有工作区改动、`outputs/` 及零字节 `2140` / `2672` / `2852` / `3460` 均保留。

## 固定参考与本地适配

参考只读目录 `D:\qianduan\cankaodeYAKIT\_memfit`，本批再次核实 SHA `9fc639fbb677eaa538132b2afa749555b3b14791`，工作区干净。下列源路径简写 `src/` 为 `app/renderer/src/main/src/`。

| 单元 | 固定参考实现 | 本地实施边界 |
| --- | --- | --- |
| B6-A | `src/pages/aiTool/`、`src/pages/ai-agent/forgeName/ForgeName.tsx` | 工具库多选 / 全选、单项及批量导出、导入。全选逐页解析当前已提交查询并排除取消项，只发送明确 ToolNames，失败不导出残缺集合；保留 Forge 原导入导出。修正加载中发起新查询被丢弃及迟到结果覆盖的问题 |
| B6-B | `src/components/FileTreeContentSearch/`、欢迎页 FileTreeSearchView | 搜索接在当前会话文件系统面板，范围为已有 AI / 用户文件树或已打开预览文件。关键词 / 正则 / 大小写、取消、点击命中定位；沿用 RequestYakURL 与现有文件权限。主进程取消按窗口 + token 隔离，关闭窗口取消其请求 |
| B6-C | 文件树搜索结果及 FilePreview 交互 | 多预览标签按路径去重，关闭切邻近文件，保存各文件高亮；会话切换清理预览。沿用原文件读取、大小限制、二进制提示及只读编辑器，并忽略迟到读取 |
| B8-A | `src/components/configNetwork/YakScriptModelFields.tsx`、`yakProviderExample.yak`、provider 配置 | Yak 脚本厂商、模型名、脚本及原生工具调用开关；编辑器按当前组件静态加载、显式 value / setValue 桥接 AntD4 表单。脚本配置隔离旧 API 凭据；普通模型保留 APIType / endpoint / headers / ExtraParams；脚本不走普通模型发现 |
| B8-B | 全局模型配置、会话设置及官方 proto | 全局和新会话单模型开关，默认 false。全局开启覆盖会话显示；已创建会话锁定，不伪造热更新；启动序列化传 SingleModelMode |
| B8-C | `aiModelForm/reasoningEffort.ts`、推理强度选择 / ProbeReasoningEffort | 表单及输入区的强度选择；旧 middle / none 等归一，保留已存扩展值。显式点击才探测 xhigh / max，15 秒超时可重试；临时失败不缓存不支持结论，过期探测不覆盖新模型 / 手动选择，在线受管模型只读 |
| B8-D | `useTimelineDump.ts`、TimelineDumpButton、timeline sync | 时间线面板 Dump 刷新复制。复用当前按会话 store / 官方同步类型，补真实回包处理；同步回执不当成内容。失败 / 超时保留缓存、空内容禁复制、复制失败可见，关闭和切会话隔离请求 |

本地 React 18 / AntD4 / CRA 保持不变，使用现有 Outline / Solid 图标、Dropdown visible API 和三语 public/locales。参考的 locale 位于 `src/locales`，不能整目录覆盖当前结构。模型 provider 表单转换提取到 `providerFormConfig.ts` 并兼容原文件 re-export，避免探测动态导入完整编辑器 / 设置页面。

协议只增加官方客户端字段 / RPC：ThirdPartyApplicationConfig Script=25 / EnableNativeToolCalling=26，AIStartParams SingleModelMode=50，AIGlobalConfig SingleModelMode=11，AIModelConfig ProbedExtendedEfforts=6 / EffortProbed=7，ProbeReasoningEffort 请求 Config=1 / Model=2 和响应四字段。没有引擎实现或二进制变动。

## 自动验证

最终回归 **58 文件 / 392 条通过**（此前 43 文件 / 300 条加本批 92 条），主渲染 `tsc --noEmit` 退出码 **0**，Prettier 与 `git diff --check` 通过。新增覆盖工具跨页选择和查询竞态、内容搜索协议 / 高亮 / 多根与取消、窗口取消归属、预览标签和迟到读取、脚本表单与配置往返、单模型锁定及真实 protobuf 编码、推理探测竞态、Dump 真实控制器路由 / 回执 / 超时 / 复制。既有数字员工、Forge / 附件、历史、授权与文件策略保护回归继续执行。

报告 `.codex-run/memfit-final7-batch1-20261103.json`；完整命令文件列表 `.codex-run/final7-batch1-test-files.json`（Vitest 会将同一文件的 Windows 路径重复入参归一）；回归日志 `.codex-run/final7-batch1-regression.log`；类型日志 `.codex-run/final7-batch1-tsc.log`。使用现有 Vitest 0.34.6 / RTL11，既有 ReactDOM.render 和 Vite CJS 提示不通过升级依赖规避。

## 用户最终人工测试清单

可留到三批完成后统一执行。每项需记录实际官方引擎版本；自动测试没有连接真实引擎，不表示下列已验收。

1. **工具库**：搜索后选两个工具导出，再试全选并取消一个；检查包内名单准确，输入尚未提交的新关键词不改变导出范围。导入一个测试包，确认进度成功后刷新、选择清空，失败不误报成功；原 Forge 导入导出仍可用。
2. **会话文件系统 → 文件内容搜索**：打开本地授权目录，分别用关键词 / 正则、大小写开关及“当前打开的文件”搜索；点击命中行应打开对应文件并高亮。取消搜索、快速换范围和会话后旧结果不得串入；无结果 / 不支持 / 失败应有反馈。
3. **同一文件系统的预览区**：连续打开多个文件，来回切标签、关闭当前及最后一个；重复打开不生成重名副本；大文件和二进制沿用提示，切会话后旧预览消失，搜索高亮随文件切换。
4. **模型配置 → 新增 / 编辑 → Yak 脚本模型**：填写模型名、脚本，切原生工具调用，保存并重新打开，确认脚本和开关保留；空脚本不允许保存。再检查普通模型的 API 类型、endpoint、自定义 headers 和扩展参数不丢失。实际脚本调用由真实引擎验收。
5. **模型全局设置 / 新会话输入齿轮 / 会话默认设置**：开关单模型模式，新会话发问后确认只用高质模型；全局开启时会话受其覆盖；已建立会话的开关应锁定。关闭全局后原默认与历史参数保持正确。
6. **输入区推理强度 / 模型编辑高级设置**：选择基础强度并重新打开确认保存；点“探测强度”后仅显示确认支持的 xhigh / max。探测中切模型或手动选值，旧结果不得覆盖新值；断网 / 不支持 / 超时可重试，在线受管配置不能误修改。
7. **运行中会话 → 时间线 → 时间线 Dump**：打开应拉取真实内容，刷新、复制并核对剪贴板；断开 / 超时后上次内容保留，空内容不可复制；切会话不得显示另一会话 Dump。停止会话不能继续刷新。

同时顺带核对品牌配色、数字员工 / Forge 选择、附件资源、历史恢复、Plan 默认、日志按钮、Goal、任务三视图 / 状态排序没有回归。至少检查 1280×720 与 1920×1080，关注输入区新增强度控件和文件搜索面板空间；未建立本批人工视觉通过结论。

## 页面生成和下一批

静态 18080 不热更新。先独立 tsc；确认退出后启动单个 webpack（YAKIT_DEV_EXTERNAL_TYPECHECK=true，Node heap 8192），生成成功后停止真实编译 Node。同步三语 **aiAgent.json 与 configNetwork.json** 到 `app/renderer/pages/main/locales/`，恢复静态 18080 / Vite 19080 后重启当前项目 Electron，沿用会话临时 `--disable-gpu`；不改系统 GPU 设置，不启动第二套大编译器。

下一批七项：B4-A / B4-B / B4-C → B5-A / B5-B / B5-C → B6-D。先会话生命周期和当前 Forge / 附件启动基线，分段验证后再接技能 / MCP。第三批：B2-C + B7-A / B7-B / B7-C + B9-A / B9-B / B9-C。不在本批提前宣称这些已完成。


## 本批最终页面与运行记录

开发 webpack 最终成功：`webpack compiled with 7 warnings`（CSS / Hook 等非阻断警告）。初次构建因模块 re-export 位于 import 之间触发 ESLint 错误，已移到所有 import 之后；增量重编译内存持续增长，主动结束后单独重新生成成功，未叠加编译器。最终日志 `.codex-run/final7-batch1-build-final.log`；失败过程日志保留为 `.codex-run/final7-batch1-build-initial.log` 等，不把阶段错误当作最终结果。

生成成功后已停止确认身份的编译 Node（当时 PID 9756），逐字节核对三语 aiAgent.json / configNetwork.json 六份同步一致，恢复静态 18080（当时 PID 17212）并沿用现有临时 `--disable-gpu` 脚本重启本项目 Electron（主进程当时 PID 23808）。连接页 19080 保持原 Vite 服务。主页面、主 bundle、两份中文 namespace 和连接页 HEAD 都为 200；检查时没有常驻 webpack / tsc，空闲物理内存约 8.9 GiB。

进程元数据 `.codex-run/final7-batch1-preview-session.json`；启动日志 `.codex-run/final7-batch1-electron.log` / `.stdout.log`，只作本机追溯。后续先核实真实 PID，不能按本文数字全局杀进程。此处是静态资源、进程和启动链路检查，未做本批人工视觉、真实模型 / 文件搜索 / Dump 执行或生产安装包验收。此前 Milkdown 日志问题没有据此宣布修复，用户此前确认显示及输入可用的反馈仍按原边界记录。
