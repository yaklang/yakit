import type React from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import { useMemoizedFn, useUpdateEffect } from 'ahooks'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useEmptyImage } from '@/hook/useResultEmpty/SearchEmpty'
import Login from '@/pages/Login'
import type { Risk } from '../../schema'
import { PluginImageTextarea } from '@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea'
import type {
  ImageTextareaData,
  PluginImageTextareaRefProps,
} from '@/pages/pluginEditor/pluginImageTextarea/PluginImageTextareaType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { RiskDisposalLogItem } from './RiskDisposalLogItem'
import { disposalCommentConvertToJSON, disposalCommentJSONConvertToData } from './convert'
import { apiDeleteDisposalComment, apiGetDisposalLogs, apiPublishDisposalComment, apiUploadDisposalImage } from './utils'
import type { DisposalLogItem, QuotationInfoProps } from './types'
import styles from './RiskDisposalLog.module.scss'

export interface RiskDisposalLogProps {
  info: Risk
  isLogin: boolean
}

export const RiskDisposalLog: React.FC<RiskDisposalLogProps> = memo((props) => {
  const { info, isLogin } = props
  const { t } = useI18nNamespaces(['risk', 'yakitUi'])
  const powerEmptyImage = useEmptyImage('power')
  const [loginShow, setLoginShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [list, setList] = useState<DisposalLogItem[]>([])
  const [refreshFlag, setRefreshFlag] = useState(false)
  const [quotation, setQuotation] = useState<QuotationInfoProps>()
  const composerRef = useRef<PluginImageTextareaRefProps>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const beforeIdRef = useRef<number | undefined>(undefined)
  const hasMoreRef = useRef(true)
  const fetchingRef = useRef(false)

  const riskHash = info.Hash || ''

  const fetchList = useMemoizedFn((reset = false) => {
    if (!isLogin || !riskHash || fetchingRef.current) return
    if (!reset && !hasMoreRef.current) return
    fetchingRef.current = true
    if (reset) {
      setLoading(true)
      beforeIdRef.current = undefined
      hasMoreRef.current = true
    }
    apiGetDisposalLogs({
      risk_hash: riskHash,
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
  }, [riskHash, refreshFlag, isLogin])

  useUpdateEffect(() => {
    setQuotation(undefined)
    composerRef.current?.onClear()
  }, [riskHash])

  const onScroll = useMemoizedFn((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (target.scrollTop + target.clientHeight + 40 >= target.scrollHeight) {
      fetchList(false)
    }
  })

  const onReply = useMemoizedFn((item: DisposalLogItem) => {
    const parsed = disposalCommentJSONConvertToData(item.description)
    setQuotation({
      userName: item.userName || '-',
      content: parsed?.text || '',
      imgs: parsed?.imgs || [],
      logId: item.id,
    })
  })

  const onDelete = useMemoizedFn((item: DisposalLogItem) => {
    apiDeleteDisposalComment(item.id).then(() => {
      setList((prev) => prev.filter((ele) => ele.id !== item.id))
    })
  })

  const onSubmit = useMemoizedFn((data: ImageTextareaData) => {
    const description = disposalCommentConvertToJSON(data)
    if (!description) return
    setSubmitting(true)
    apiPublishDisposalComment({
      risk_hash: riskHash,
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
      <div className={styles['risk-disposal-log']}>
        <div className={styles['risk-disposal-log-login-empty']}>
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
    <div className={styles['risk-disposal-log']}>
      <div className={styles['risk-disposal-log-body']} ref={listRef} onScroll={onScroll}>
        <YakitSpin spinning={loading}>
          {list.length === 0 && !loading ? (
            <div className={styles['risk-disposal-log-empty']}>{t('RiskDisposalLog.empty')}</div>
          ) : (
            list.map((item, index) => (
              <RiskDisposalLogItem
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

      <div className={styles['risk-disposal-log-footer']}>
        <PluginImageTextarea
          ref={composerRef}
          loading={submitting}
          quotation={quotation}
          delQuotation={() => setQuotation(undefined)}
          onUploadImage={apiUploadDisposalImage}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  )
})
