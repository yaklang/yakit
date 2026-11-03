# 聊天页日志按钮无反应修复

日期：2026-11-02。属于验收缺陷修正，不新增增量计划功能子项。

## 原因和行为

聊天页按钮经 `useAiChatLog` 调用 `open-ai-chat-log-window`，应打开独立的实时日志窗口，无需先选择 Plan / Goal，也不需要修改引擎。

实际主界面使用 `YAKIT_DEV_RENDERER_URL=http://127.0.0.1:18080`；`AuxWindowManager.buildAuxAppLoadTarget` 却固定访问 `http://127.0.0.1:3000/yakit-aux.html`。用户点击期间的 Electron 日志记录该地址 `ERR_CONNECTION_REFUSED`。辅助窗口默认隐藏，加载失败后关闭，因此表现为无反应。

现在开发 / 本地验收模式根据主渲染器地址解析同目录 `yakit-aux.html`，再加入当前 windowId / route / title 查询参数；未设置变量时仍使用 3000，生产仍加载安装包中的本地 HTML。共用该管理器的引擎控制台、并发流窗口也获得相同地址修正。无布局、权限、协议、日志内容或引擎变更。

## 文件和验证

- 修改 `app/main/handlers/auxWindowManager/AuxWindowManager.js`。
- 新增 `app/main/__test__/auxWindowManager.test.js`，7 条用例覆盖自定义端口、空值默认、路径与查询参数、生产本地文件，以及真实日志 IPC → 管理器 → 加载显示 / 已开窗口聚焦 / 日志推送回放 / 关闭重开。
- 首次定向回归：`auxWindowManager.test.js`、`engineLinkIPC.test.js`、`security.test.js`，**3 文件 / 11 条通过**；日志 `.codex-run/chat-log-window-test.log`。2026-11-03 按用户要求提交前，再将新增 7 条加入原 219 条完整集合，最终 **38 文件 / 226 条通过**；报告 `.codex-run/memfit-commit-verified-20261103.json`。
- 真实 Electron 烟测使用独立测试窗口和测试配置，调用真实日志 IPC、管理器及已生成的辅助渲染页面；确认窗口 URL 端口 18080、可见、xterm 已挂载、日志推送已接收，并截图检查测试文本实际显示。测试日志为人工构造，不等同于真实引擎业务验收。
- 烟测报告 `.codex-run/chat-log-window-smoke.json`，截图 `.codex-run/chat-log-window-smoke.png`，脚本 `.codex-run/smoke-chat-log-window.cjs`，退出码 0。

```powershell
node node_modules/vitest/vitest.mjs run app/main/__test__/auxWindowManager.test.js app/main/__test__/engineLinkIPC.test.js app/main/__test__/security.test.js --threads=false
```

本次只更改主进程，无需重编译已生成的前端。本地客户端已按原有启动流程重启使修复生效，18080 / 19080 轻量服务保持运行，未替换或编译引擎。启动日志 `.codex-run/chat-log-fixed-electron.log`。后续重新打包时自然包含主进程修正，本次没有生成安装包。

## 人工复测

1. 按原有启动页完成工作区和引擎连接，进入任一聊天页。
2. 点击“日志”，应出现 AI Chat Log 窗口；无日志时空白终端正常，但应有独立窗口。
3. 产生会话输出，查看窗口实时更新；关闭后再点击应可重开。

补充：此功能原有行为是再次点击“日志”切换关闭，日志窗口的会话归属 / 筛选策略本次未改。
