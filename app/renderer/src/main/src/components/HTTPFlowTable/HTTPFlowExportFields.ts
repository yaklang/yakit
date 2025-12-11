export const getHTTPFlowExportFields = (t: (key: string) => string)=> {
    return [
        {
            title: t("YakitTable.order"),
            key: "id",
            dataKey: "Id"
        },
        {
            title: t("HTTPFlowTable.method"),
            key: "method",
            dataKey: "Method"
        },
        {
            title: t("HTTPFlowTable.statusCode"),
            key: "status_code",
            dataKey: "StatusCode"
        },
        {
            title: "URL",
            key: "url",
            dataKey: "Url"
        },
        {
            title: "Host",
            key: "host",
            dataKey: "Host"
        },
        {
            title: "Path",
            key: "path",
            dataKey: "Path"
        },
        {
            title: "Payloads",
            key: "payloads",
            dataKey: "Payloads"
        },
        {
            title: t("HTTPFlowTable.fromPlugin"),
            key: "from_plugin",
            dataKey: "FromPlugin"
        },
        {
            title: "Tags",
            key: "tags",
            dataKey: "Tags"
        },
        {
            title: "IP",
            key: "iP_address",
            dataKey: "IPAddress"
        },
        {
            title: t("HTTPFlowTable.bodyLength"),
            key: "body_length",
            dataKey: "BodyLength"
        },
        {
            title: "Title",
            key: "response",
            dataKey: "HtmlTitle"
        },
        {
            title: t("HTTPFlowTable.params"),
            key: "get_params_total",
            dataKey: "GetParamsTotal"
        },
        {
            title: t("HTTPFlowTable.contentType"),
            key: "content_type",
            dataKey: "ContentType"
        },
        {
            title: t("HTTPFlowTable.durationMs"),
            key: "duration",
            dataKey: "DurationMs"
        },
        {
            title: t("HTTPFlowTable.updatedAt"),
            key: "updated_at",
            dataKey: "UpdatedAt"
        },
        {
            title: t("HTTPFlowTable.requestSizeVerbose"),
            key: "request_length",
            dataKey: "RequestSizeVerbose"
        },
        {
            title: t("HTTPFlowTable.requestPacket"),
            key: "request",
            dataKey: "request"
        },
        {
            title: t("HTTPFlowTable.responsePacket"),
            key: "response",
            dataKey: "response"
        }
    ]
}
