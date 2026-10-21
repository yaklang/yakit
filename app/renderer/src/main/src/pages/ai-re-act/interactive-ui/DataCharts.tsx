import React, { useRef, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { NodeProps } from './ComponentCard'
import styles from './interactive.module.scss'

const colors = [
  'var(--Colors-Use-Main-Primary)',
  'var(--Colors-Use-Success-Primary)',
  'var(--Colors-Use-Warning-Primary)',
  'var(--Colors-Use-Error-Primary)',
]
const compact = (value: number) =>
  Math.abs(value) >= 1e15 || (value !== 0 && Math.abs(value) < 0.001)
    ? value.toExponential(2)
    : new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4, notation: 'compact' }).format(value)
// Normalize before subtracting to avoid overflow for large, finite model numbers.
export function chartScale(min: number, max: number, start: number, end: number) {
  const divisor = Math.max(Math.abs(min), Math.abs(max), 1)
  const lo = min / divisor
  const span = max / divisor - lo
  return (value: number) => (span === 0 ? (start + end) / 2 : start + ((value / divisor - lo) / span) * (end - start))
}
const ticks = (min: number, max: number) =>
  min === max ? [min] : Array.from({ length: 5 }, (_, i) => min * (1 - i / 4) + max * (i / 4))

export function DataChart({ node, state, change }: NodeProps) {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [detail, setDetail] = useState('')
  const order = useRef<string[]>([...((state?.value.seriesOrder as string[]) || [])])
  for (const series of node.props.series) if (!order.current.includes(series.id)) order.current.push(series.id)
  const hidden = (state?.value.hiddenSeriesIds as string[]) || []
  const visible = node.props.series.filter((series) => !hidden.includes(series.id))
  const color = (id: string) => colors[order.current.indexOf(id) % colors.length]
  const bar = node.component === 'BarChart'
  const horizontal = bar && node.props.orientation !== 'vertical'
  const unit = (bar ? node.props.unit : node.props.yUnit) || ''
  const width =
    bar && !horizontal ? Math.max(640, node.props.categories.length * Math.max(100, visible.length * 32)) : 720
  const height = horizontal ? Math.max(180, node.props.categories.length * Math.max(38, visible.length * 24) + 44) : 300
  const left = horizontal ? 180 : 68
  const right = width - 52
  const top = 20
  const bottom = height - 48
  const values: number[] = visible.flatMap((series) =>
    bar ? series.values.filter((v) => v !== null) : series.points.filter((p) => p.y !== null).map((p) => p.y),
  )
  const min = values.length ? Math.min(...values, ...(bar ? [0] : [])) : 0
  const max = values.length ? Math.max(...values, ...(bar ? [0] : [])) : 1
  const valueScale = chartScale(
    min,
    max === min && bar ? max + 1 : max,
    horizontal ? left : bottom,
    horizontal ? right : top,
  )
  const xs: number[] = bar ? [] : visible.flatMap((series) => series.points.map((point) => point.x))
  const xMin = xs.length ? Math.min(...xs) : 0
  const xMax = xs.length ? Math.max(...xs) : 1
  const xScale = chartScale(xMin, xMax, left, right)
  const formatX = (x: number, full = false) =>
    node.props.xType === 'time'
      ? new Intl.DateTimeFormat(
          undefined,
          full
            ? { dateStyle: 'medium', timeStyle: 'long' }
            : { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
        ).format(new Date(x))
      : full
        ? String(x)
        : compact(x)
  let pointIndex = 0
  const focusProps = (label: string) => ({
    'data-point': true,
    tabIndex: pointIndex++ === 0 ? 0 : -1,
    role: 'img',
    'aria-label': label,
    onMouseEnter: () => setDetail(label),
    onFocus: () => setDetail(label),
    onKeyDown: (event: React.KeyboardEvent<SVGElement>) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const points = Array.from(event.currentTarget.ownerSVGElement!.querySelectorAll<SVGElement>('[data-point]'))
      const index = points.indexOf(event.currentTarget)
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? points.length - 1
            : Math.max(0, Math.min(points.length - 1, index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1)))
      points[next]?.focus()
    },
  })
  return (
    <div className={styles.visualization}>
      {node.props.title && <h4>{node.props.title}</h4>}
      <div className={styles.legend} aria-label={t('InteractiveUI.legend')}>
        {node.props.series.map((series) => (
          <YakitButton
            key={series.id}
            type="text2"
            aria-pressed={!hidden.includes(series.id)}
            onClick={() => {
              setDetail('')
              change({
                value: {
                  seriesOrder: [...order.current],
                  hiddenSeriesIds: hidden.includes(series.id)
                    ? hidden.filter((id) => id !== series.id)
                    : [...hidden, series.id],
                },
              })
            }}
          >
            <span className={styles.swatch} style={{ background: color(series.id) }} />
            {series.label}
          </YakitButton>
        ))}
        {unit && <span className={styles.secondary}>{unit}</span>}
      </div>
      {!values.length ? (
        <p role="status">{t('InteractiveUI.noChartData')}</p>
      ) : (
        <div className={styles.chartScroll}>
          <svg
            className={styles.chart}
            style={{ minWidth: width }}
            viewBox={`0 0 ${width} ${height}`}
            role="group"
            aria-label={node.props.title || t('InteractiveUI.chart')}
          >
            {ticks(min, max).map((tick, index) => (
              <g key={index} className={styles.chartAxis}>
                <line
                  x1={horizontal ? valueScale(tick) : left}
                  y1={horizontal ? top : valueScale(tick)}
                  x2={horizontal ? valueScale(tick) : right}
                  y2={horizontal ? bottom : valueScale(tick)}
                />
                <text
                  x={horizontal ? valueScale(tick) : left - 8}
                  y={horizontal ? bottom + 20 : valueScale(tick) + 4}
                  textAnchor={horizontal ? 'middle' : 'end'}
                >
                  {compact(tick)}
                </text>
              </g>
            ))}
            {bar ? (
              node.props.categories.map((category, categoryIndex) => {
                const band = (horizontal ? bottom - top : right - left) / node.props.categories.length
                const start = (horizontal ? top : left) + categoryIndex * band
                const labelLimit = horizontal ? 10 : Math.max(3, Math.floor(band / 12) - 1)
                const thickness = Math.max(2, (band - 10) / visible.length)
                return (
                  <g key={category.id}>
                    <text
                      className={styles.chartLabel}
                      x={horizontal ? left - 70 : start + band / 2}
                      y={horizontal ? start + band / 2 + 4 : bottom + 20}
                      textAnchor={horizontal ? 'end' : 'middle'}
                    >
                      <title>{category.label}</title>
                      {category.label.length > labelLimit
                        ? category.label.slice(0, labelLimit - 1) + '…'
                        : category.label}
                    </text>
                    {visible.map((series, seriesIndex) => {
                      const value = series.values[categoryIndex]
                      if (value === null) return null
                      const position = valueScale(value)
                      const zero = valueScale(0)
                      const center = start + 5 + thickness * seriesIndex
                      const label = `${category.label} · ${series.label}: ${value} ${unit}`
                      return (
                        <g key={series.id}>
                          <rect
                            {...focusProps(label)}
                            x={horizontal ? Math.min(zero, position) : center}
                            y={horizontal ? center : Math.min(zero, position)}
                            width={horizontal ? Math.max(1, Math.abs(position - zero)) : thickness - 2}
                            height={horizontal ? thickness - 2 : Math.max(1, Math.abs(position - zero))}
                            fill={color(series.id)}
                            rx={2}
                          >
                            <title>{label}</title>
                          </rect>
                          <text
                            className={styles.chartLabel}
                            x={horizontal ? position + (value < 0 ? -4 : 4) : center + (thickness - 2) / 2}
                            y={horizontal ? center + thickness / 2 + 4 : position + (value < 0 ? 14 : -4)}
                            textAnchor={horizontal ? (value < 0 ? 'end' : 'start') : 'middle'}
                          >
                            {compact(value)}
                          </text>
                        </g>
                      )
                    })}
                  </g>
                )
              })
            ) : (
              <>
                {ticks(xMin, xMax).map((tick, index) => (
                  <text key={index} className={styles.chartLabel} x={xScale(tick)} y={bottom + 20} textAnchor="middle">
                    {formatX(tick)}
                  </text>
                ))}
                {visible.map((series, index) => {
                  let connected = false
                  const path = series.points
                    .map((point) => {
                      if (point.y === null) {
                        connected = false
                        return ''
                      }
                      const command = connected ? 'L' : 'M'
                      connected = true
                      return `${command}${xScale(point.x)},${valueScale(point.y)}`
                    })
                    .join(' ')
                  return (
                    <g key={series.id}>
                      <path
                        d={path}
                        fill="none"
                        stroke={color(series.id)}
                        strokeWidth={2}
                        strokeDasharray={index ? `${8 - index} ${index + 2}` : undefined}
                      />
                      {series.points
                        .filter((point) => point.y !== null)
                        .map((point) => {
                          const label = `${formatX(point.x, true)} · ${series.label}: ${point.y} ${unit}`
                          return (
                            <circle
                              key={point.x}
                              {...focusProps(label)}
                              cx={xScale(point.x)}
                              cy={valueScale(point.y)}
                              r={4}
                              fill={color(series.id)}
                            >
                              <title>{label}</title>
                            </circle>
                          )
                        })}
                    </g>
                  )
                })}
                <text className={styles.chartLabel} x={(left + right) / 2} y={height - 4} textAnchor="middle">
                  {node.props.xLabel}
                </text>
              </>
            )}
          </svg>
        </div>
      )}
      <div className={styles.chartDetail} role="status" aria-live="polite">
        {detail || t('InteractiveUI.chartHint')}
      </div>
      <details className={styles.chartData}>
        <summary>{t('InteractiveUI.viewChartData')}</summary>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{node.props.xLabel || t('InteractiveUI.category')}</th>
              {node.props.series.map((series) => (
                <th key={series.id}>
                  {series.label}
                  {unit && ` (${unit})`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bar
              ? node.props.categories.map((category, index) => (
                  <tr key={category.id}>
                    <th>{category.label}</th>
                    {node.props.series.map((series) => (
                      <td key={series.id}>{series.values[index] ?? '—'}</td>
                    ))}
                  </tr>
                ))
              : [...new Set<number>(node.props.series.flatMap((series) => series.points.map((point) => point.x)))]
                  .sort((a, b) => a - b)
                  .map((x) => (
                    <tr key={x}>
                      <th>{formatX(x, true)}</th>
                      {node.props.series.map((series) => (
                        <td key={series.id}>{series.points.find((point) => point.x === x)?.y ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
