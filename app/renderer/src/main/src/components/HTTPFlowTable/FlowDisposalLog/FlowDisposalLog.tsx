import type React from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import { useMemoizedFn, useUpdateEffect } from 'ahooks'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useEmptyImage } from '@/hook/useResultEmpty/SearchEmpty'
import Login from '@/pages/Login'
import { useStore } from '@/store'
import { PluginImageTextarea } from '@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea'
import type {
  ImageTextareaData,
  PluginImageTextareaRefProps,
} from '@/pages/pluginEditor/pluginImageTextarea/PluginImageTextareaType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { mergeDisposalLogs } from '@/utils/disposalLog'
import { uploadDisposalAttachment } from '@/utils/disposalAttachment'
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
  const { userInfo } = useStore()
  const powerEmptyImage = useEmptyImage('power')
  const [loginShow, setLoginShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [list, setList] = useState<FlowDisposalLogItem[]>([])
  const [refreshFlag, setRefreshFlag] = useState(false)
  const [quotation, setQuotation] = useState<QuotationInfoProps>()
  const submissionVersionRef = useRef(0)
  const composerRef = useRef<PluginImageTextareaRefProps>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(0)
  const requestIdRef = useRef(0)
  const hasMoreRef = useRef(true)
  const fetchingRef = useRef(false)

  const flowId = Number(flow.Id) || 0
  const flowHash = flow.Hash || ''
  const companyName = userInfo.companyName || ''

  const fetchList = useMemoizedFn((reset = false) => {
    if (!isLogin || !flowHash || (!reset && fetchingRef.current)) return
    if (!reset && !hasMoreRef.current) return
    const requestId = ++requestIdRef.current
    const page = reset ? 1 : pageRef.current + 1
    fetchingRef.current = true
    if (reset) {
      setLoading(true)
      pageRef.current = 0
      hasMoreRef.current = true
    }
    apiGetFlowDisposalLogs({
      flow_id: flowId || undefined,
      hash: flowHash || undefined,
      page,
      limit: 20,
    })
      .then((res) => {
        if (requestId !== requestIdRef.current) return
        const data = (res.data || []).map((item) => ({
          ...item,
          isMine: !!companyName && item.logType === 'comment' && item.userName === companyName,
        }))
        pageRef.current = page
        hasMoreRef.current =
          data.length > 0 && (typeof res.total === 'number' ? page * 20 < res.total : data.length === 20)
        setList((prev) => mergeDisposalLogs(reset ? [] : prev, data))
        if (reset && listRef.current) listRef.current.scrollTop = 0
      })
      .catch(() => {
        if (requestId === requestIdRef.current && reset) setList([])
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return
        fetchingRef.current = false
        setLoading(false)
      })
  })

  useEffect(() => {
    if (!isLogin || !flowHash) {
      requestIdRef.current += 1
      fetchingRef.current = false
      pageRef.current = 0
      hasMoreRef.current = true
      setList([])
      setLoading(false)
    } else {
      fetchList(true)
    }

    return () => {
      requestIdRef.current += 1
      fetchingRef.current = false
    }
  }, [flowId, flowHash, refreshFlag, isLogin])

  useUpdateEffect(() => {
    if (!isLogin) return
    fetchList(true)
  }, [refreshKey])

  useEffect(
    () => () => {
      submissionVersionRef.current += 1
    },
    [],
  )

  useUpdateEffect(() => {
    submissionVersionRef.current += 1
    setSubmitting(false)
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
      files: parsed?.files || [],
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
    const version = submissionVersionRef.current
    setSubmitting(true)
    apiPublishFlowDisposalComment({
      flow_id: flowId || undefined,
      hash: flowHash || undefined,
      description,
      logId: quotation?.logId,
    })
      .then(() => {
        if (version !== submissionVersionRef.current) return
        composerRef.current?.onClear()
        setQuotation(undefined)
        setRefreshFlag((v) => !v)
      })
      .catch(() => {})
      .finally(() => {
        if (version === submissionVersionRef.current) setSubmitting(false)
      })
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
      <div className={styles['flow-disposal-log-body']} ref={listRef} onScroll={onScroll}>
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
          key={flowHash}
          ref={composerRef}
          loading={submitting}
          quotation={quotation}
          delQuotation={() => setQuotation(undefined)}
          onUploadImage={(req) => apiUploadFlowDisposalImage({ ...req, hash: flowHash })}
          onUploadFile={(path) => uploadDisposalAttachment({ path, hash: flowHash, type: 'HttpflowComment' })}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  )
})
