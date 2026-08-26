export const ContextMenuPluginTemplate = `# 右键插件
#
# v1 支持三个可选 Hook：
#   handleOneHTTPFlow(ctx, flow)
#   handleMultiHTTPFlows(ctx, flows)
#   handleHTTPPacket(ctx, request, response)
#
# 只实现实际需要的 Hook；ctx 提供 Scene、Source、Trigger、HTTPS 状态、参数与取消信号。
# 如需用户输入参数，仍需先用 cli.* 声明参数表单；ctx.Param* 只负责在 Hook 内读取本次参数。
# 例如：keyword = cli.String("keyword", cli.setRequired(true), cli.setVerboseName("关键字"))

handleOneHTTPFlow = func(ctx, flow) {
    table = yakit.NewTable("字段", "值")
    table.Append("URL", flow.Url)
    table.Append("Method", flow.Method)
    table.Append("Status", flow.StatusCode)
    table.Append("HTTPS", ctx.HttpsState())
    yakit.Output(table)
}
`
