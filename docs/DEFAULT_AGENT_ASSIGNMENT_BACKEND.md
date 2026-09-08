# AI SenSo 数字员工默认智能体：后端实施说明

日期：2026-09-08  
状态：前端协议已核对；待后端核对真实 ForgeName 并实现初始化、迁移。本文不表示后端已经完成改造。

## 1. 需求与结论

AI SenSo 有八个固定数字员工角色，每个角色可以关联多个 AI Forge 智能体。希望新安装或升级后，已提供的智能体按业务表格自动归属对应角色，用户进入角色后即可看到可选智能体，不需要逐个手动编辑分配。

本次“默认智能体”指**默认归属列表**，不要求进入角色后自动选中某一个智能体，也不新增或修改智能体的 Prompt、工具和实际能力。用户仍从角色列表中选择智能体后开始聊天。

**请后端／本地引擎将角色归属持久化到现有 `AIForge.Tag` 字段，并通过现有接口返回。无需新增接口或 protobuf 字段。**

本项目调用链是：React 前端 → Electron IPC → 本地引擎 gRPC。只修改远端平台展示数据不足以完成需求，归属标记必须最终进入客户端所连接引擎的 Forge 数据，并由 `QueryAIForge` / `GetAIForge` 返回。如果智能体来自远端分发包，应同时检查分发、导入和本地入库链路。

## 2. 当前已实现的前端行为

- 八个角色的 ID、名称和头像固定定义在 `app/renderer/src/main/src/pages/digitalEmployee/config.ts`。
- 前端通过 `QueryAIForge` 分页获取智能体，然后读取 `AIForge.Tag` 中的角色标记，生成角色内智能体列表。
- 缺少有效角色标记的智能体进入“未分配”。因此即使引擎已安装智能体，角色列表仍可能为空；本次尚未读取用户实际引擎数据确认存量情况。
- Memfit 创建、编辑智能体时已有角色选择，保存时通过 `CreateAIForge` / `UpdateAIForge` 写入角色 Tag。
- 普通能力标签展示会隐藏 `senso-role:` 前缀的内部标签。
- 聊天实际使用智能体真实 `ForgeName`。角色 Tag 只负责归属，不替代智能体名称或执行参数。
- 前端没有按本次业务表格自动初始化或迁移历史智能体的逻辑。

## 3. 角色 Tag 协议

字段名是大小写准确的 **`Tag`**，类型是**字符串数组**。每个智能体最多保存一个角色 Tag，同时保留原有普通能力标签。

格式：`senso-role:<role-id>`。请直接使用下表完整值，不写中文角色名，不改大小写，不增加空格。

| 前端角色名称 | role-id | 完整角色 Tag |
| --- | --- | --- |
| 首席信息安全官 | `ciso` | `senso-role:ciso` |
| 运营服务管家 | `operations-manager` | `senso-role:operations-manager` |
| 数字情报官 | `intelligence-officer` | `senso-role:intelligence-officer` |
| 数字教师 | `digital-teacher` | `senso-role:digital-teacher` |
| 威胁分析专家 | `threat-analyst` | `senso-role:threat-analyst` |
| 渗透测试专家 | `penetration-tester` | `senso-role:penetration-tester` |
| 数字猎手 | `digital-hunter` | `senso-role:digital-hunter` |
| 应急响应专家 | `incident-responder` | `senso-role:incident-responder` |

业务图片中的“首席信息官”对应当前前端“首席信息安全官”，统一使用 `ciso`，本次不要求调整前端角色名称。

## 4. 默认归属清单

以下按用户提供图片中**黄色且状态为“已有”**的条目整理，共 31 项。图片中未标记已有的白色条目，不在本次默认可用智能体清单中，不要创建只有名称、没有能力的占位 Forge。

**下表“业务名称”不是已验证的 ForgeName。** 后端需先与实际内置智能体清单核对，建立版本管理下的“真实 ForgeName → role-id”映射，再执行初始化或迁移。不得直接把业务中文名称当作真实 ForgeName 写入数据库。

