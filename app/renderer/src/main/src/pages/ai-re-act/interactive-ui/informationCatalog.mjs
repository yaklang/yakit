const text = (maxLength = 256) => ({ type: 'string', minLength: 1, maxLength })
const object = (properties, required) => ({ type: 'object', properties, required, additionalProperties: false })
const placement = { type: 'string', enum: ['top', 'bottom', 'left', 'right'], default: 'top' }

export const informationComponents = [
  {
    name: 'Alert',
    description:
      '显著展示风险、注意事项、成功或错误说明。severity: info=信息、success=成功、warning=风险或注意、error=错误。内容为纯文本，保持可见，不自动消失；关键风险必须直接展示，不能藏在 Tooltip、Popover 或非默认标签页中。',
    schema: object(
      {
        title: text(),
        description: text(8000),
        severity: { type: 'string', enum: ['info', 'success', 'warning', 'error'], default: 'info' },
      },
      ['title'],
    ),
  },
  {
    name: 'Tabs',
    description:
      '切换同一主题的多个视图，如请求/响应、原始/解析。items 每项有稳定唯一 id、label 和 content；content 是文档 nodes 中一个内容节点的 ID，多个内容先放入 Stack。内容节点不可重复引用，禁止循环；children 由 items.content 自动生成，无需另填。defaultTab 是标签 id，默认第一项。variant=tabs 为标签页，segmented 为分段外观。前端保存选择，流式更新不自动切换或抢焦点，切换保留各页输入和选择；切换不发送消息。不要用标签页隐藏关键风险。',
    schema: object(
      {
        title: text(),
        items: {
          type: 'array',
          minItems: 1,
          maxItems: 8,
          items: object({ id: text(128), label: text(), content: text(128) }, ['id', 'label', 'content']),
        },
        defaultTab: text(128),
        variant: { type: 'string', enum: ['tabs', 'segmented'], default: 'tabs' },
      },
      ['items'],
    ),
    children: true,
  },
  {
    name: 'Tooltip',
    description:
      '为可见 label 提供简短的术语或字段解释。content 为纯文本，悬停、键盘聚焦或点击可查看，Escape 关闭。不嵌套组件或动作；较长说明使用 Popover，重要风险使用 Alert。',
    schema: object({ label: text(), content: text(1000), placement }, ['label', 'content']),
  },
  {
    name: 'Popover',
    description:
      '点击 label 展开补充说明或原始字段。可选 title，content 为纯文本，保留换行；不嵌套表单、组件或动作。点击外部、Escape 或页面滚动关闭，空间不足自动调整位置；只改变前端状态，不等待模型或发送消息。',
    schema: object({ label: text(), title: text(), content: text(8000), placement }, ['label', 'content']),
  },
]
