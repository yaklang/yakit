# 新窗口可复制提示词

```text
继续 AI Senso / Memfit 增量更新项目。

目录：D:\360MoveData\Users\Titee_G\Desktop\aiSenPike\yakit-memfit-AISenPike

先读取：
1. docs/HANDOFF-2026-11-04-BATCH2-NEXT-CHAT.md（当前快照，优先于旧进度）
2. docs/HANDOFF-2026-11-02-NEXT-CHAT.md（保留原文件名）
3. docs/HANDOFF.md
4. docs/MEMFIT_INCREMENTAL_UPDATE_PLAN.md
5. docs/MEMFIT_INCREMENTAL_TEST_MATRIX.md
6. docs/UPSTREAM_SYNC.md
7. docs/changes/2026-11-04-batch2-sessions-skills-mcp.md
8. docs/MEMFIT_MANUAL_TEST_GUIDE.md

检查 Git 状态和日志，保留全部现有修改及未跟踪 outputs/、2140、2672、2852、3460；不要清理或覆盖。HEAD 仍为 d2cc5db82，前一功能提交 3f1ae975f，多批功能尚未提交。

当前已实施 22/29，剩余7项。第二批 B4-A/B/C（会话稳定性）、B5-A/B/C（技能）、B6-D（MCP）已实施，不重复迁入。最新完整回归68文件、479测试通过；独立类型检查通过；webpack成功、7条非阻断警告；九份locale同步，18080/19080服务就绪。客户端已按用户要求启动，用户确认“启动了，我自己检查即可”，随后要求停止窗口检查、只写交接。不要无故重启或操作当前窗口，也不要把启动确认记为功能或视觉验收通过。

若我带回测试问题，先修复回归；否则继续第三批最后7项：B2-C输入框 / 命令、B7-A/B/C多会话页签/缓存恢复/定时任务打开会话、B9-A/B/C浏览器桥接配对/实例引用/YTray恢复。先核实固定参考与依赖，简要说明范围后编码，补回归、相关检查、进度和交接记录。B9真实扩展/YTray依赖与自动测试分开记录，不能只复制面板便声称端到端完成。真实人工测试由我负责，结束后给出具体页面、按钮、操作与预期结果。

长期约束：
- 固定前端参考 D:\qianduan\cankaodeYAKIT\_memfit，SHA 9fc639fbb677eaa538132b2afa749555b3b14791；按功能增量迁入，不整仓合并，不顺带升级全局依赖。
- 保持AI Senso品牌、配色和整体风格；保留数字员工、Forge、附件、历史恢复、授权与文件权限。
- 引擎由同事维护，默认官方最新版就绪；不修改、下载、替换或编译引擎。
- 保留本地缓存读取与历史恢复策略，不迁入参考版启动即清空全部IDB的行为；取消连接不新增删除附件目录。
- 当前静态页不会热更新。先读交接中的内存/locale/启动说明：测试→独立tsc并退出→单个webpack→成功后退出真实编译器→同步aiAgent/layout/configNetwork三命名空间三种语言共九份locale→服务就绪后再客户端。不要同时跑tsc和webpack，不要用HTTP200冒充显示验收。
- 之前白屏底层原因未确认；不能看到旧Milkdown日志就判定编辑器导致白屏。先依据实际加载日志、页面和用户反馈排查。
- 不自行提交、推送或发布；保留现有工作成果，真实引擎、自动测试、人工视觉结果分别记录。
```
