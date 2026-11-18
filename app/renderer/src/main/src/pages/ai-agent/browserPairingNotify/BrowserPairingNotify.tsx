import type React from 'react'
import { useEffect } from 'react'
import { useMemoizedFn } from 'ahooks'
import { Tooltip } from 'antd'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import emiter from '@/utils/eventBus/eventBus'
import { yakitNotify } from '@/utils/notification'
import { AIAgentTabListEnum } from '../defaultConstant'
import { openAIAgentTab } from '../aiAgentTabNavigation'
import { useBrowserInstances } from '../browserInstances/browserInstanceStore'

const seenPendingIds = new Set<string>()
const notifiedOnlineIdentities = new Set<string>()

/** 测试重置跨页签去重记录。页签卸载不应清空，否则关闭再打开会重弹。 */
export const resetBrowserPairingNotifyState = () => {
  seenPendingIds.clear()
  notifiedOnlineIdentities.clear()
}

const claimOnlineIdentity = (identity: string) => {
  if (!identity || notifiedOnlineIdentities.has(identity)) return false
  notifiedOnlineIdentities.add(identity)
  return true
}

/** 浏览器配对提示：新的待批准申请，以及已在线或自动连接的实例。多个页签共用同一份去重记录。 */
export const BrowserPairingNotify: React.FC = () => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { instances: browserInstances, pending } = useBrowserInstances()
  const openBrowserPairing = useMemoizedFn(() => {
    openAIAgentTab(AIAgentTabListEnum.Browser)
  })
  const notifyAutoConnected = useMemoizedFn((identity: string) => {
    if (!claimOnlineIdentity(identity)) return
    yakitNotify('success', {
      message: (
        <span>
          {t('BrowserInstances.autoConnectedNotifyPrefix', { identity })} &nbsp;
          <Tooltip title={t('BrowserInstances.pairingRequestNotifyTooltip')}>
            <span style={{ color: 'var(--Colors-Use-Main-Primary)' }}>
              {t('BrowserInstances.autoConnectedNotifyAction')}
            </span>
          </Tooltip>
        </span>
      ),
      style: { cursor: 'pointer' },
      onClick: openBrowserPairing,
    })
  })
  useEffect(() => {
    const onAutoApproved = (identity: string) => {
      notifyAutoConnected(identity)
    }
    emiter.on('onBrowserExtensionAutoApproved', onAutoApproved)
    return () => emiter.off('onBrowserExtensionAutoApproved', onAutoApproved)
  }, [notifyAutoConnected])
  useEffect(() => {
    browserInstances.forEach((instance) => {
      if (!instance.online) return
      notifyAutoConnected(instance.identity || instance.name)
    })
  }, [browserInstances, notifyAutoConnected])
  useEffect(() => {
    const nextIds = pending.map((item) => item.id)
    const hasNew = nextIds.some((id) => !seenPendingIds.has(id))
    nextIds.forEach((id) => seenPendingIds.add(id))
    if (!hasNew) return
    yakitNotify('info', {
      message: (
        <span>
          {t('BrowserInstances.pairingRequestNotifyPrefix')} &nbsp;
          <Tooltip title={t('BrowserInstances.pairingRequestNotifyTooltip')}>
            <span style={{ color: 'var(--Colors-Use-Main-Primary)' }}>
              {t('BrowserInstances.pairingRequestNotifyAction')}
            </span>
          </Tooltip>
        </span>
      ),
      style: { cursor: 'pointer' },
      onClick: openBrowserPairing,
    })
  }, [pending, t, openBrowserPairing])
  return null
}