| 序号 | 数字员工 | 业务名称 | role-id |
| --- | --- | --- | --- |
| 1 | 首席信息安全官 | 安全运营成熟度评估 | `ciso` |
| 2 | 首席信息安全官 | 供应链风险评估助手 | `ciso` |
| 3 | 首席信息安全官 | 基线合规核查 | `ciso` |
| 4 | 运营服务管家 | 安全运营报告生成 | `operations-manager` |
| 5 | 运营服务管家 | 外网资产测绘 | `operations-manager` |
| 6 | 数字情报官 | 漏洞情报预警 | `intelligence-officer` |
| 7 | 数字情报官 | 域名情报分析 | `intelligence-officer` |
| 8 | 数字教师 | 安全意识宣贯 | `digital-teacher` |
| 9 | 威胁分析专家 | 通用告警研判 | `threat-analyst` |
| 10 | 威胁分析专家 | AI XDR 告警研判 | `threat-analyst` |
| 11 | 威胁分析专家 | TDA威胁研判 | `threat-analyst` |
| 12 | 威胁分析专家 | 主机安全（DeepSecurity）研判 | `threat-analyst` |
| 13 | 威胁分析专家 | 弱口令评估助手 | `threat-analyst` |
| 14 | 威胁分析专家 | 用户行为审计助手 | `threat-analyst` |
| 15 | 威胁分析专家 | 威胁泄露排查助手 | `threat-analyst` |
| 16 | 威胁分析专家 | 移动应用分析助手 | `threat-analyst` |
| 17 | 威胁分析专家 | 日志关联分析助手 | `threat-analyst` |
| 18 | 威胁分析专家 | 主机取证分析助手 | `threat-analyst` |
| 19 | 威胁分析专家 | 容器镜像扫描助手 | `threat-analyst` |
| 20 | 威胁分析专家 | 流量包分析助手 | `threat-analyst` |
| 21 | 威胁分析专家 | 钓鱼邮件分析助手 | `threat-analyst` |
| 22 | 渗透测试专家 | Web 渗透测试 | `penetration-tester` |
| 23 | 渗透测试专家 | 代码安全审计 | `penetration-tester` |
| 24 | 渗透测试专家 | 端口扫描助手 | `penetration-tester` |
| 25 | 渗透测试专家 | 接口安全检测助手 | `penetration-tester` |
| 26 | 数字猎手 | 异常行为狩猎智能体 | `digital-hunter` |
| 27 | 数字猎手 | 子域名枚举助手 | `digital-hunter` |
| 28 | 数字猎手 | 指纹识别助手 | `digital-hunter` |
| 29 | 数字猎手 | 爬虫任务编排助手 | `digital-hunter` |
| 30 | 数字猎手 | 敏感信息发现助手 | `digital-hunter` |
| 31 | 应急响应专家 | 安全事件响应编排 | `incident-responder` |

名称核对注意：

- “外网资产测绘”在图片中特别注明对应现有“资产测绘专家”，请绑定现有智能体，不重复创建。
- `ForgeVerboseName` 是展示名称，可以和业务名称不同。迁移不要使用展示名模糊匹配、名称关键词或返回顺序。
- 使用核对后的稳定 `ForgeName` 精确匹配；存在历史改名时，维护明确的历史名称别名表。
- 数据库 `Id` 可用于当前实例更新定位，不应作为跨客户端的默认映射常量。
- 若存在同名或来源冲突，核对内置来源后再处理，不自动覆盖同名用户自建智能体。`IsBuiltin` 可作为辅助信息，具体以引擎真实来源标识为准。
- 如某项实际未交付，应列出缺项及原因；不能靠添加 Tag 生成其能力。

## 5. 后端需要修改的内容

### 5.1 新安装：内置数据／分发数据初始化

在已有内置 Forge 初始化或导入入库流程中，按核对后的映射给对应智能体写入角色 Tag。例如某 Forge 原有：

```json
{
  "Tag": ["安全运营", "报告生成"]
}
```

归入运营服务管家后保存为：

```json
{
  "Tag": ["安全运营", "报告生成", "senso-role:operations-manager"]
}
```

上例仅展示字段变化，不是完整创建／更新请求。

要求：

1. 尽量在引擎向前端提供初始化后的列表之前完成归属写入，避免首次查询仍拿到未分配数据。
2. 如果来自分发包，应让包中的元数据携带 Tag，并确认导入后不丢失该字段。
3. 初始化必须可重复执行，不能重复创建 Forge 或追加重复 Tag。
4. 后续内置数据同步、更新、重新导入时，要保留用户已经修改过的角色归属，不能每次启动强制恢复默认值。默认值用于首次创建及未分配旧数据的补齐。
5. 若引擎同时服务其他产品，自动默认分配应限定在 AI SenSo 对应内置数据／产品初始化范围，不对所有用户 Forge 做全局猜测归类。

