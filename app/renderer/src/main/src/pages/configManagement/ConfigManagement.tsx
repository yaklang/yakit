import React, { memo, useEffect, useMemo } from 'react'
import { YakitSideTab } from '@/components/yakitSideTab/YakitSideTab'
import { YakitTabsProps } from '@/components/yakitSideTab/YakitSideTabType'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { configManagementTabType, useConfigManagementTab } from '@/store'
import { YakitRoute } from '@/enums/yakitRoute'
import emiter from '@/utils/eventBus/eventBus'
import styles from './ConfigManagement.module.scss'

const NewPayload = React.lazy(() =>
  import('@/pages/payloadManager/newPayload').then((res) => ({ default: res.NewPayload })),
)
const ProxyRulesConfig = React.lazy(() => import('@/components/configNetwork/ProxyRulesConfig'))
const HotPatchManagement = React.lazy(() =>
  import('./HotPatchManagement').then((res) => ({ default: res.HotPatchManagement })),
)

const ConfigManagement: React.FC = memo(() => {
  const { t, i18nRefresh } = useI18nNamespaces(['yakitUi', 'yakitRoute', 'layout'])
  const { configManagementActiveTab, setConfigManagementActiveTab } = useConfigManagementTab()

  const yakitTabs: YakitTabsProps[] = useMemo(() => {
    return [
      {
        label: t('YakitRoute.Payload'),
        value: 'payload',
      },
      {
        label: t('Layout.ExtraMenu.proxyManagement'),
        value: 'proxy',
      },
      {
        label: t('Layout.ExtraMenu.hotPatchManagement'),
        value: 'hotPatch',
      },
    ]
  }, [i18nRefresh])

  const getCurrentTabLabel = useMemo(() => {
    switch (configManagementActiveTab) {
      case 'payload':
        return t('YakitRoute.Payload')
      case 'proxy':
        return t('Layout.ExtraMenu.proxyManagement')
      case 'hotPatch':
        return t('Layout.ExtraMenu.hotPatchManagement')
      default:
        return t('YakitRoute.configManagement')
    }
  }, [configManagementActiveTab, i18nRefresh])

  useEffect(() => {
    emiter.emit(
      'onUpdateSingletonPageName',
      JSON.stringify({
        route: YakitRoute.ConfigManagement,
        value: getCurrentTabLabel,
      }),
    )
  }, [configManagementActiveTab, getCurrentTabLabel])

  const content = useMemo(() => {
    switch (configManagementActiveTab) {
      case 'payload':
        return (
          <React.Suspense fallback={<>loading...</>}>
            <NewPayload />
          </React.Suspense>
        )
      case 'proxy':
        return (
          <React.Suspense fallback={<>loading...</>}>
            <ProxyRulesConfig />
          </React.Suspense>
        )
      case 'hotPatch':
        return (
          <React.Suspense fallback={<>loading...</>}>
            <HotPatchManagement />
          </React.Suspense>
        )
      default:
        return null
    }
  }, [configManagementActiveTab])

  return (
    <YakitSideTab
      activeShow={true}
      yakitTabs={yakitTabs}
      activeKey={configManagementActiveTab}
      onActiveKey={(key) => setConfigManagementActiveTab(key as configManagementTabType)}
      t={t}
      key={i18nRefresh}
    >
      <div className={styles['config-management-content']}>{content}</div>
    </YakitSideTab>
  )
})

export default ConfigManagement
