import { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useStore } from '@/store'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { failed, yakitNotify } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import emiter from '@/utils/eventBus/eventBus'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '../yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { apiHTTPFlowsFromOnline, apiRisksFromOnline, type WebMessageSyncType } from './utils'

export const WebMessageSyncButton = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { t } = useI18nNamespaces(['components'])
  const { userInfo } = useStore()
  const [syncPercent, setSyncPercent] = useState<number>()
  const cleanupRef = useRef<(() => void) | undefined>(undefined)

  const clearSync = useMemoizedFn(() => {
    cleanupRef.current?.()
    cleanupRef.current = undefined
    setSyncPercent(undefined)
  })

  useEffect(() => () => cleanupRef.current?.(), [])

  const onSyncData = useMemoizedFn((type: WebMessageSyncType) => {
    if (cleanupRef.current) return
    if (!userInfo.isLogin || !userInfo.token) {
      yakitNotify('error', t('MessageCenter.syncFailed'))
      return
    }
    setSyncPercent(0)
    let syncMessage = ''
    const startApi = type === 'flow' ? apiHTTPFlowsFromOnline : apiRisksFromOnline
    cleanupRef.current = startApi(userInfo.token, randomString(40), {
      onProgress: (percent, log) => {
        setSyncPercent(Math.floor(percent))
        if (log?.trim()) syncMessage = log.trim()
      },
      onError: (err) => {
        clearSync()
        failed(`${err}`)
        yakitNotify('error', t('MessageCenter.syncFailed'))
      },
      onEnd: () => {
        clearSync()
        yakitNotify('success', syncMessage || t('MessageCenter.syncSuccess'))
        if (type === 'flow') emiter.emit('onRefreshQueryHTTPFlows', JSON.stringify({ action: 'sync-complete' }))
        if (type === 'risk') emiter.emit('onRefRiskList')
        onSuccess?.()
        emiter.emit('onRefreshMessageUnread', 'web')
      },
    })
  })

  const syncing = syncPercent !== undefined

  return (
    <YakitDropdownMenu
      menu={{
        data: [
          { key: 'flow', label: t('MessageCenter.updateFlow') },
          { key: 'risk', label: t('MessageCenter.updateRisk') },
        ],
        onClick: ({ key }) => {
          if (key === 'flow' || key === 'risk') onSyncData(key)
        },
      }}
      dropdown={{ trigger: ['click'], placement: 'bottomRight', disabled: syncing }}
    >
      <YakitButton type="text" loading={syncing}>
        {t('MessageCenter.updateData')}
        {syncing ? ` ${syncPercent}%` : <ChevronDownOutlined />}
      </YakitButton>
    </YakitDropdownMenu>
  )
}