### 5.2 已安装客户端：存量数据迁移

升级时为已有但没有角色 Tag 的目标 Forge 补齐归属。建议由引擎执行有版本记录的数据迁移，使用事务或条件更新，避免覆盖并发编辑。

| 存量状态 | 处理规则 |
| --- | --- |
| 命中已核对映射，没有任何 `senso-role:` 标记 | 保留原有 Tag，补入一个默认角色 Tag |
| 已有一个有效角色 Tag，且与默认值一致 | 不修改 |
| 已有一个有效角色 Tag，但与默认值不同 | 保留现有归属，不用默认值覆盖用户选择 |
| 存在多个角色 Tag，或未知 role-id 的角色标记 | 记录为冲突，保留原数据，核对后单独修复；不要直接再追加一个 |
| 找不到目标 Forge | 记录缺项；在真实智能体安装时应用初始化规则，不创建占位数据 |
| 没有命中明确映射，或身份／来源存在歧义 | 保持不变，记录待核对项 |

实现逻辑示意，函数名不是现有后端 API：

```text
for each entry in verifiedDefaultAssignments:
    forge = findByExactForgeNameAndVerifiedSource(entry)
    if forge is missing or ambiguous:
        record missing_or_ambiguous
        continue

    roleMarkers = all senso-role: markers in forge.Tag
    if roleMarkers contains exactly one valid role:
        record already_assigned
        continue
    if roleMarkers is not empty:
        record conflicting_or_unknown_role
        continue

    conditionally append senso-role:<entry.roleId>
    # 同事务确认归属仍为空，保留其他字段和并发新增普通标签
    record assigned
```

迁移应只更新必要的标签字段，不改 `ForgeName`、Prompt、脚本、工具、参数和用户配置。不要将 `QueryAIForge` 的列表对象直接当作完整记录覆盖保存，因为本仓库不能证明列表响应始终包含完整智能体内容。

如选择通过现有 RPC 编写迁移客户端，应先 `GetAIForge` 取完整记录再合并更新；后端仍需核对 `UpdateAIForge` 的全量／部分更新语义和并发保护。优先采用引擎内部的标签字段条件更新。

迁移结果至少统计：成功补齐、已有归属跳过、缺失、身份歧义、角色冲突、失败。记录受影响 Forge 的标识及迁移前后 Tag，便于核查和定向恢复；恢复也不能覆盖迁移后用户的新编辑。失败项应可重试，迁移完成标记不能掩盖未处理项。

### 5.3 接口读写与生命周期

现有协议位于 `app/protos/grpc.proto`，相关定义为：

```proto
rpc CreateAIForge(AIForge) returns (DbOperateMessage);
rpc UpdateAIForge(AIForge) returns (DbOperateMessage);
rpc QueryAIForge(QueryAIForgeRequest) returns (QueryAIForgeResponse);
rpc GetAIForge(GetAIForgeRequest) returns (AIForge);

// AIForge 内已有字段
repeated string Tag = 12;

// AIForgeFilter 内已有字段
repeated string Tag = 4;
```

以上是相关协议片段，不是要求重新声明字段。

请确认：

- `CreateAIForge` / `UpdateAIForge` 保存并返回后续可读取的角色 Tag。
- `QueryAIForge.Data[].Tag` 和 `GetAIForge.Tag` 都返回字符串数组；不要将数组转换成逗号字符串或 JSON 字符串。
- 列表和详情对同一 Forge 返回一致的归属，重启引擎后仍然存在。
- 导入、导出和内置更新流程不丢失标签，且遵守保留用户既有归属的规则。

列表接口关键字段示例（省略其他响应字段）：

```json
{
  "Data": [
    {
      "Id": 123,
      "ForgeName": "<后端核对后的真实 ForgeName>",
      "ForgeVerboseName": "安全运营报告生成",
      "Tag": ["安全运营", "报告生成", "senso-role:operations-manager"]
    }
  ],
  "Total": 1
}
```

其中 `123` 和尖括号内容都是示意值，不能写入正式默认映射。

### 5.4 核查 `Filter.Tag` 的历史兼容问题

现有交接记录及前端兼容代码说明：部分已发布引擎可以保存和返回 `AIForge.Tag`，但通过 `AIForgeFilter.Tag` 查询会返回空集。此问题尚未针对新引擎版本复测，后端需确认实际原因。

