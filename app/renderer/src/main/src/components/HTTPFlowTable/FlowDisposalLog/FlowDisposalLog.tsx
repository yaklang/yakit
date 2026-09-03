import type React from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import { useMemoizedFn, useUpdateEffect } from 'ahooks'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useEmptyImage } from '@/hook/useResultEmpty/SearchEmpty'
import Login from '@/pages/Login'
import { PluginImageTextarea } from '@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea'
import type {
  ImageTextareaData,
  PluginImageTextareaRefProps,
} from '@/pages/pluginEditor/pluginImageTextarea/PluginImageTextareaType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { HTTPFlow } from '../HTTPFlowTable.constants'
import { FlowDisposalLogItemView } from './FlowDisposalLogItem'
import { disposalCommentConvertToJSON, disposalCommentJSONConvertToData } from './convert'
import {
  apiDeleteFlowDisposalComment,
  apiGetFlowDisposalLogs,
  apiPublishFlowDisposalComment,
  apiUploadFlowDisposalImage,
} from './utils'
import type { FlowDisposalLogItem, QuotationInfoProps } from './types'
import styles from './FlowDisposalLog.module.scss'

export interface FlowDisposalLogProps {
  flow: HTTPFlow
  isLogin: boolean
  /** 外部触发刷新（如标记修改成功） */
  refreshKey?: number
}

export const FlowDisposalLog: React.FC<FlowDisposalLogProps> = memo((props) => {
  const { flow, isLogin, refreshKey } = props
  const { t } = useI18nNamespaces(['history', 'yakitUi', 'risk'])
  const powerEmptyImage = useEmptyImage('power')
  const [loginShow, setLoginShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [list, setList] = useState<FlowDisposalLogItem[]>([])
  const [refreshFlag, setRefreshFlag] = useState(false)
  const [quotation, setQuotation] = useState<QuotationInfoProps>()
  const composerRef = useRef<PluginImageTextareaRefProps>(null)
  const beforeIdRef = useRef<number | undefined>(undefined)
  const hasMoreRef = useRef(true)
  const fetchingRef = useRef(false)

  const flowId = Number(flow.Id) || 0
  const flowHash = flow.Hash || ''

  const fetchList = useMemoizedFn((reset = false) => {
    if (!isLogin || (!flowId && !flowHash) || fetchingRef.current) return
    if (!reset && !hasMoreRef.current) return
    fetchingRef.current = true
    if (reset) {
      setLoading(true)
      beforeIdRef.current = undefined
      hasMoreRef.current = true
    }
    apiGetFlowDisposalLogs({
      flow_id: flowId || undefined,
      hash: flowHash || undefined,
      beforeId: reset ? undefined : beforeIdRef.current,
      limit: 20,
    })
      .then((res) => {
        const data = res.data || []
        if (data.length > 0) {
          beforeIdRef.current = data[data.length - 1].id
        }
        if (data.length < 20) hasMoreRef.current = false
        setList((prev) => (reset ? data : [...prev, ...data]))
      })
      .catch(() => {
        if (reset) setList([])
      })
      .finally(() => {
        fetchingRef.current = false
        setLoading(false)
      })
  })

  useEffect(() => {
    if (!isLogin) {
      setList([])
      setLoading(false)
      return
    }
    fetchList(true)
  }, [flowId, flowHash, refreshFlag, isLogin])

  useUpdateEffect(() => {
    if (!isLogin) return
    fetchList(true)
  }, [refreshKey])

  useUpdateEffect(() => {
    setQuotation(undefined)
    composerRef.current?.onClear()
  }, [flowId, flowHash])

  const onScroll = useMemoizedFn((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (target.scrollTop + target.clientHeight + 40 >= target.scrollHeight) {
      fetchList(false)
    }
  })

  const onReply = useMemoizedFn((item: FlowDisposalLogItem) => {
    const parsed = disposalCommentJSONConvertToData(item.description)
    setQuotation({
      userName: item.userName || '-',
      content: parsed?.text || '',
      imgs: parsed?.imgs || [],
      logId: item.id,
    })
  })

  const onDelete = useMemoizedFn((item: FlowDisposalLogItem) => {
    apiDeleteFlowDisposalComment(item.id).then(() => {
      setList((prev) => prev.filter((ele) => ele.id !== item.id))
    })
  })

  const onSubmit = useMemoizedFn((data: ImageTextareaData) => {
    const description = disposalCommentConvertToJSON(data)
    if (!description) return
    setSubmitting(true)
    apiPublishFlowDisposalComment({
      flow_id: flowId || undefined,
      hash: flowHash || undefined,
      description,
      logId: quotation?.logId,
    })
      .then(() => {
        composerRef.current?.onClear()
        setQuotation(undefined)
        setRefreshFlag((v) => !v)
      })
      .finally(() => setSubmitting(false))
  })

  if (!isLogin) {
    return (
      <div className={styles['flow-disposal-log']}>
        <div className={styles['flow-disposal-log-login-empty']}>
          <YakitEmpty
            image={<img src={powerEmptyImage} alt="" />}
            imageStyle={{ width: 320, height: 250, marginBottom: 16 }}
            title={t('RiskDisposalLog.no_access_title')}
            description={t('RiskDisposalLog.no_access_desc')}
          />
          <YakitButton type="outline1" onClick={() => setLoginShow(true)}>
            {t('YakitButton.loginNow')}
          </YakitButton>
        </div>
        {loginShow && <Login visible={loginShow} onCancel={() => setLoginShow(false)} />}
      </div>
    )
  }

  return (
    <div className={styles['flow-disposal-log']}>
      <div className={styles['flow-disposal-log-body']} onScroll={onScroll}>
        <YakitSpin spinning={loading}>
          {list.length === 0 && !loading ? (
            <div className={styles['flow-disposal-log-empty']}>{t('HTTPFlowDetailMini.logEmpty')}</div>
          ) : (
            list.map((item, index) => (
              <FlowDisposalLogItemView
                key={item.id}
                info={item}
                hiddenLine={index === list.length - 1}
                onReply={onReply}
                onDelete={onDelete}
              />
            ))
          )}
        </YakitSpin>
      </div>

      <div className={styles['flow-disposal-log-footer']}>
        <PluginImageTextarea
          ref={composerRef}
          loading={submitting}
          quotation={quotation}
          delQuotation={() => setQuotation(undefined)}
          onUploadImage={apiUploadFlowDisposalImage}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  )
})
