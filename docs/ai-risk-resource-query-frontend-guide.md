# AI Risk、Resource 与 Query 接口前端对接

涉及接口：

```text
/ypb.Yak/StartAIReAct
/ypb.Yak/GetAISessionCurrentResources
/ypb.Yak/QueryAITool
/ypb.Yak/QueryKnowledgeBase
```

字段名以 `app/protos/grpc.proto` 生成的 PascalCase 类型为准。

## 1. 添加 Risk 附件

### 接口

```text
rpc StartAIReAct(stream AIInputEvent) returns (stream AIOutputEvent)
```

启动帧沿用现有逻辑，不需要为 Risk 附件增加字段。在包含 `FreeInput` 的输入帧中增加：

```json
{
  "IsFreeInput": true,
  "FreeInput": "你能看到我附加的风险吗？请列出 Risk ID",
  "AttachedResourceInfo": [
    {
      "Type": "risk",
      "Key": "ids",
      "Value": "[101,102,103]"
    }
  ]
}
```

格式要求：

- `Type` 固定为 `risk`。
- `Key` 固定为 `ids`。
- `Value` 是 JSON 正整数数组字符串，通过 `JSON.stringify([101,102,103])` 生成。
- 单条附件最多 10,000 个 ID。
- 不支持旧格式 `risk_id`。

### 输出

继续使用现有 `AIOutputEvent` 流。AI 能看到附件时，回答内容应包含对应的 Risk ID：

```text
可以看到，本次会话附加了 3 个 Risk：
101、102、103
```

## 2. 查询会话资源

### 接口

```text
rpc GetAISessionCurrentResources(
  GetAISessionCurrentResourcesRequest
) returns (
  GetAISessionCurrentResourcesResponse
)
```

### 输入

```json
{
  "SessionID": "session-risk-demo"
}
```

### 输出

```json
{
  "SessionID": "session-risk-demo",
  "TaskID": "react-review_7f3k2m1q",
  "UserInputUUID": "input-7f7f3a9d",
  "TaskResources": [
    {
      "Type": "risk",
      "Key": "ids",
      "Value": "[101,102,103]",
      "Scope": "turn",
      "Source": "attached_resource_info"
    }
  ],
  "SessionResources": []
}
```

说明：

- `TaskResources` 是当前最新任务关联的资源。
- `SessionResources` 是会话级资源。
- Risk 的 `Scope` 为 `turn`，只出现在 `TaskResources`。
- 查不到任务时返回成功，通常只有 `SessionID`。
- `SessionID` 为空时返回 `session_id is required`。

## 3. 查询 AI 工具

### 接口

```text
rpc QueryAITool(QueryAIToolRequest) returns (QueryAIToolResponse)
```

### 输入

```json
{
  "Filter": {
    "IDs": [11, 12],
    "ToolNames": ["query_cybersecurity_risk", "do_http_request"],
    "Keyword": "risk",
    "OnlyFavorites": false
  },
  "Pagination": {
    "Page": 1,
    "Limit": 20,
    "OrderBy": "updated_at",
    "Order": "desc"
  }
}
```

`AIToolFilter` 支持：

```text
ID
IDs
ToolName
ToolNames
Keyword
OnlyFavorites
```

`ID` 与 `IDs` 合并后按 ID 过滤；`ToolName` 与 `ToolNames` 合并后按名称过滤。

### 输出

```json
{
  "Pagination": {
    "Page": 1,
    "Limit": 20,
    "OrderBy": "updated_at",
    "Order": "desc"
  },
  "Data": [
    {
      "ID": 11,
      "Name": "query_cybersecurity_risk",
      "Description": "Search existing cybersecurity risks",
      "IsFavorite": false,
      "IsBuiltin": true,
      "CreatedAt": 1760000000,
      "UpdatedAt": 1760000000
    }
  ],
  "Total": 1
}
```

## 4. 查询知识库

### 接口

```text
rpc QueryKnowledgeBase(
  QueryKnowledgeBaseRequest
) returns (
  QueryKnowledgeBaseResponse
)
```

### 输入

```json
{
  "Filter": {
    "IDs": [21, 22],
    "Names": ["security-guide"],
    "Keyword": "authentication",
    "Types": ["guide"],
    "Tags": ["security"]
  },
  "Pagination": {
    "Page": 1,
    "Limit": 20,
    "OrderBy": "updated_at",
    "Order": "desc"
  }
}
```

过滤规则：

- 同一集合字段内部使用 OR，例如 `IDs: [21,22]`。
- 不同字段之间使用 AND，例如 `IDs` 与 `Types` 同时生效。
- `Names` 精确匹配。
- `Types` 精确匹配。
- `Tags` 模糊匹配。
- `Keyword` 搜索名称、描述、类型和标签。

### 输出

```json
{
  "Pagination": {
    "Page": 1,
    "Limit": 20,
    "OrderBy": "updated_at",
    "Order": "desc"
  },
  "Data": [
    {
      "ID": 21,
      "KnowledgeBaseName": "security-guide",
      "KnowledgeBaseDescription": "Authentication security guidance",
      "KnowledgeBaseType": "guide",
      "Tags": ["security"],
      "IsImported": false,
      "CreatedFromUI": true,
      "IsDefault": false
    }
  ],
  "Total": 1
}
```

## 5. 测试指南

### 5.1 Risk 附件是否可见

1. 按第 1 节添加 Risk `[101,102,103]`。
2. 询问 AI：

```text
你能看到我附加的风险吗？请列出 Risk ID。
```

3. 预期回答包含 `101、102、103`。

### 5.2 会话资源是否可以查到

1. 使用同一个 `TimelineSessionID` 完成 Risk 附件任务。
2. 调用 `GetAISessionCurrentResources`。
3. 预期 `TaskResources` 中包含：

```json
{
  "Type": "risk",
  "Key": "ids",
  "Value": "[101,102,103]",
  "Scope": "turn"
}
```

### 5.3 AI 工具查询

使用名称过滤查询已存在工具：

```json
{
  "Filter": {
    "ToolNames": ["query_cybersecurity_risk"]
  },
  "Pagination": {
    "Page": 1,
    "Limit": 10
  }
}
```

预期 `Total` 大于或等于 1，`Data` 中包含对应的 `Name` 和 `ID`。

### 5.4 知识库查询

使用名称过滤查询已存在知识库：

```json
{
  "Filter": {
    "Names": ["security-guide"]
  },
  "Pagination": {
    "Page": 1,
    "Limit": 10
  }
}
```

预期 `Total` 大于或等于 1，`Data` 中包含对应的 `KnowledgeBaseName` 和 `ID`。
