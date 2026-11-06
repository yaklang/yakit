# HTTP 静态响应预览

Web Fuzzer 的响应区、结果列表和从这两处打开的独立响应窗口，只有用户点击本次响应的“渲染”后才加载静态资源。在线渲染从当前引擎请求新资源，历史捕获图片只用于离线回放和旧引擎回退。恢复上次的渲染模式、切换响应、检测响应类型均不授权新的联网。切换响应、离开渲染或关闭窗口会取消尚未完成的请求。

新增 `FetchHTTPPreviewResource` gRPC 接口，由 Yakit 的独立 IPC 模块转发。接口复用 lowhttp 和 Fuzzer 的代理规则解析，不调用 HTTPFuzzer，不创建任务、不执行热加载、不保存资源响应。现有 Fuzzer 和 MITM 的发包接口没有改动。

请求仅限图片、CSS 和字体的 HTTP(S) GET。继承原请求适用的代理、代理规则、DNS、Hosts、实际连接地址、SNI 和 TLS 配置；实际地址和 SNI 覆盖只用于与页面同源的资源。原测试目标同源可使用内网地址，跨源资源需解析为允许的公网地址。检查后的 IP 固定用于连接，每次重定向重新校验。代理请求也使用检查后的目标 IP，因此无法在引擎本地解析的“仅代理可解析域名”不会加载。不会自动继承 Cookie、Authorization、Referer 或浏览器登录态。

Yakit 将 CSS 和图片/字体数据内联，iframe 继续使用空 sandbox 和 CSP 禁止脚本、外部连接、嵌套页面、表单及导航链接。全局 Electron 配置保持原样。动态 JS 页面、SVG 和 Browser Transform Gateway 线路暂不支持；Gateway 配置不会静默退回普通直连。

限制：单资源解码前后各 4 MiB、单次引擎请求 5 秒（最多 3 次重定向）；一次预览最多 64 个资源、4 个并发、16 MiB 下载数据、15 秒加载期限；CSS 导入深度最多 3 层，支持 layer、supports 和媒体查询条件；单份 CSS 展开最多 6 Mi 字符，CSS 展开累计最多 24 Mi 字符，每次资源替换和导入复制前扣减预算；资源内联另有 24 Mi 字符预算。失败资源留空，静态文档仍可显示。

旧引擎返回 gRPC UNIMPLEMENTED 时回退到当前项目已捕获图片的离线回放。HTTP History、MITM、Fuzzer 序列和其他调用方没有传递在线加载上下文，继续离线预览。

测试新功能需要重启 Electron（新增了主进程 IPC 和协议），并使用包含新接口的引擎；只刷新 Vite 页面不会更新主进程。开发构建示例：

```sh
# 引擎工作树
PATH=/usr/local/go/bin:$PATH go build -o /tmp/yak-static-http-preview ./common/yak/cmd
```

前端回归覆盖 HTTP History、Web Fuzzer、Fuzzer 序列、MITM、风险表、AI 配置和二进制编辑器。引擎测试覆盖协议注册、代理、Hosts、取消、内容校验、压缩大小限制及跨源重定向拦截。另用 Electron 27 + 新引擎接口运行实际图片/CSS/字体预览，检查像素、请求来源和脚本禁用。
