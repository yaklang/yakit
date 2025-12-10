# VarFlowGraph 变量流图 - 交互设计文档

## 一、图结构概述

变量流图展示 SyntaxFlow 规则的执行过程，帮助用户理解**漏洞是如何被发现的**。

```
┌─────────┐                ┌─────────┐                ┌─────────┐
│ $source │ ───[搜索]───▶  │ $filter │ ───[过滤]───▶  │ $result │
│  (273)  │                │  (131)  │                │   (4)   │
└─────────┘                └─────────┘                └─────────┘
    节点                       节点                       节点
   (变量)                     (变量)                     (变量)
              边                          边
           (分析步骤)                   (分析步骤)
```

- **节点 (Node)**：代表 SyntaxFlow 变量，显示变量名和值的数量
- **边 (Edge)**：代表变量之间的转换关系，边上附带分析步骤
- **步骤 (Step)**：具体的分析操作（搜索、过滤、数据流分析等）

---

## 二、配色方案

### 节点颜色

| 节点类型 | 背景色 | 边框色 | 说明 |
|----------|--------|--------|------|
| 入口节点 | `#E3F2FD` (浅蓝) | `#1976D2` (蓝) | 规则的起始变量 |
| 中间节点 | `#FFF3E0` (浅橙) | `#F57C00` (橙) | 中间处理变量 |
| 结果节点 | `#FFEBEE` (浅红) | `#D32F2F` (红) | 最终结果/告警变量 |
| 空节点 | `#F5F5F5` (浅灰) | `#9E9E9E` (灰) | 值为空的变量 |

### 边颜色

| 边类型 | 颜色 | 线型 | 说明 |
|--------|------|------|------|
| 搜索边 | `#2196F3` (蓝) | 实线 | Search 操作 |
| 过滤边 | `#FF9800` (橙) | 实线 | ConditionFilter 操作 |
| 数据流边 | `#4CAF50` (绿) | 虚线 | DataFlow 操作（TopDef/BottomUse） |
| 获取边 | `#9C27B0` (紫) | 实线 | Get 操作（获取参数、成员等） |

### 步骤标签颜色

| 步骤类型 | 背景色 | 文字色 |
|----------|--------|--------|
| Search | `#E3F2FD` | `#1565C0` |
| ConditionFilter | `#FFF3E0` | `#E65100` |
| DataFlow | `#E8F5E9` | `#2E7D32` |
| Get | `#F3E5F5` | `#7B1FA2` |

---

## 三、交互流程

### 3.1 点击节点 → 显示值列表

```
用户点击节点 "$source (273)"
         ↓
┌─────────────────────────────────────────┐
│  $source 的值列表 (共 273 个)            │
├─────────────────────────────────────────┤
│  📄 "userInput"                         │
│     └─ SqliMapper.java:36               │
│                                         │
│  📄 request.getParameter("id")          │
│     └─ UserController.java:45           │
│                                         │
│  📄 args[0]                             │
│     └─ Main.java:12                     │
│                                         │
│  ... 更多值 (点击加载)                   │
└─────────────────────────────────────────┘
```

**点击单个值** → 跳转到代码位置 或 展开数据流图

---

### 3.2 点击边 → 显示分析步骤

```
用户点击边 "$source → $filter"
         ↓
┌─────────────────────────────────────────┐
│  分析步骤 (共 3 步)                      │
├─────────────────────────────────────────┤
│                                         │
│  Step 1: 🔍 Search                      │
│  ├─ 精确搜索【source】                   │
│  └─ 匹配模式: name+key                  │
│                                         │
│  Step 2: 🔶 ConditionFilter  ← 可展开   │
│  ├─ 字符串过滤: have "user"             │
│  └─ 通过: 131 / 总数: 273               │
│                                         │
│  Step 3: 🔶 ConditionFilter  ← 可展开   │
│  ├─ 操作码过滤: opcode == call          │
│  └─ 通过: 131 / 总数: 131               │
│                                         │
└─────────────────────────────────────────┘
```

