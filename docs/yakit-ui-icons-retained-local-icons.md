# @yakit-libs/yakit-ui-icons 待补充与改造清单

> 审查基线：`@yakit-libs/yakit-ui-icons@0.2.1`。本文只记录需要修改图标库的事项，不把产品端 `size`、CSS 或旧名字兼容问题提交给图标库。

## 1. 结论摘要

- `0.2.1` 仍是 npm `latest`；包内共有 outline 350、solid 255、colorful 296，共 901 个导出。
- 本轮已将 8 个等价图标迁移到包正式导出，并删除 19 个零消费者本地 SVG；合计移除 27 个本地导出路径。
- 迁移后重新审计得到 557 个本地 SVG 导出路径、515 个规范化唯一实现和 792 条 named-import 边。
- `ColorsTaskNodesIcon` 是当前最明确的 P0 包能力缺口：现有候选为固定橙色，产品需要主题驱动版本。
- route 菜单、AI task 状态、插件来源和横向品牌 Logo 需要补齐 themeable、状态或 family 变体，不能直接改变现有 colorful 固定色行为。
- 另有 106 个本地导出路径在 `0.2.1` 三个 family 中未检出可信候选，完整清单见第 6 节。
- “未检出可信候选”不是“包中绝对不存在”；新版本发布后必须重新用 registry、`sourceNodeId`、几何和 paint 证据复核。

官方基线：

