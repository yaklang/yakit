# 第三批参考核对与中间状态（2026-11-04）

本记录是未完成状态，不改变 22/29 的功能计数。用户正自行测试已启动客户端，不重启、不操作窗口；启动不代表视觉或真实引擎验收。

- 固定参考 `D:/qianduan/cankaodeYAKIT/_memfit` 工作树干净，HEAD 为 `9fc639fbb677eaa538132b2afa749555b3b14791`。本项目 HEAD 仍为 `d2cc5db82`；已有修改和未跟踪文件均保留。
- B2-C：只移入 `aiMilkdownModeSlash/modeSlashQuery.ts` 与官方对应测试，未接入编辑器、未完成 B2-C。独立测试 1 文件 / 15 条通过。它限制行首或空白后的斜杠，排除 URL / 路径，仅删除命令区间。参考的 `AIMilkdownModeSlash.tsx` 还依赖模式 hook、定位常量、弹层互斥、重开 store、三语文案及图标库；本地 `useAIRunMode` 有自己的热补丁回执和互斥归一化逻辑，不能覆盖。现有 mention 未接互斥，编辑器提交 Enter 已检查 `nativeEvent.isComposing`；新插件也必须单独覆盖中文输入组合及默认 Forge mention。参考图标库本地并无声明，应适配既有图标，不升级依赖。
- B7：参考入口集中在 `pages/layout/mainOperatorContent/useOpenAIAgentPage.ts`、`mergeAIAgentPageTabs.ts`、`MainOperatorContent.tsx`；定时运行等待逻辑在 `aiScheduledTasks/waitForAISessionPush.ts`。参考等待函数接受任意 `ai_session` 推送，迁入前须核实如何将推送与本次定时任务关联，避免同时到来的其他会话被打开。仍需交叉核对本地数字员工、快捷导航、持久化和 B4 token / 生命周期，尚未实施。
- B9：参考客户端原生部分包括 `app/main/handlers/ytrayControl.js`、`managedBrowserProfiles.js`、`ipc.js` 和 `preload.js`；前端包括 `browserInstances/`、`aiBrowserHandoffCard/` 及流处理。配对、引用、历史与受信 IPC 要整体核对并做权限和失败测试；YTray / 扩展 / 引擎真实环境验收与自动测试分开。尚未实施。
- 本次没有编译或重启客户端，没有同步 locale；未修改引擎、依赖、授权或文件权限，没有提交或推送。继续工作仍须按原交接顺序完成测试、独立类型检查和单次 webpack；不要为构建擅自停止用户当前客户端。