请验证如下请求可以命中已保存对应 Tag 的 Forge：

```json
{
  "Pagination": {"Page": 1, "Limit": 100, "OrderBy": "id", "Order": "asc"},
  "Filter": {"Tag": ["senso-role:operations-manager"]}
}
```

要求按完整标签匹配，不能用子串模糊匹配；筛选应在分页之前完成，`Total` 是筛选后的总数。多标签的 AND／OR 语义请沿用已有接口合同，并在回传结果中说明，本需求只依赖单个角色 Tag 的筛选。

**此修复不是默认归属上线的前置条件。** 当前前端已分页读取候选集，并用同一角色解析函数在本地过滤，因此只要列表返回正确 Tag，就能展示默认归属。后端修复后，前端是否切换回服务端筛选应另行联调，不需要本次同步改动。

## 6. 验收标准

1. **干净安装**：安装完整的上述 31 项智能体后，八个角色按表展示。按本文表格顺序，数量分别为 `3 / 2 / 2 / 1 / 13 / 4 / 5 / 1`；此前提下总计 31 项。实际缺失或受产品交付范围限制的条目必须有明确清单，不能用虚构数据补数。
2. **旧数据升级**：没有角色 Tag 的目标智能体获得默认归属，普通能力标签、Prompt、脚本、参数和工具配置保持原值。
3. **已有用户设置**：目标 Forge 已被用户分配到其他有效角色时，迁移及后续内置更新都保留该选择。
4. **重复执行**：重启、重试迁移和重复导入不重复创建 Forge、不重复追加角色 Tag；每个正常记录最多一个角色 Tag。
5. **异常数据**：未知角色、多个角色标记、缺失 Forge、同名来源冲突均有报告，不自动误分配。
6. **持久化与接口**：列表、详情及重启后查询返回相同角色 Tag；首次进入／重新启动前端后，角色欢迎页和智能体广场归属一致。
7. **聊天回归**：进入角色仍需选择一个智能体；选择后发送使用原真实 `ForgeName`，能够执行原有能力。
8. **分页**：数据超过 100 条时，后续页的已分配智能体仍可正确归类。如修复 `Filter.Tag`，同时验证完整标签匹配、筛选后 `Total` 和跨页结果。
9. **安装更新**：升级后再安装一个此前缺失的目标智能体，也能取得默认归属；后续内置内容更新不清除归属。

后端应为初始化、存量迁移、幂等、用户归属保留、异常冲突和 Tag 筛选提供定向测试。前端在收到可联调引擎后进行实际页面与聊天验证。

## 7. 请后端回传的交付信息

- 已核对的 31 项“业务名称 → 实际 ForgeName → role-id”清单，以及缺项、历史别名和来源冲突。
- 实现位置：内置数据源／分发包、导入流程、存量迁移入口及迁移版本。
- 可联调的引擎版本或安装包，以及启动时何时完成初始化的说明。
- 干净安装和旧库升级的执行结果；至少提供一条真实 `QueryAIForge` 和对应 `GetAIForge` 返回样例。
- `Filter.Tag` 是否复现、是否修复、适用版本和多标签查询语义。

## 8. 前端代码索引

以下为仓库相对路径，方便后端在同一代码库内检索：

| 文件 | 用途 |
| --- | --- |
| `app/protos/grpc.proto` | gRPC 方法和 Tag 字段定义 |
| `app/main/handlers/ai-agent.js` | Electron IPC 转发到本地引擎 |
| `app/renderer/src/main/src/pages/ai-agent/type/forge.ts` | 前端 AIForge / AIForgeFilter 类型 |
| `app/renderer/src/main/src/pages/digitalEmployee/config.ts` | 八个固定角色及 ID |
| `app/renderer/src/main/src/pages/digitalEmployee/roleAssignment.ts` | 角色 Tag 解析、写入和展示隐藏 |
| `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeContext.tsx` | 分页查询及角色内智能体列表 |
| `app/renderer/src/main/src/pages/aiForge/forgeEditor/ForgeEditor.tsx` | 前端编辑角色并保存 Tag |
| `app/renderer/src/main/src/pages/aiForge/marketplaceRoleFilter.ts` | 广场角色筛选兼容逻辑 |

本文基于当前前端代码及用户业务表格编写；仓库中没有本地引擎的 Forge 数据库实现，具体存储结构、内置数据路径和迁移框架由后端按其代码确定。
