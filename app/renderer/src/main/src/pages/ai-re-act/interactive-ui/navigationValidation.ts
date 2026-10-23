import type { UINode } from './validate'

export function normalizeNavigation(node: UINode, diagnose: (path: string, message: string) => void): boolean {
  if (node.component !== 'Tabs') return true
  const items: { id: string; content: string }[] = node.props.items
  if (['id', 'content'].some((key) => new Set(items.map((item) => item[key])).size !== items.length)) {
    diagnose('props.items', '标签 ID 和内容节点引用必须唯一')
    return false
  }
  const children = items.map((item) => item.content)
  if (node.children && JSON.stringify(node.children) !== JSON.stringify(children))
    diagnose('children', '标签页子节点由 items.content 决定，已修正')
  node.children = children
  if (node.props.defaultTab !== undefined && !items.some((item) => item.id === node.props.defaultTab)) {
    delete node.props.defaultTab
    diagnose('props.defaultTab', '默认标签不存在，使用第一项')
  }
  return true
}