---

### 3.3 点击过滤步骤 → 展开证据树

```
用户点击 "Step 2: ConditionFilter"
         ↓
┌─────────────────────────────────────────────────────────────┐
│  过滤条件证据树                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔶 ConditionFilter: 字符串过滤                              │
│  │                                                          │
│  ├─ 📋 过滤规则                                              │
│  │   ├─ 类型: StringCondition                               │
│  │   ├─ 匹配模式: have (全部包含)                            │
│  │   └─ 条件: "user"                                        │
│  │                                                          │
│  ├─ ✅ 通过的值 (131 个)  ← 点击展开                         │
│  │   ├─ "userInput"         → SqliMapper.java:36            │
│  │   ├─ "user_name"         → UserDao.java:22               │
│  │   └─ ... 更多                                            │
│  │                                                          │
│  └─ ❌ 未通过的值 (142 个)  ← 点击展开                       │
│      ├─ "adminConfig"       → Config.java:15                │
│      ├─ "systemParam"       → System.java:8                 │
│      └─ ... 更多                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.4 复杂过滤条件 → 逻辑树展示

当过滤条件包含 AND/OR/NOT 逻辑时：

```
┌─────────────────────────────────────────────────────────────┐
│  过滤条件证据树                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔶 ConditionFilter                                         │
│  │                                                          │
│  └─ 🔷 AND (逻辑与)                                         │
│      │                                                      │
│      ├─ 📝 StringCondition                                  │
│      │   ├─ 条件: have "user"                               │
│      │   ├─ ✅ 通过: 131                                    │
│      │   └─ ❌ 未通过: 142                                  │
│      │                                                      │
│      └─ 📝 OpcodeCondition                                  │
│          ├─ 条件: opcode == call                            │
│          ├─ ✅ 通过: 98                                     │
│          └─ ❌ 未通过: 33                                   │
│                                                             │
│  最终结果: ✅ 98 通过 / ❌ 175 未通过                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.5 数据流过滤 → 显示路径证据

当过滤条件包含数据流分析时（如 `?{* #-> & $source}`）：

```
┌─────────────────────────────────────────────────────────────┐
│  数据流过滤证据                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔶 ConditionFilter: 数据流过滤                              │
│  │                                                          │
│  ├─ 📋 过滤规则                                              │
│  │   ├─ 类型: FilterCondition (数据流)                      │
│  │   ├─ 方向: TopDef (向上追溯)                             │
│  │   └─ 条件: 能到达 $source                                │
│  │                                                          │
│  ├─ ✅ 通过的值 (4 个)  ← 点击展开                           │
│  │   │                                                      │
│  │   ├─ 📄 sink1: execute(query)                            │
│  │   │   └─ 🔗 点击查看数据流路径                            │
│  │   │       ↓                                              │
│  │   │   ┌─────────────────────────────────┐                │
│  │   │   │ 数据流路径:                      │                │
│  │   │   │                                 │                │
│  │   │   │ userInput (源)                  │                │
│  │   │   │     ↓                           │                │
│  │   │   │ String query = "SELECT " + user │                │
│  │   │   │     ↓                           │                │
│  │   │   │ execute(query) (汇)             │                │
│  │   │   └─────────────────────────────────┘                │
│  │   │                                                      │
│  │   ├─ 📄 sink2: db.query(sql)                             │
│  │   │   └─ 🔗 点击查看数据流路径                            │
│  │   │                                                      │
│  │   └─ ... 更多                                            │
│  │                                                          │
│  └─ ❌ 未通过的值 (127 个)                                   │
│      └─ 这些值无法追溯到 $source                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.6 点击值 → 查看完整数据流图

```
用户点击 "sink1: execute(query)" 的 "查看数据流路径"
         ↓
