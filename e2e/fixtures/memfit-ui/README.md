# Memfit 交互 UI 自动回归

在仓库根目录运行，无需启动 Memfit、Yak 引擎或连接 LLM：

```bash
yarn test:memfit-ui:all
```

- `yarn test:memfit-ui`：现有 Vitest 用例，覆盖 Schema、流式前缀、问答队列、回执乱序、草稿、输入法、倒计时、失败重试与防重复提交，以及真实会话控制器的连接收尾与迟到回执（模拟 IPC）。
- `yarn test:memfit-ui:electron`：复用已有 WebdriverIO/Electron 依赖，构建独立测试页面，使用实际组件、校验器、Yakit 控件、主题和 SCSS。在真实 Chromium 中点击、输入、切页、开关浮层，检查发送内容及结束状态，保存截图。

首次运行可能需要下载与 Electron 匹配的 ChromeDriver。Linux 无桌面时使用 `xvfb-run -a yarn test:memfit-ui:electron`。退出非零即验证失败。

结果位于 `reports/e2e-electron/memfit-ui/<运行时间>/`：打开 `index.html` 查看按 ask 问卷、ask 表单、render_ui 展示、非法输入分组的截图效果页，点击图片查看原图；`results.json` 逐项记录结果。也会保存失败现场和运行日志。单测 JUnit 位于 `reports/junit.xml`。相关 PR 改动自动触发 `Memfit UI regression` workflow，并上传这些产物；下载 artifact 后也可以直接打开效果页。

当前 Electron 套件有 43 项检查，包含 1100px 亮色和 800px 暗色窗口。与 87 项模块及会话控制器测试一起运行（耗时取决于机器，不含首次安装依赖和下载驱动）。截图用于检查和定位，没有跨操作系统的像素基准比较。

表单的输入、验证与提交测试位于 ask 浮层场景；DataTable 只验证本地排序、筛选、分页，不包含用户答案回传。

## 用户看到的两条路径

| 路径 | 实际界面 | Electron 自动检查 |
| --- | --- | --- |
| ask + questions | 输入栏浮层内逐题展示单选/多选、自由文本；同步提示需要回答，异步提示任务继续 | 两种模式的亮暗主题、浮层边界、分页、IME、Esc 保留草稿、提交后的只读摘要 |
| ask + form | 同一浮层内展示参数表单，不经过展示 catalog | 字符串、枚举、数值、布尔、多选、默认值不自动提交、非法值不发送、草稿恢复、类型保持、防重复提交 |
| ask 关闭/到期 | 取消或跳过后关闭浮层；异步到期可补答，交互永久取消倒计时 | 不发送答案、终态不再出现提交按钮、到期恢复、真实输入后不再到期 |
| render_ui | 消息中的图表、表格、指标、提示与分组视图 | 全部 12 组件亮暗主题、无横向溢出、图表图例、表格本地操作、Tabs 与浮层；不发送用户回答 |
| render_ui 越界输入 | 文字降级与诊断，不显示可填写组件 | ParameterForm、action、bindings 均不产生输入表单或答案回传 |

## 新增组件时

除了 catalog、Schema 和渲染器，还必须在 `examples.mjs` 添加一个合法的固定样例。测试启动时检查样例名称与 catalog、渲染注册表完全一致；遗漏样例直接失败。具有新的交互语义时，在 `components.e2e.mjs` 添加操作与结果断言，邻近 Vitest 测试覆盖非法参数和边界情况。

## 验证边界

测试页面只在 E2E 构建中存在，不加入产品路由和发行包；使用临时 Electron userData，退出后删除，不读取 default 数据库。会话容器与发送接口由 `adapter.ts` 提供固定数据和收集回执，组件渲染、Schema 校验、控件事件与 CSS 使用生产代码。

这些测试证明固定协议数据在前端的行为，不能证明模型一定选对工具、真实 gRPC 连接成功、后端次数限制正确或整个产品布局完全没有问题。后端协议/策略测试以及少量真实模型联调仍承担这些检查。截图是可审阅产物；当前自动断言包括可见性、尺寸、溢出、运行异常与交互结果，没有声称用像素差异自动判断全部视觉质量。
