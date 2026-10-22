import { catalog } from '../../../app/renderer/src/main/src/pages/ai-re-act/interactive-ui/catalog.mjs'

// Deliberately explicit: adding a catalog entry must also add a visible example.
const props = {
  Stack: { title: '模块分组' },
  Text: { text: '前端 → API → 数据库' },
  ComparisonTable: {
    columns: [
      { key: 'name', label: '方案' },
      { key: 'cost', label: '成本' },
    ],
    rows: [
      { name: '单机', cost: 100 },
      { name: '集群', cost: 300 },
    ],
  },
  ParameterForm: {
    title: '参数设置',
    schema: {
      type: 'object',
      properties: { name: { type: 'string', title: '姓名', minLength: 1 } },
      required: ['name'],
    },
  },
  Steps: { items: [{ title: '读取', status: 'done' }, { title: '分析', status: 'active' }, { title: '交付' }] },
  Metrics: {
    items: [
      { label: '发现问题', value: 12, unit: '个' },
      { label: '成功率', value: 98, unit: '%' },
    ],
  },
  BarChart: {
    categories: [
      { id: 'api', label: 'API 网关' },
      { id: 'web', label: '管理界面' },
    ],
    series: [
      { id: 'current', label: '本次', values: [12, -4] },
      { id: 'previous', label: '上次', values: [8, null] },
    ],
  },
  LineChart: {
    series: [
      {
        id: 'latency',
        label: '延迟',
        points: [
          { x: 0, y: 4 },
          { x: 1, y: null },
          { x: 10, y: 8 },
          { x: 30, y: 5 },
        ],
      },
    ],
  },
  DataTable: {
    columns: [
      { key: 'name', label: '模块', type: 'string' },
      { key: 'count', label: '问题数量', type: 'number' },
    ],
    rows: [
      { id: 'api', values: { name: 'API 网关', count: 12 } },
      { id: 'web', values: { name: '管理界面', count: 4 } },
    ],
    selection: 'multiple',
  },
  Alert: { title: '存在风险', description: '请先确认目标范围。', severity: 'warning' },
  Tabs: {
    items: [
      { id: 'request', label: '请求', content: 'request-content' },
      { id: 'response', label: '响应', content: 'response-content' },
    ],
  },
  Tooltip: { label: '术语解释', content: 'P95 表示 95% 请求低于此延迟。' },
  Popover: { label: '查看原始字段', title: '原始响应', content: 'status: 200\ncontent-type: application/json' },
}

export const examples = Object.fromEntries(
  Object.entries(props).map(([component, value]) => [
    component,
    {
      id: `example-${component}`,
      catalogVersion: catalog.version,
      fallback: `${component} 文本降级`,
      root: 'root',
      nodes: [
        {
          id: 'root',
          component,
          props: value,
          ...(component === 'Stack' ? { children: ['child'] } : {}),
          ...(['ParameterForm', 'DataTable'].includes(component)
            ? { bindings: { value: 'answer' }, action: { name: 'submit_to_chat', args: { label: '提交到对话' } } }
            : {}),
        },
        ...(component === 'Stack' ? [{ id: 'child', component: 'Text', props: { text: '分组内容' } }] : []),
        ...(component === 'Tabs'
          ? [
              { id: 'request-content', component: 'Text', props: { text: 'GET /api/items' } },
              { id: 'response-content', component: 'Text', props: { text: '200 OK' } },
            ]
          : []),
      ],
    },
  ]),
)

export function question(mode = 'async', deadline) {
  return {
    id: 'question',
    taskId: 'task',
    mode,
    state: 'pending',
    touched: false,
    deadline,
    questions: [
      {
        id: 'audience',
        title: '目标受众',
        prompt: '架构说明面向谁？',
        multiple: false,
        allowFreeText: true,
        options: [
          { id: 'dev', label: '开发者', recommended: true },
          { id: 'pm', label: '产品经理' },
        ],
      },
      {
        id: 'focus',
        title: '关注重点',
        prompt: '希望了解哪些内容？',
        multiple: true,
        allowFreeText: false,
        options: [
          { id: 'data', label: '数据流' },
          { id: 'deploy', label: '部署方式' },
        ],
      },
      {
        id: 'detail',
        title: '输出深度',
        prompt: '需要多详细？',
        multiple: false,
        allowFreeText: true,
        options: [
          { id: 'short', label: '简明' },
          { id: 'long', label: '详细' },
        ],
      },
    ],
  }
}
