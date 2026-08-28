import React, { useState } from 'react'
import type { AIMemoryContentProps, AIMemoryEchartsProps, AIMemoryScoreEchartsProps } from './type'
import { useCreation, useDebounceFn, useUpdateEffect } from 'ahooks'
import styles from './AIMemoryList.module.scss'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import ReactECharts, { type EChartsOption } from 'echarts-for-react'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const getScoreList = (data: AIAgentGrpcApi.MemoryEntry) => {
  return [
    {
      label: 'C',
      value: data.c_score,
    },
    {
      label: 'O',
      value: data.o_score,
    },
    {
      label: 'R',
      value: data.r_score,
    },
    {
      label: 'E',
      value: data.e_score,
    },
    {
      label: 'P',
      value: data.p_score,
    },
    {
      label: 'A',
      value: data.a_score,
    },
    {
      label: 'T',
      value: data.t_score,
    },
  ]
}

export const AIMemoryContent: React.FC<AIMemoryContentProps> = React.memo((props) => {
  const { item } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  const echartsData = useCreation(() => {
    return {
      xData: [],
      yData: [item.c_score, item.o_score, item.r_score, item.e_score, item.p_score, item.a_score, item.t_score],
    }
  }, [item.c_score, item.o_score, item.r_score, item.e_score, item.p_score, item.a_score, item.t_score])
  return (
    <div className={styles['memory-popover-content']}>
      <div className={styles['memory-popover-heard']}>
        {item?.memory_id && <div className={styles['heard-text']}>{item.memory_id}</div>}
        <div className={styles['heard-content']}>{item.content}</div>
      </div>
      <div className={styles['memory-popover-score-wrapper']}>
        <div className={styles['title']}>{t('AIMemoryList.scoreTitle')}</div>
        <div className={styles['score-list']}>
          {getScoreList(item).map((score, index) => (
            <div
              className={classNames(styles['score-item'], {
                [styles['score-item-height-color']]: score.value >= 0.7,
              })}
              key={score.label}
            >
              <span>
                {score.label}={score.value}
              </span>
              {index !== item.core_pact_vector.length - 1 && <div className={styles['divider']} />}
            </div>
          ))}
        </div>
        <div className={styles['memory-popover-score-echarts']}>
          <AIMemoryScoreEcharts data={echartsData} style={{ width: '100%', height: 220 }} />
        </div>
      </div>
      <div className={styles['memory-popover-tags-wrapper']}>
        <div className={styles['title']}>Tags</div>
        <div className={styles['memory-popover-tags-list']}>
          {item.tags.map((tag) => (
            <YakitTag key={tag} fullRadius={true} border={false} className={styles['tag-item']}>
              {tag}
            </YakitTag>
          ))}
        </div>
      </div>
      <div className={styles['memory-popover-potential-questions']}>
        <div className={styles['title']}>Potential Questions</div>
        {item.potential_questions.map((ele) => (
          <div className={styles['potential-questions-item']} key={ele} title={ele}>
            <span className={styles['label']}>{ele}</span>
          </div>
        ))}
      </div>
    </div>
  )
})
const getScoreOption = (value: AIMemoryEchartsProps['data']): EChartsOption => {
  const option: EChartsOption = {
    grid: {
      top: 4, // 上边距
      right: 0, // 右边距
      bottom: 4, // 下边距
      left: 0, // 左边距
    },

    color: ['#f28c45'],
    radar: {
      radius: '70%',
      indicator: [
        { name: 'C (关联度)', max: 1 },
        { name: 'O (来源可靠性)', max: 1 },
        { name: 'R (重要性)', max: 1 },
        { name: 'E (情感基调)', max: 1 },
        { name: 'P (个人偏好)', max: 1 },
        { name: 'A (经验价值)', max: 1 },
        { name: 'T (实效性)', max: 1 },
      ],
      axisName: {
        color: '#5A5D64',
        fontSize: 11,
        width: 40,
        height: 16,
        overflow: 'breakAll',
      },
      splitLine: {
        lineStyle: {
          width: 1,
          color: ['#C0C6D1', '#EEF0F3', '#EEF0F3', '#EEF0F3', '#EEF0F3', '#EEF0F3'].reverse(),
        },
      },
      axisLine: {
        lineStyle: {
          color: '#E6E8ED',
        },
      },
      splitArea: {
        show: false,
      },
    },
    tooltip: {
      trigger: 'axis',
    },
    series: [
      {
        tooltip: {
          trigger: 'item',
        },
        type: 'radar',
        data: [
          {
            value: value.yData,
            name: 'C.O.R.E. P.A.C.T. Scores',
          },
        ],
        lineStyle: {
          width: 1,
        },

        symbol: 'circle',
        symbolSize: 5,
        areaStyle: {
          opacity: 0.1,
        },
        animation: false,
      },
    ],
  }

  return option
}
const AIMemoryScoreEcharts: React.FC<AIMemoryScoreEchartsProps> = React.memo((props) => {
  const { data, ...rest } = props
  const [option, setOption] = useState<EChartsOption>(getScoreOption(data))
  useUpdateEffect(() => {
    onSetOption()
  }, [data])
  const onSetOption = useDebounceFn(
    () => {
      const newOption = getScoreOption(data)
      setOption(newOption)
    },
    { wait: 500, leading: true },
  ).run
  return <ReactECharts {...rest} option={option} />
})
