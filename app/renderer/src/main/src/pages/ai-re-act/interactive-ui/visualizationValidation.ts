import type { UINode } from './validate'

// Cross-field constraints supplement the shared JSON Schema, never replace it.
export function normalizeVisualization(node: UINode, diagnose: (path: string, message: string) => void): boolean {
  const { component, props } = node
  const unique = (items: Record<string, any>[], key: string, path: string) => {
    if (new Set(items.map((item) => item[key])).size === items.length) return true
    diagnose(path, '标识重复，组件已丢弃')
    return false
  }
  if (component === 'BarChart') {
    if (!unique(props.categories, 'id', 'props.categories') || !unique(props.series, 'id', 'props.series')) return false
    if (
      props.series.some(
        (series) =>
          series.values.length !== props.categories.length ||
          series.values.some((v) => v !== null && !Number.isFinite(v)),
      )
    ) {
      diagnose('props.series', '系列必须与类别等长，数值必须有限')
      return false
    }
  }
  if (component === 'LineChart') {
    if (!unique(props.series, 'id', 'props.series')) return false
    for (const series of props.series) {
      if (
        series.points.some(
          (point, index) =>
            !Number.isFinite(point.x) ||
            (point.y !== null && !Number.isFinite(point.y)) ||
            (index > 0 && point.x <= series.points[index - 1].x) ||
            (props.xType === 'time' && (!Number.isInteger(point.x) || Math.abs(point.x) > 8640000000000000)),
        )
      ) {
        diagnose('props.series', '横坐标必须严格递增且有效，数值必须有限')
        return false
      }
    }
  }
  if (component === 'DataTable') {
    if (!unique(props.columns, 'key', 'props.columns') || !unique(props.rows, 'id', 'props.rows')) return false
    const columns = new Map<string, any>(props.columns.map((column) => [column.key, column]))
    for (const [index, row] of props.rows.entries()) {
      for (const [key, value] of Object.entries(row.values)) {
        const column = columns.get(key)
        if (!column) {
          delete row.values[key]
          diagnose(`props.rows[${index}].values.${key}`, '未声明的列已丢弃')
        } else if (
          value !== null &&
          (typeof value !== column.type || (column.type === 'number' && !Number.isFinite(value)))
        ) {
          row.values[key] = null
          diagnose(`props.rows[${index}].values.${key}`, '单元格类型不匹配，已清空')
        }
      }
    }
    if (
      props.initialSort &&
      (!columns.has(props.initialSort.key) || columns.get(props.initialSort.key).sortable === false)
    ) {
      delete props.initialSort
      diagnose('props.initialSort', '排序列不存在或不允许排序')
    }
  }
  return true
}
