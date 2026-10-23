# Memfit UI 契约

## 展示：render_ui

当前 catalog 1.3 包含 12 个展示组件：Stack、Text、ComparisonTable、Steps、Metrics、BarChart、LineChart、DataTable、Alert、Tabs、Tooltip、Popover。

权威定义在 `app/renderer/src/main/src/pages/ai-re-act/interactive-ui/catalog.mjs` 及其引用的目录中，构建清单为同目录 `catalog.manifest.json`。运行 `node scripts/export-memfit-ui-catalog.mjs --check` 检查同步；具体可渲染样例在 `e2e/fixtures/memfit-ui/examples.mjs`。

模型先 `load_ui_components({"names":["BarChart"]})`，再 `render_ui({"ui": ...})`。目录索引有预算上限，完整 Schema 按当前批次加载，不永久追加到历史。保持稳定的文档/节点 ID，必须提供纯文本 fallback。

展示组件只允许本地查看交互：图例、排序、筛选、分页、Tabs 和浮层。没有 ParameterForm、行选择回传、bindings 或 submit_to_chat。未知组件和非法参数按既有规则诊断、降级；出现提交动作的节点会被拒绝。旧版本文档整体文本降级，不把旧表单转换成新协议。

## 收集回答：ask_for_clarification / ask_for_clarification_async

两个 action 共用一个请求结构，`questions` 和 `form` 必须且只能提供一个：

- `questions`：1–3 道问题，每题 2–10 项，单选/多选、选项说明、推荐项、allowFreeText，逐题翻页。
- `form`：平面 JSON Schema 参数表单，支持字符串、数值、整数、布尔、枚举和字符串数组；支持 title、description、required、default、范围、fieldOrder 和 initial。定义以同目录 `questionForm.schema.json` 为准。

示例：

```json
{
  "form": {
    "title": "部署参数",
    "schema": {
      "type": "object",
      "properties": {
        "environment": {"type": "string", "title": "环境", "enum": ["测试", "生产"]},
        "replicas": {"type": "integer", "title": "副本数", "minimum": 1, "maximum": 10, "default": 2},
        "backup": {"type": "boolean", "title": "启用备份", "default": true}
      },
      "required": ["environment", "replicas"]
    },
    "fieldOrder": ["environment", "replicas", "backup"]
  },
  "timeoutSeconds": 60
}
```

两种提问都在输入栏上方浮层展示。异步调用立即返回，回答稍后作为普通用户消息到达；阻塞式仅用于确实无法继续的情形。表单默认值仅供编辑，绝不自动提交。前端先校验，后端再用保存的原始 Schema 校验并生成权威回答文本，回执使用 `source: "questionnaire"`，表单携带 `values`，选择题携带 `answers`。一次成功提交后不再展示提交/跳过按钮，重试沿用回执 ID。

真实交互永久取消异步截止时间；Esc 收起并保留草稿；表单跳过关闭请求且不发送答案。到期后可从历史补答。所有问法共用主动提问权限、PLAN/任务次数和去重机制；goal 禁止阻塞式，subagent/worker 不直接向用户提问。

关闭主动提问后，模型的工具列表、Schema 和提问指导均不暴露 ask；Go 执行层也会拒绝旧调用和回传。展示型 render_ui 不受提问开关影响。

## 回归

运行 `yarn test:memfit-ui:all`，无需连接模型。详见 `e2e/fixtures/memfit-ui/README.md`。新增展示组件需补目录样例；新增问法在 QuestionCard/QuestionForm 测试及 Electron composer 场景中验证。
