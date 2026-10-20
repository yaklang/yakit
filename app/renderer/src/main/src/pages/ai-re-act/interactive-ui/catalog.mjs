// This data-only catalog is the source for both the prompt manifest and validation.
const text = { type: 'string', maxLength: 8000 }
const shortText = { type: 'string', maxLength: 256 }
const primitive = { anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] }
const object = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false })
const array = (items, maxItems = 100) => ({ type: 'array', items, maxItems })
const field = object(
  {
    type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array'] },
    title: shortText,
    description: shortText,
    default: { anyOf: [primitive, array(primitive)] },
    enum: array(primitive, 30),
    minimum: { type: 'number' },
    maximum: { type: 'number' },
    minLength: { type: 'integer', minimum: 0, maximum: 8000 },
    maxLength: { type: 'integer', minimum: 0, maximum: 8000 },
    items: object({ type: { const: 'string' }, enum: array(shortText, 30) }, ['type']),
  },
  ['type'],
)
const formSchema = object(
  {
    type: { const: 'object' },
    properties: { type: 'object', maxProperties: 30, additionalProperties: field },
    required: array(shortText, 30),
    additionalProperties: { const: false, default: false },
  },
  ['type', 'properties'],
)
const submit = object({ label: { ...shortText, default: '提交到对话' } })

export const catalog = {
  version: '1.0',
  components: [
    {
      name: 'Stack',
      description: '按顺序排列少量子节点，用于分组。children 是节点 ID，禁止循环。',
      schema: object({ title: shortText }),
      children: true,
    },
    {
      name: 'Text',
      description: '简短纯文本说明。不会执行或解析 HTML。',
      schema: object({ text: { ...text, minLength: 1 } }, ['text']),
    },
    {
      name: 'ComparisonTable',
      description: '比较候选方案。columns 的 key 对应每行单元格的键。',
      schema: object(
        {
          title: shortText,
          columns: { ...array(object({ key: shortText, label: shortText }, ['key', 'label']), 12), minItems: 1 },
          rows: array({ type: 'object', maxProperties: 12, additionalProperties: primitive }, 100),
        },
        ['columns', 'rows'],
      ),
    },
    {
      name: 'ParameterForm',
      description:
        '收集参数，使用平面 JSON Schema。只支持字符串、数值、布尔值和字符串数组；禁止 $ref、uiSchema、文件、代码和表达式。bindings.value 是本节点的本地状态键。只有显式 submit_to_chat 才向对话发送。',
      schema: object(
        {
          title: shortText,
          schema: formSchema,
          initial: {
            type: 'object',
            maxProperties: 30,
            additionalProperties: { anyOf: [primitive, array(primitive)] },
          },
        },
        ['schema'],
      ),
      bindings: ['value'],
      actions: { submit_to_chat: submit },
    },
    {
      name: 'Steps',
      description: '展示步骤和当前状态。status: pending=未开始，active=进行中，done=完成，error=失败。',
      schema: object(
        {
          title: shortText,
          items: array(
            object(
              {
                title: shortText,
                description: text,
                status: { type: 'string', enum: ['pending', 'active', 'done', 'error'], default: 'pending' },
              },
              ['title'],
            ),
            30,
          ),
        },
        ['items'],
      ),
    },
    {
      name: 'Metrics',
      description: '展示少量指标，不用于精密图表。value 为显示值，unit 为单位。',
      schema: object(
        {
          title: shortText,
          items: array(
            object({ label: shortText, value: primitive, unit: shortText, description: shortText }, ['label', 'value']),
            12,
          ),
        },
        ['items'],
      ),
    },
  ],
}

export const clientUI = { protocol: 'memfit.ui/1', questions: true, catalog }
