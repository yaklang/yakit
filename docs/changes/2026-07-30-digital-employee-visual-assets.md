# 数字员工 Logo、图标与折叠箭头优化

日期：2026-07-30

## 目标

- 修正左侧员工栏展开/收起箭头的垂直位置。
- 去除 AI SenPike Logo 的白色矩形底，使其自然融入浅蓝主题。
- 替换选择页人物以外的低分辨率截图裁片，避免高分屏和响应式缩放时发糊。

## 实现

- 以现有正确的 `AI SenPike` Logo 为参考生成纯绿色键控底高清版本，再通过软边缘、去溢色流程输出 `ai-senpike-logo-transparent-v2.png`；选择页和工作区头部统一引用该透明素材，并移除 `mix-blend-mode` 适配。
- 折叠按钮从文字 `‹` / `›` 改为项目内置 `OutlineChevronleftIcon` / `OutlineChevronrightIcon`，SVG 与包装层固定 16×16、块级显示，由 28×28 Grid 按钮居中。
- 选择页 8 个员工徽章按员工职责映射到项目内置 Outline SVG，颜色读取现有员工 `accent`。
- 6 个快捷入口分别改为机器人、安全盾牌、知识书本、拼图、记忆电路脑、数据库 SVG，并增加统一的浅蓝图标容器。
- 从 `DigitalEmployeeDefinition` 移除不再使用的 `badge` 位图字段和导入；旧 PNG 继续保留在素材目录，作为原始参考而不进入当前渲染链路。
- 更新素材清单，补充 Logo 规格与旧低清图标停用说明。

## 验证

- `yarn tsc --noEmit -p tsconfig.json`：通过。
- 数字员工与消息回显定向测试：4 个文件、13 项通过。
- 选择页定向复跑：1 个文件、3 项通过。
- 新增断言确认 8 个员工徽章与 6 个快捷入口均为 SVG，员工卡只保留人物位图。
- `git diff --check`：通过。
- 2800 Memfit 热更新日志：`No issues found`。

## 视觉复核说明

Windows 桌面截图助手本轮无法读取 Electron 窗口，返回 `SetIsBorderRequired failed (0x80004002)`；普通浏览器缺少 Electron IPC 注入，不能替代应用页面验收。下一窗口应在当前 Electron 中人工确认：Logo 无白底且尺寸协调、所有选择页图标边缘清晰、左右折叠箭头均垂直居中。

## 边界

本轮只修改素材、图标渲染和样式，没有改动聊天、mention、IPC、模型请求、员工切换或任务进度数据逻辑。
