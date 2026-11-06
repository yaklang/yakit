import { visualizationComponents } from './visualizationCatalog.mjs'
import { informationComponents } from './informationCatalog.mjs'

// Send the full data-only catalog for negotiation and validation. The backend
// exposes a bounded name index and loads selected definitions into model context.
const text = { type: 'string', maxLength: 8000 }
const shortText = { type: 'string', maxLength: 256 }
const primitive = { anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] }
const object = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false })
const array = (items, maxItems = 100) => ({ type: 'array', items, maxItems })
export const catalog = {
  version: '1.3',
  compatibleVersions: [],
  components: [
    ...visualizationComponents,
    ...informationComponents,
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
