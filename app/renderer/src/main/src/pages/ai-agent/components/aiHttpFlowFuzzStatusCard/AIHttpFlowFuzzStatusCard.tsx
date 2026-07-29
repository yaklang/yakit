import React, { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import type { AIHttpFlowFuzzStatusCardProps } from './type'
import styles from './AIHttpFlowFuzzStatusCard.module.scss'
import { Tooltip } from 'antd'
import YakitSolidLoading from '@/components/yakitUI/YakitSolidLoading/YakitSolidLoading'
import ChatCard from '../ChatCard'
import ModalInfo, { type ModalInfoProps } from '../ModelInfo'
import useChatIPCDispatcher from '@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher'
import { WebFuzzerAiStore } from '@/pages/ai-agent/store/ChatDataStore'
import {
  hasWebFuzzerPageOnAIFuzzStatus,
  pushAIFuzzStatusRuntimeIdToWebFuzzerPage,
} from '@/pages/fuzzer/webFuzzerAiRequestApplyBridge'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { yakitNotify } from '@/utils/notification'

const STATS_TILE_PX = 91
const STATS_GAP_PX = 4

const STATS_ROW_4_MIN_INNER_PX = 4 * STATS_TILE_PX + 3 * STATS_GAP_PX

export const AIHttpFlowFuzzStatusCard: React.FC<AIHttpFlowFuzzStatusCardProps> = memo((props) => {
  const { item } = props
  const { data, Timestamp, AIService, AIModelName } = item
  const { t } = useI18nNamespaces(['aiAgent'])

  const modalInfo = useMemo<ModalInfoProps>(
    () => ({
      time: Timestamp,
      title: AIModelName,
      icon: AIService,
    }),
    [Timestamp, AIModelName, AIService],
  )

  const p = data.progress
  const total = p?.total_requests ?? 0
  const ok = p?.successful_responses ?? 0
  const fail = p?.failed_requests ?? 0
  const avgMs = p?.average_response_ms

  const { chatIPCEvents } = useChatIPCDispatcher()

  // 「查看详情」点击：
  // - 若卡片所在的会话绑定了某个 Web Fuzzer 页签（`WebFuzzerAiStore`），
  //   则把本卡片的 `runtime_id` 显式推送到该页签，并打开 traffic analysis 抽屉。
  // - 否则回退到全局打开「流量分析」路由页，并通过 `pageInfo` 携带本卡片的 `runtime_id`。
  const handleViewDetail = useMemoizedFn(() => {
    const runtimeId = data?.runtime_id
    if (!runtimeId) {
      yakitNotify('error', '该发包统计缺少 runtime_id，无法查看详情')
      return
    }
    const store = chatIPCEvents.fetchChatDataStore()
    const fuzzerPageId = store instanceof WebFuzzerAiStore ? store.fuzzerPageId : ''
    if (fuzzerPageId && hasWebFuzzerPageOnAIFuzzStatus(fuzzerPageId)) {
      // Web Fuzzer 页内：直接把本卡片的 runtime_id 推过去；
      // 当右侧无本地发包响应时空状态会切换为 history 表，已可见的 history 表则会按新 key 重新加载。
      pushAIFuzzStatusRuntimeIdToWebFuzzerPage(fuzzerPageId, runtimeId, { source: 'manual' })
      return
    }
    emiter.emit(
      'openPage',
      JSON.stringify({
        route: YakitRoute.DB_HTTPHistoryAnalysis,
        params: {
          webFuzzer: true,
          runtimeId: [runtimeId],
          sourceType: 'scan',
          verbose: data?.reason ?? t('AIHttpFlowFuzzStatusCard.detailTitle'),
        },
      }),
    )
  })

  const statsRef = useRef<HTMLDivElement>(null)
  const [statsCompact, setStatsCompact] = useState(false)

  useLayoutEffect(() => {
    const el = statsRef.current
    if (!el) return
    const apply = (contentInnerWidth: number) => {
      setStatsCompact(contentInnerWidth < STATS_ROW_4_MIN_INNER_PX)
    }
    const readFromDom = () => {
      const cs = getComputedStyle(el)
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
      apply(el.clientWidth - padX)
    }
    readFromDom()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width
      if (w != null) apply(w)
      else readFromDom()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <ChatCard
      className={styles['fuzz-stats-chat-card']}
      titleText={<div className={styles['title-wrapper']}>{t('AIHttpFlowFuzzStatusCard.title')}</div>}
      titleExtra={<ModalInfo {...modalInfo} />}
    >
      <div className={styles['reason-container']}>
        <div className={styles['reason-row']}>
          {data?.engine_status === 'working' && (
            <span className={styles.sparkle}>
              <YakitSolidLoading />
            </span>
          )}
          <Tooltip title={data?.reason ?? t('AIHttpFlowFuzzStatusCard.title')}>
            <div className={styles['reason-text']}>{data?.reason ?? t('AIHttpFlowFuzzStatusCard.title')}</div>
          </Tooltip>
          <YakitButton type="text" className={styles['view-detail-btn']} onClick={handleViewDetail}>
            {t('AIHttpFlowFuzzStatusCard.viewDetail')}
          </YakitButton>
        </div>

        <div ref={statsRef} className={classNames(styles.stats, statsCompact && styles['stats--compact'])}>
          <div className={classNames(styles['stat-tile'], styles['stat-tile-total'])}>
            <div className={classNames(styles['stat-value'], styles['total'])}>{total}</div>
            <div className={styles['stat-label']}>{t('AIHttpFlowFuzzStatusCard.sentTotal')}</div>
          </div>

          <div className={classNames(styles['stat-tile'], styles['stat-tile-ok'])}>
            <div className={classNames(styles['stat-value'], styles['ok'])}>{ok}</div>
            <div className={styles['stat-label']}>{t('AIHttpFlowFuzzStatusCard.successCount')}</div>
          </div>

          <div className={classNames(styles['stat-tile'], styles['stat-tile-fail'])}>
            <div className={classNames(styles['stat-value'], styles['fail'])}>{fail}</div>
            <div className={styles['stat-label']}>{t('AIHttpFlowFuzzStatusCard.failCount')}</div>
          </div>

          <div className={classNames(styles['stat-tile'], styles['stat-tile-avg'])}>
            <div className={classNames(styles['stat-value'], styles['avg'])}>{avgMs ? `${avgMs}ms` : '-'}</div>
            <div className={styles['stat-label']}>{t('AIHttpFlowFuzzStatusCard.avgMs')}</div>
          </div>
        </div>
      </div>
    </ChatCard>
  )
})

AIHttpFlowFuzzStatusCard.displayName = 'AIHttpFlowFuzzStatusCard'
