import type React from 'react'
import type { ReportItem } from './schema'
import { SafeMarkdown } from './markdownRender'
import { YakEditor } from '../../../utils/editors'
import { AutoCard } from '../../../components/AutoCard'
import { Tag } from 'antd'
import { FoldTable, JSONTableRender, ReportMergeTable, RiskTable } from './jsonTableRender'
import { PieGraph } from '../../graph/PieGraph'
import { BarGraph } from '../../graph/BarGraph'
import { EchartsCard, HollowPie, MultiPie, NightingleRose, StackedVerticalBar, VerticalOptionBar } from './EchartsInit'
import { FoldHoleCard, FoldRuleCard } from './ReportExtendCard'

export interface ReportItemRenderProp {
  item: ReportItem
}

const tryParseJSON = (raw: string) => {
  try {
    return { ok: true as const, value: JSON.parse(raw) }
  } catch (error) {
    return { ok: false as const, error }
  }
}

export const ReportItemRender: React.FC<ReportItemRenderProp> = (props) => {
  const { type, content } = props.item
  const fallback = (
    <AutoCard style={{ width: '100%' }} size={'small'} extra={<Tag color={'red'}>{props.item.type}</Tag>}>
      <div style={{ height: 300 }}>
        <YakEditor value={props.item.content} />
      </div>
    </AutoCard>
  )
  const graphFallback = (
    <div style={{ height: 300 }}>
      <YakEditor value={props.item.content} />
    </div>
  )

  switch (type) {
    case 'markdown':
      return <SafeMarkdown source={props.item.content} />
    case 'json-table':
      return <JSONTableRender item={props.item} />
    case 'pie-graph': {
      const parsed = tryParseJSON(props.item.content)
      if (!parsed.ok) {
        console.info('渲染图失败')
        console.info(parsed.error)
        return graphFallback
      }
      return <PieGraph type={'pie'} height={300} data={parsed.value as { key: string; value: number }[]} />
    }
    case 'bar-graph': {
      const parsed = tryParseJSON(props.item.content)
      if (!parsed.ok) {
        console.info('渲染图失败')
        console.info(parsed.error)
        return graphFallback
      }
      return (
        <BarGraph
          type={'bar'}
          width={450}
          direction={props.item?.direction}
          data={parsed.value as { key: string; value: number }[]}
        />
      )
    }
    case 'raw': {
      const parsed = tryParseJSON(content)
      if (!parsed.ok) {
        return fallback
      }
      const newData = parsed.value

      if (newData.type === 'report-cover') {
        return <div style={{ height: 0 }}></div>
      }
      if (newData.type === 'bar-graph') {
        const color = newData?.color
        const name = (newData?.data || []).map((item) => item.name)
        const value = (newData?.data || []).map((item) => item.value)
        const title = newData?.title
        return <VerticalOptionBar content={{ name, value, color, title }} />
      }
      if (newData.type === 'pie-graph') {
        return <HollowPie data={newData.data} title={newData.title} />
      }
      if (newData.type === 'fix-list') {
        return <FoldHoleCard data={newData.data} />
      }
      if (newData.type === 'info-risk-list') {
        return <FoldTable data={newData} />
      }

      let inner = newData
      if (typeof newData === 'string') {
        const nested = tryParseJSON(newData)
        if (!nested.ok) {
          return fallback
        }
        inner = nested.value
      }
      const { type: innerType, data } = inner
      if (innerType) {
        switch (innerType) {
          case 'multi-pie':
            return <MultiPie content={inner} />
          case 'nightingle-rose':
            return <NightingleRose content={inner} />
          case 'general':
            return <VerticalOptionBar content={inner} />
          case 'year-cve':
            return <StackedVerticalBar content={inner} />
          case 'card': {
            const dataTitle = inner?.name_verbose || inner?.name || ''
            return <EchartsCard dataTitle={dataTitle} dataSource={data} />
          }
          case 'fix-array-list':
            return <FoldRuleCard content={inner} />
          case 'risk-list':
            return <RiskTable data={inner} />
          case 'potential-risks-list':
            return <RiskTable data={inner} />
          case 'search-json-table':
            return <ReportMergeTable data={inner} />
          default:
            return fallback
        }
      }
      return null
    }
    default:
      return fallback
  }
}