- [npm 包页面](https://www.npmjs.com/package/@yakit-libs/yakit-ui-icons)
- [npm Registry 0.2.1 元数据](https://registry.npmjs.org/@yakit-libs%2Fyakit-ui-icons/0.2.1)
- [npm Registry 包元数据与版本历史](https://registry.npmjs.org/@yakit-libs%2Fyakit-ui-icons)

## 2. 不需要修改图标库：产品端直接替换

以下项目已有可信等价导出。包侧不得为了兼容旧名字增加 alias；Yakit 直接使用正式名字。

| 本地导出                    | 包导出                     | family   | 证据                                  |
| --------------------------- | -------------------------- | -------- | ------------------------------------- |
| `OutlineArrowscollapseIcon` | `ArrowsOutlined`           | outline  | 语义、几何、paint 与默认尺寸契约一致  |
| `OutlineExportIcon`         | `FigmaIcon2017756Outlined` | outline  | 语义、几何、paint 与默认尺寸契约一致  |
| `RedoDotIcon`               | `RedoDotOutlined`          | outline  | 语义、几何、paint 与默认尺寸契约一致  |
| `ColorsMemfitIcon`          | `MemfitLogoColorful`       | colorful | 同一 Figma `sourceNodeId: 44520:3547` |
| `RewindIcon`                | `RewindSolid`              | solid    | 语义、几何、paint 与默认尺寸契约一致  |
| `SortAscendingIcon`         | `SortAscendingOutlined`    | outline  | 语义、几何、paint 与默认尺寸契约一致  |
| `SortDescendingIcon`        | `SortDescendingOutlined`   | outline  | 语义、几何、paint 与默认尺寸契约一致  |
| `IconListOrdered`           | `ListOrderedOutlined`      | outline  | 语义、几何、paint 与默认尺寸契约一致  |

`PlusSmIcon → PlusSmOutlined` 不在此表。旧实现使用 2px 描边且存在非零视觉差异；只有设计确认 2px 是独立规范时，才向包新增正式变体。

## 3. P0：新增主题化任务节点图标

### `ColorsTaskNodesIcon`

| 项目         | 本地实现                         | `0.2.1` 候选                               |
| ------------ | -------------------------------- | ------------------------------------------ |
| 语义         | 主题化任务节点 loading           | `WebWorkingTaskColorful`，Web working 状态 |
| 颜色         | `var(--Colors-Use-Main-Primary)` | 固定 `#F28C45`                             |
| paint mode   | 主题驱动                         | `literal`                                  |
| sourceNodeId | 与包候选不同                     | `45428:2123`                               |

要求：

1. 不修改现有 `WebWorkingTaskColorful` 的固定色行为。
2. 由设计侧补充权威 Figma 节点和任务节点语义。
3. 新增独立 themeable 导出，主色使用 `currentColor` 或包内正式主题 token。
4. registry 的 `paintMode` 应为 `currentColor` 或 `mixed`，不能标为 `literal`。
5. 临时命名方向为 `TaskNodesColorful` 或 `TaskNodesThemeColorful`；最终名称以 Figma 组件语义为准。

## 4. P1：新增状态、主题与 family 变体

### 4.1 AI task 状态

本地 `TaskErrorIcon`、`TaskSuccessIcon`、`TaskSkippedIcon` 分别使用错误、成功和禁用色。`0.2.1` 已提供固定色的 `AppErrorTaskColorful`、`AppSuccessTaskColorful` 和 `AppSkipTaskColorful`，但不能直接保持产品端随主题变化的状态色。

建议为三个现有状态分别新增独立的 themeable/mixed 变体：

- error 对应 `AppErrorTaskColorful` 的主题化变体；
- success 对应 `AppSuccessTaskColorful` 的主题化变体；
- skip 对应 `AppSkipTaskColorful` 的主题化变体。

固定色 colorful 导出保持兼容；新增变体必须拥有独立 registry 项、准确的 `paintMode` 和权威 `sourceNodeId`，不能用 alias 代替主题化能力。

### 4.2 route 菜单图标

`routes/publicIcon.tsx` 和 `routes/privateIcon.tsx` 中大量菜单图标使用：

- `var(--Colors-Use-Main-Primary)`
- `var(--Colors-Use-Neutral-Text-1-Title)`
- `var(--Colors-Use-Basic-Background)`
- hover、selected、disabled 对应的产品主题色

包中已有许多同语义 colorful 菜单资产，但 `0.2.1` 的 colorful registry 使用固定色 `literal`。处理规则：

1. 固定色就是设计规范时，产品直接使用现有 colorful 导出，不改包。
2. 菜单颜色需要随产品主题或状态变化时，新增正式 themeable/mixed 变体。
3. 不得把现有 colorful 导出的固定色整体改成 `currentColor`。
4. primary、secondary、outline、solid 与 active/disabled 必须按设计语义分别建模。
5. 新变体需覆盖 Yakit、enterprise、irify、memfit 的 light/dark 场景。

优先处理被多个 route 消费且已有高置信语义候选的资产：Web Fuzzer、MITM、History、插件商店、规则管理、代码审计、指纹库、网站树、子域名收集、端口监听器和空间引擎。

### 4.3 同源插件与品牌资产的单色变体

以下项目具有相同或强关联的设计来源，但现有 colorful 固定色不能自动满足本地 solid/outline/状态色语义：

| 本地导出                            | 已有包候选                        | sourceNodeId   | 需要确认/补充                |
| ----------------------------------- | --------------------------------- | -------------- | ---------------------------- |
| `SolidCloudpluginIcon`              | `CloudPluginSourceColorful`       | `3409:103589`  | themeable solid/菜单状态变体 |
| `SolidPrivatepluginIcon`            | `PrivatePluginSourceColorful`     | `3409:103588`  | themeable solid/菜单状态变体 |
| `SolidYakCattleNoBackColorIcon`     | `YakLogoColorful`                 | `15454:242111` | 单色品牌标记或确认固定色规范 |
| `PrivateSolidFingerprintManageIcon` | `FingerprintLibrarySolidColorful` | `38051:63673`  | 可继承颜色的 solid family    |
| `PrivateOutlineAuditCodeIcon`       | `CodeAuditOutlineColorful`        | `37560:24991`  | 可继承颜色的 outline family  |

### 4.4 横向品牌 Logo

Yakit、Memfit、IRify 横向 Logo 的本地文字颜色会跟随 `var(--Colors-Use-Neutral-Text-1-Title)`。包内现有背景/横向 colorful 候选需要明确：

- light/dark 文字颜色是否为设计固定值；
- 是否需要无背景、带背景和仅图形三种独立变体；
- 是否需要 `mixed` paint：品牌图形固定色、文字使用 `currentColor`；
- Main 与 Link renderer 是否使用同一 Figma 节点。

若文字必须随主题变化，应新增 mixed 版本，不能修改现有固定色品牌 Logo。

## 5. P2：sourceNodeId 或语义不匹配

存在以下任一情况时，图标库需要补充权威资产或设计说明，不能通过别名解决：

- 本地与候选 `sourceNodeId` 不同且没有设计迁移记录。
- 本地是操作图标，候选是状态、品牌、菜单或业务对象图标。
- 名称接近，但描边粗细、端点、留白或视觉中心不同。
- 本地需要主题色，候选为 fixed literal colorful。
- 只在统一为 24×24 黑色 alpha 栅格后相似。

至少记录以下字段：

| 字段               | 要求                                                          |
| ------------------ | ------------------------------------------------------------- |
| 本地语义与使用页面 | 说明它代表的动作、对象或状态                                  |
| 期望 family        | outline / solid / colorful                                    |
| viewBox 与基准尺寸 | 使用真实产品尺寸，不只比较 16px                               |
| 颜色行为           | currentColor / literal / mixed                                |
| 状态/品牌变体      | default / hover / active / disabled / background / horizontal |
| Figma sourceNodeId | 无权威节点时标记“待设计补齐”                                  |
| 建议正式导出名     | 不沿用 Yakit 本地历史名字                                     |
| 验收页面           | 指定实际截图入口                                              |

## 6. P2/P3：0.2.1 未检出可信候选

以下是 106 个已审计导出路径。部分路径是同一 SVG 的 barrel/re-export，因此包侧应先按几何与 `sourceNodeId` 去重，再确定最终新增资产数。

### `app/renderer/src/main/src/assets/commonProcessIcons.tsx`（15）

`BaiduNetdiskIcon`；`BashIcon`；`BurpSuiteCommunityIcon`；`BurpSuiteProfessionalIcon`；`ClashIconSvgIcon`；`Cse360Icon`；`FinderIcon`；`OpenvpnIcon`；`ProxifierIcon`；`QqIcon`；`Se360Icon`；`TelegramIcon`；`UToolsIcon`；`VMwareIcon`；`ZSHIcon`

### `app/renderer/src/main/src/assets/icon/bespokeOutline.tsx`（3）

`OutlineConfiguredIcon`；`OutlineModScanPortDataIcon`；`OutlineUnConfiguredIcon`

### `app/renderer/src/main/src/assets/icon/bespokeSolid.tsx`（1）

`SolidFloatwinIcon`

### `app/renderer/src/main/src/assets/icon/colors.tsx`（2）

`ColorsOutlineWarpIcon`；`IconSolidAIWhiteIcon`

### `app/renderer/src/main/src/assets/icons.tsx`（7）

`ControlMyselfIcon`；`ControlOtherIcon`；`LineConversionIcon`；`OnlineSurfaceIcon`；`OnlineThumbsUpIcon`；`RecycleIcon`；`TraceSvgSvgIcon`

### `app/renderer/src/main/src/assets/icons/dynamicControl.tsx`（2）

`ControlMyselfIcon`；`ControlOtherIcon`

### `app/renderer/src/main/src/assets/icons/lineConversion.tsx`（1）

`LineConversionIcon`

### `app/renderer/src/main/src/assets/icons/traceSvg.tsx`（1）

`TraceSvgSvgIcon`

### `app/renderer/src/main/src/assets/newIcon.tsx`（2）

`PolygonIcon`；`ResizerIcon`

### `app/renderer/src/main/src/components/basics/icon.tsx`（1）

`YakitLoadingSvgIcon`

### `app/renderer/src/main/src/components/CeUserMenu/icon.tsx`（5）

`MetricCaptionFailedIcon`；`MetricCaptionSuccessIcon`；`PayFailedIcon`；`PaySuccessIcon`；`QrLoadingIcon`

### `app/renderer/src/main/src/components/configNetwork/icon.tsx`（3）

`RectangleFailIcon`；`RectangleSucceeIcon`；`UnionIcon`

### `app/renderer/src/main/src/components/layout/icons.tsx`（6）

`GooglePhotosLogoSvgIcon`；`MacUIOpCloseSvgIcon`；`MacUIOpMaxSvgIcon`；`MacUIOpMinSvgIcon`；`MacUIOpRestoreSvgIcon`；`YaklangSvgIcon`

### `app/renderer/src/main/src/components/MessageCenter/IconMessageCenter.tsx`（2）

`LoginMessageIcon`；`NoLoginMessageIcon`

### `app/renderer/src/main/src/components/MilkdownEditor/icon/icon.tsx`（12）

`IconBold`；`IconCheckSquare`；`IconCurlyBraces`；`IconFlipVertical`；`IconHeading1`；`IconHeading2`；`IconHeading3`；`IconItalic`；`IconQuote`；`IconStrikethrough`；`IconType`；`IconUnderline`

### `app/renderer/src/main/src/components/yakChat/icon.tsx`（2）

`YakChatBookIcon`；`YakitChatCSIcon`

### `app/renderer/src/main/src/pages/ai-agent/aiChatWelcome/icon.tsx`（9）

`AIDetailsDashIcon`；`AIDownAngleLeftIcon`；`AIDownAngleRightIcon`；`AIForgeIcon`；`AIToolIcon`；`AIUpAngleLeftIcon`；`AIUpAngleRightIcon`；`HoverAIForgeIcon`；`HoverAIToolIcon`

### `app/renderer/src/main/src/pages/fuzzer/FuzzerSequence/icon.tsx`（2）

`InheritArrowIcon`；`InheritLineIcon`

### `app/renderer/src/main/src/pages/irifyHome/icon.tsx`（4）

`IRifyHomeHighIcon`；`IRifyHomeLowIcon`；`IRifyHomeMediumIcon`；`IRifyHomeSeriousIcon`

### `app/renderer/src/main/src/pages/KnowledgeBase/icon/sidebarIcon.tsx`（18）

`BatmanIcon`；`CarIcon`；`CatIcon`；`CrabIcon`；`DiamondIcon`；`DogIcon`；`HeadphonesIcon`；`JumpingDragonIcon`；`MeasuringCupIcon`；`OctopusIcon`；`PigIcon`；`RabbitIcon`；`SkeletonIcon`；`SleepingCatIcon`；`SmileyFaceIcon`；`TigerIcon`；`TVIcon`；`WalletIcon`

### `app/renderer/src/main/src/pages/webShell/icon.tsx`（4）

`DragonFailIcon`；`DragonSuccessIcon`；`ScorpioFailIcon`；`ScorpioSuccessIcon`

### `app/renderer/engine-link-startup/src/assets/newIcon.tsx`（3）

`GooglePhotosLogoSvgIcon`；`MacUIOpCloseSvgIcon`；`ResizerIcon`

### `app/renderer/src/main/src/pages/pluginHub/pluginLog/PluginLogOpt.tsx`（1）

`PopoverArrowIcon`

## 7. 不应提交给图标库的问题

以下问题只在 Yakit 产品端处理：

- 传递 `size` 保持 12/16/18/20/24/30/32/48px 布局。
- 使用 `color`、`style.color` 或局部 CSS token 驱动本来就是 `currentColor` 的单色图标。
- 将选择器从本地 SVG 根节点迁移到 `span.yakit-icon > svg`。
- 把事件、ARIA、`className`、`style` 和 ref 放在外层 `span`。
- 使用 `svgProps` 设置内层 SVG 表现属性。
- 仅为兼容本地旧组件名而增加 alias。
- 没有任何消费者的本地 SVG；这类实现应直接删除，不向包增加无用导出。

原 95 个高相似候选中的 19 个零消费者实现已直接删除；剩余 76 项仍需要产品消费者级视觉/API 复核。它们不是默认的包改造需求；完整候选和原因见 `.omx/plans/static-svg-icon-migration-plan.md`。

## 8. 图标库实现要求

### 导出与 registry

- 从正确 family 子入口导出：`/outline`、`/solid` 或 `/colorful`。
- 同时进入根入口、TypeScript 声明与 `iconRegistry`。
- registry 包含 `exportName`、`figmaName`、`family`、`sourceNodeId`、`sourceStatus` 和准确的 `paintMode`。
- 新语义使用新导出；不得通过修改现有导出的几何或颜色行为实现。

### 主题与 SVG 安全

- themeable 主色路径使用 `currentColor` 或正式 token。
- 固定品牌色加主题文字的图标使用 `mixed`，不能误标 `literal`。
- `mask`、`clipPath`、gradient 等 fragment ID 使用包现有隔离机制，多实例不得冲突。
- 保持 `span.anticon.yakit-icon > svg` DOM 契约，以及 `size`、`color`、`svgProps`、ref、事件和 ARIA 行为。
- 保持 ESM、SSR/hydration 与 family tree-shaking。

## 9. 发布与回收验收

每个新增/改造图标必须通过：

1. Figma 节点、`sourceNodeId`、名称、category 和业务语义验收。
2. 在产品实际尺寸下进行截图或像素对比，而不是只看默认 16px。
3. light/dark 与 default/hover/active/selected/disabled 验收。
4. colorful/mixed 的固定色、主题色、透明度、mask 与 gradient 验收。
5. 根入口、family 子入口、registry 和 TypeScript 类型导入测试。
6. 多实例 fragment ID、SSR/hydration、tree-shaking 和 CSS side effect 测试。
7. 只新增导出/变体，不删除或改变现有导出的默认表现。

Yakit 只有在新版本发布并锁定、registry 元数据可核验、实际页面截图通过、旧导出引用归零且 Main/Link typecheck、lint、目标测试和构建通过后，才删除对应本地 SVG。
