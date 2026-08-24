import React from 'react'
import { Descriptions } from 'antd'
import classNames from 'classnames'
import { cloneDeep } from 'lodash'
import { YakitCopyText } from '@/components/yakitUI/YakitCopyText/YakitCopyText'
import type {
  ExtractionResultsContentProps,
  FilterEmptySubMatcherFunctionProps,
  HTTPResponseMatcher,
  labelNodeItemProps,
} from './MatcherAndExtractionCardType'
import styles from './MatcherAndExtraction.module.scss'
import i18n from '@/i18n/i18n'

export const onFilterEmptySubMatcher = (param: FilterEmptySubMatcherFunctionProps) => {
  const { matchers, index, subIndex } = param
  const matchersCopy = cloneDeep(matchers)
  const newMatchers: HTTPResponseMatcher[] = []
  matchersCopy.forEach((m, n) => {
    if (n === index) {
      m.SubMatchers = m.SubMatchers.filter((_, s) => s !== subIndex)
    }
    if (m.SubMatchers.length > 0) {
      newMatchers.push(m)
    }
  })
  return newMatchers
}

export const LabelNodeItem: React.FC<labelNodeItemProps> = React.memo((props) => {
  const { column } = props
  return (
    <div
      className={classNames(
        styles['label-node'],
        {
          [styles['label-node-column']]: column,
        },
        props.className,
      )}
    >
      <span
        className={classNames(styles['label'], props.labelClassName)}
        style={{ width: i18n.language.startsWith('zh') ? 104 : 130 }}
      >
        {props.label}
      </span>
      {props.children}
    </div>
  )
})

export const ExtractionResultsContent: React.FC<ExtractionResultsContentProps> = React.memo((props) => {
  const { list = [] } = props
  return (
    <div className={classNames(styles['extract-results'], 'yakit-descriptions')}>
      <Descriptions bordered size="small" column={2}>
        {list.map((item) => (
          <Descriptions.Item label={<YakitCopyText showText={item.Key} />} key={`${item.Key}-${item.Value}`} span={2}>
            {item.Value ? <YakitCopyText showText={item.Value} /> : ''}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </div>
  )
})
