export const ContextMenuPluginTemplate = `# 右键插件
#
# v1 支持三个可选 Hook：
#   handleOneHTTPFlow(ctx, flow)
#   handleMultiHTTPFlows(ctx, flows)
#   handleHTTPPacket(ctx, request, response)
#
# 只实现实际需要的 Hook；ctx 提供 Scene、Source、Trigger、HTTPS 状态、参数与取消信号。

handleOneHTTPFlow = func(ctx, flow) {
    table = yakit.NewTable("字段", "值")
    table.Append("URL", flow.Url)
    table.Append("Method", flow.Method)
    table.Append("Status", flow.StatusCode)
    table.Append("HTTPS", ctx.HttpsState())
    yakit.Output(table)
}
`
