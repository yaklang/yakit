// Data-only definitions shared by on-demand model loading and runtime validation.
export const visualizationComponents = [
  {
    name: 'BarChart',
    description:
      '比较类别之间的数值大小或排名。默认横向条形，多系列使用分组柱；不做堆叠。前端提供数值标签、悬浮/键盘聚焦读数和本地图例开关，不向模型发消息。数值轴必须包含零；允许负数，null 表示缺失并留空，不能当作零。所有系列共用 unit。categories.id 和 series.id 各自唯一且在增量更新时稳定；每个 values 与 categories 按顺序一一对应。完整节点中长度不一致应记录诊断并降级，流式未完成时只展示已配对数据。颜色由项目主题按 series.id 分配，不接受自定义颜色、样式或图表库 options。',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 256 },
        unit: { type: 'string', maxLength: 256, description: '全部系列的共同单位，例如 个、ms、MB。' },
        orientation: {
          type: 'string',
          enum: ['horizontal', 'vertical'],
          default: 'horizontal',
          description: 'horizontal=横向条形，适合排名和较长标签；vertical=纵向柱形，适合少量短标签。',
        },
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', minLength: 1, maxLength: 128 },
              label: { type: 'string', maxLength: 256, minLength: 1 },
            },
            required: ['id', 'label'],
            additionalProperties: false,
          },
          minItems: 1,
          maxItems: 30,
        },
        series: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', minLength: 1, maxLength: 128 },
              label: { type: 'string', maxLength: 256, minLength: 1 },
              values: {
                type: 'array',
                items: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                minItems: 1,
                maxItems: 30,
                description: '与 categories 等长；位置一一对应。数值必须有限，null 为缺失值。',
              },
            },
            required: ['id', 'label', 'values'],
            additionalProperties: false,
          },
          minItems: 1,
          maxItems: 4,
        },
      },
      required: ['categories', 'series'],
      additionalProperties: false,
    },
  },
  {
    name: 'LineChart',
    description:
      '展示数值轴或时间轴上的趋势，最多四个同单位系列。前端提供悬浮/键盘聚焦读数、本地图例开关；不发送消息，不提供计算联动。x 按真实数值间距绘制，不能把不等时间间隔画成等距。每个系列内 x 严格递增且不重复；series.id 唯一且稳定，点以 series.id+x 标识。y=null 表示缺失，折线在此断开，禁止补零或插值。至少一个非空 y 才绘制图线，否则显示无数据。数值必须有限，不做平滑或双 Y 轴；颜色和样式沿用项目主题。',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 256 },
        xType: {
          type: 'string',
          enum: ['number', 'time'],
          default: 'number',
          description: 'number=连续数值轴；time=连续时间轴，x 为 Unix 毫秒时间戳，界面按客户端时区显示日期和时区。',
        },
        xLabel: { type: 'string', maxLength: 256, description: '横轴名称及必要单位，例如 并发数、耗时（秒）、日期。' },
        yUnit: { type: 'string', maxLength: 256, description: '全部系列共同的纵轴单位。不同单位应拆成不同图。' },
        series: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', minLength: 1, maxLength: 128 },
              label: { type: 'string', maxLength: 256, minLength: 1 },
              points: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    x: {
                      type: 'number',
                      description: '有序横坐标。xType=time 时为整数 Unix 毫秒时间戳，必须在客户端有效日期范围内。',
                    },
                    y: { anyOf: [{ type: 'number' }, { type: 'null' }], description: '有限数值，或表示缺失的 null。' },
                  },
                  required: ['x', 'y'],
                  additionalProperties: false,
                },
                minItems: 1,
                maxItems: 200,
              },
            },
            required: ['id', 'label', 'points'],
            additionalProperties: false,
          },
          minItems: 1,
          maxItems: 4,
        },
      },
      required: ['series'],
      additionalProperties: false,
    },
  },
  {
    name: 'DataTable',
    description:
      '展示需要排序、筛选或选中后回传的明细数据。只需静态比较时用 ComparisonTable。前端持有排序、筛选、分页和选择状态，排序筛选不触发模型；默认每页 20 行。columns.key 和 rows.id 各自唯一且稳定；values 的键只能来自 columns，非空值必须符合对应列 type；缺失/null 显示为无数据，不显示为零。字符串筛选是包含匹配，数字/布尔筛选是精确匹配，不支持代码或正则表达式。initialSort.key 必须指向允许排序的列。初始状态只初始化一次，增量渲染保留本地状态。selection 开启时 bindings.value 指向本地状态键，状态中的 selectedRowIds 初始为空；筛选分页保留选择，并展示包含隐藏行的已选数量。submit_to_chat 显式提交所选行的人类可读文本和结构化回执，元数据携带文档/节点/行 ID；不提交未选行。仅在 selection 非 none、已声明动作且选中至少一行时允许提交；成功后只读并移除提交按钮，失败保留选择可重试。',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 256 },
        columns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', minLength: 1, maxLength: 128 },
              label: { type: 'string', maxLength: 256, minLength: 1 },
              type: {
                type: 'string',
                enum: ['string', 'number', 'boolean'],
                description:
                  'string=文本；number=有限数值，按数值排序；boolean=布尔值。null 和缺失值统一作为无数据排在末尾。',
              },
              sortable: { type: 'boolean', default: true },
              filterable: { type: 'boolean', default: true },
            },
            required: ['key', 'label', 'type'],
            additionalProperties: false,
          },
          minItems: 1,
          maxItems: 12,
        },
        rows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', minLength: 1, maxLength: 128 },
              values: {
                type: 'object',
                maxProperties: 12,
                additionalProperties: {
                  anyOf: [
                    { type: 'string', maxLength: 2000 },
                    { type: 'number' },
                    { type: 'boolean' },
                    { type: 'null' },
                  ],
                },
              },
            },
            required: ['id', 'values'],
            additionalProperties: false,
          },
          minItems: 0,
          maxItems: 200,
        },
        initialSort: {
          type: 'object',
          properties: {
            key: { type: 'string', minLength: 1, maxLength: 128 },
            direction: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'asc',
              description: 'asc=升序；desc=降序；相等值保持原输入顺序。',
            },
          },
          required: ['key'],
          additionalProperties: false,
        },
        selection: {
          type: 'string',
          enum: ['none', 'single', 'multiple'],
          default: 'none',
          description: 'none=仅查看；single=最多选中一行；multiple=可选多行。推荐或排序均不会自动选择或提交。',
        },
      },
      required: ['columns', 'rows'],
      additionalProperties: false,
    },
    bindings: ['value'],
    actions: {
      submit_to_chat: {
        type: 'object',
        properties: { label: { type: 'string', maxLength: 256, default: '提交选中行' } },
        required: [],
        additionalProperties: false,
      },
    },
  },
]