┌─────────────────────────────────────────────────────────────┐
│  数据流路径图                                    [返回] [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐                                       │
│  │ 🟢 userInput     │  ← 数据源 (绿色高亮)                   │
│  │ SqliMapper.java:36│                                      │
│  └────────┬─────────┘                                       │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────┐                                       │
│  │ 🟡 query         │  ← 中间节点 (黄色)                     │
│  │ SqliMapper.java:42│                                      │
│  │ "SELECT * FROM   │                                       │
│  │  users WHERE     │                                       │
│  │  id=" + userInput│                                       │
│  └────────┬─────────┘                                       │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────┐                                       │
│  │ 🔴 execute(query)│  ← 数据汇/当前值 (红色高亮)            │
│  │ SqliMapper.java:45│                                      │
│  └──────────────────┘                                       │
│                                                             │
│  点击任意节点查看代码详情                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、完整交互示例

### 场景：SQL 注入漏洞分析

**SyntaxFlow 规则：**
```
.getParameter() as $source
$source #-> as $tainted
$tainted?{<call>?{have: "execute" || have: "query"}} as $sink
alert $sink for "SQL Injection"
```

**变量流图：**

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   $source    │      │  $tainted    │      │    $sink     │
│    (156)     │─────▶│    (892)     │─────▶│     (4)      │
│   🔵 入口    │ 搜索  │   🟠 中间    │ 过滤  │   🔴 告警    │
└──────────────┘      └──────────────┘      └──────────────┘
```

**用户操作流程：**

1. **看到告警节点 $sink 有 4 个值** → 点击查看是哪些
2. **点击 $sink 节点** → 显示 4 个危险调用
3. **想知道为什么这 4 个被选中** → 点击 `$tainted → $sink` 边
4. **看到过滤步骤** → 点击 ConditionFilter 展开证据树
5. **看到通过/未通过的值** → 点击通过的值查看数据流路径
6. **看到完整的污点传播路径** → 确认漏洞成因

---

## 五、API 接口

### 5.1 获取变量流图

```
GET syntaxflow://{program_id}/_var_graph?result_id={result_id}
```

**响应 JSON 结构：**

```typescript
interface VarFlowGraph {
    nodes: Node[];
    edges: Edge[];
    steps: Step[];
}

interface Node {
    id: number;
    var_name: string;      // 变量名
    value_count?: number;  // 值的数量
    node_type?: "entry" | "middle" | "result" | "empty";
}

interface Edge {
    id: number;
    from: number;          // 起始节点 ID
    to: number;            // 目标节点 ID
    step_ids: number[];    // 步骤 ID 列表
    edge_type?: "search" | "filter" | "dataflow" | "get";
}

interface Step {
    id: number;
    type: "Search" | "ConditionFilter" | "DataFlow" | "Get";
    description: string;
    evidence_tree?: EvidenceNode;  // 过滤证据树
}
```

### 5.2 获取变量的值列表（点击节点）

```
GET syntaxflow://{program_id}/{variable}?result_id={result_id}
```

**响应：**
```typescript
{
    resources: [{
        resourceType: "value",
        resourceName: string,  // 值的字符串表示
        extra: [
            { key: "index", value: string },
            { key: "code_range", value: string },  // JSON: {url, startLine, endLine, ...}
            { key: "source", value: string }       // 源代码片段
        ]
    }]
}
```

### 5.3 获取边上的步骤列表（点击边）

```
GET syntaxflow://{program_id}/_edge/{edge_id}?result_id={result_id}
```

**响应：**
```typescript
{
    resources: [{
        resourceType: "step",
        resourceName: string,  // 步骤描述
        extra: [
            { key: "step_id", value: string },
            { key: "step_type", value: string },       // "Search" | "ConditionFilter" | "DataFlow" | "Get"
            { key: "step_description", value: string },
            { key: "step_detail", value: string },     // 完整步骤 JSON
            { key: "has_evidence_tree", value: "true" } // 如果有证据树
        ]
    }]
}
```

### 5.4 获取步骤详情（点击 ConditionFilter 步骤）

```
GET syntaxflow://{program_id}/_step/{step_id}?result_id={result_id}
```

**响应：**
```typescript
{
    resources: [{
        resourceType: "step_detail",
        resourceName: string,  // 步骤描述
        extra: [
            { key: "step_id", value: string },
            { key: "step_type", value: string },
            { key: "step_description", value: string },
            { key: "step_detail", value: string },     // 完整步骤 JSON
            { key: "evidence_tree", value: string }    // 证据树 JSON（如果有）
        ]
    }]
}
```

### 5.5 获取值的数据流图（点击具体值）

```
GET syntaxflow://{program_id}/{variable}/{index}?result_id={result_id}
```

**响应：**
```typescript
{
    resources: [{
        resourceType: "information",
        resourceName: string,
        extra: [
            { key: "node_id", value: string },      // 当前节点 ID
            { key: "graph", value: string },        // DOT 格式图
            { key: "graph_info", value: string },   // 节点详情 JSON
            { key: "graph_line", value: string },   // 路径 JSON
            { key: "message", value: string }       // 告警信息
        ]
    }]
}
```

---

## 六、证据树结构

```typescript
interface EvidenceNode {
    type: "LogicGate" | "FilterCondition" | "StringCondition" | "OpcodeCondition";
    
    // LogicGate 类型
    logic_op?: "AND" | "OR" | "NOT";
    children?: EvidenceNode[];
    
    // 描述
    desc?: string;           // 英文描述
    desc_zh?: string;        // 中文描述（用于展示）
    
    // 比较条件
    compare?: {
        filter_type: string;              // "string" | "opcode" | "compare" | "regex" | "glob" | "empty_check"
        match_mode?: string;              // "have" | "any"
        operator?: string;                // "==" | "!=" | ">" | ">=" | "<" | "<="
        conditions: { type: string, value: string }[];
    };
    
    // 过滤结果
    results?: {
        value_id: string;           // 值的 ID（用于进一步查询）
        value_str?: string;         // 值的字符串表示（直接显示）
        interm_id?: string;         // 中间值 ID（数据流分析产生的路径）
        interm_str?: string;        // 中间值的字符串表示
        passed: boolean;            // 是否通过过滤
    }[];
}
```

### 证据类型说明

| type | 说明 | 示例规则 |
|------|------|----------|
| LogicGate | 逻辑门，包含 AND/OR/NOT | `?{have:"a" && opcode:const}` |
| FilterCondition | 过滤条件（?{...}内的表达式结果检查） | `?{* #->}` |
| StringCondition | 字符串匹配条件 | `have:"user"`, `any:"admin","root"` |
| OpcodeCondition | 操作码检查条件 | `opcode:call`, `opcode:const` |

### 比较条件 (compare) 字段说明

| filter_type | 说明 | 示例 |
|-------------|------|------|
| string | 字符串匹配 | `have:"user"` |
| opcode | 操作码检查 | `opcode:call` |
| compare | 数值比较 | `len > 10` |
| regex | 正则匹配 | `re:"^user.*"` |
| glob | 通配符匹配 | `glob:"user*"` |
| empty_check | 非空检查 | `?{* #->}` 的结果检查 |

---

## 七、UI 组件建议

### 7.1 图渲染

- 使用 **Cytoscape.js** 或 **D3.js** 渲染有向图
- 支持缩放、拖拽、自动布局
- 节点支持点击、悬停高亮

### 7.2 侧边栏/弹窗

- 点击节点/边时，在右侧或弹窗显示详情
- 支持展开/折叠
- 列表支持分页加载

### 7.3 数据流图

- 使用 **Graphviz/d3-graphviz** 渲染 DOT 图
- 或使用自定义垂直布局
- 高亮当前节点和路径

### 7.4 代码预览

- 点击值时显示代码片段
- 高亮关键代码行
- 支持跳转到 IDE
