import { ipc } from '@/services/ipc'
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Progress } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { randomString } from '@/utils/randomUtil'
import { getReleaseEditionName, isCommunityEdition } from '@/utils/envfile'
import type { DownloadOnlinePluginsRequest } from '@/pages/plugins/utils'
import type { DownloadOnlinePluginAllResProps } from '@/pages/yakitStore/YakitStorePage'
import emiter from '@/utils/eventBus/eventBus'
import { failed, yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import style from '../MITMPage.module.scss'
import { CloudDownloadSolid } from '@yakit-libs/yakit-ui-icons/solid'

export interface YakitGetOnlinePluginProps {
  /**@name 'online'默认首页 mine 个人, recycle 回收站 check 审核页面" */
  listType?: 'online' | 'mine' | 'recycle' | 'check'
  pluginType?: string[]
  visible: boolean
  setVisible: (b: boolean) => void
  onFinish?: () => void
  isRereshLocalPluginList?: boolean
  getContainer?: HTMLElement
}

/** 一键下载插件 */
export const YakitGetOnlinePlugin: React.FC<YakitGetOnlinePluginProps> = React.memo((props) => {
  const {
    listType = 'online',
    pluginType,
    visible,
    setVisible,
    onFinish,
    isRereshLocalPluginList = true,
    getContainer,
  } = props
  const { t } = useI18nNamespaces(['mitm', 'yakitUi'])
  const taskToken = useMemo(() => randomString(40), [])
  const [percent, setPercent] = useState<number>(0)
  const controllerRef = useRef<AbortController>()
  useEffect(() => {
    if (!visible) return
    const controller = new AbortController()
    controllerRef.current = controller
    setPercent(0)
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      onRefLocalPluginList()
      yakitNotify('error', t('YakitNotification.downloadFailed', { error: String(error) }))
    }
    void ipc
      .openStream(
        'grpc',
        'DownloadOnlinePlugins',
        {
          ListType: listType === 'online' ? '' : listType,
          PluginType: pluginType || [],
        },
        {
          token: taskToken,
          signal: controller.signal,
          onData(data) {
            if (!controller.signal.aborted) setPercent(Math.floor(data.Progress * 100))
          },
          onError,
          onEnd() {
            if (controller.signal.aborted) return
            setPercent(0)
            setVisible(false)
            onFinish?.()
            if (isCommunityEdition())
              void ipc.invoke('local', 'ForwardMainEvent', { event: 'refresh-public-menu-callback' })
            else void ipc.invoke('local', 'ForwardMainEvent', { event: 'fetch-new-main-menu' })
            onRefLocalPluginList()
          },
        },
      )
      .catch(onError)
    return () => controller.abort()
  }, [visible])
  const StopAllPlugin = () => controllerRef.current?.abort()
  const onRefLocalPluginList = useMemoizedFn(() => {
    emiter.emit('onRefreshLocalPluginList', true)
  })
  return (
    <YakitHint
      visible={visible}
      title={t('MITMPluginLocalList.cloud_plugins_downloading', { edition: getReleaseEditionName() })}
      heardIcon={<CloudDownloadSolid size={32} style={{ color: 'var(--Colors-Use-Warning-Primary)' }} />}
      onCancel={() => {
        StopAllPlugin()
        setVisible(false)
      }}
      okButtonProps={{ style: { display: 'none' } }}
      isDrag={true}
      mask={false}
      getContainer={getContainer}
      wrapClassName={style['yakitGetOnlinePlugin']}
    >
      <Progress
        strokeColor="var(--Colors-Use-Main-Primary)"
        trailColor="var(--Colors-Use-Neutral-Bg-Hover)"
        percent={percent}
        format={(percent) => t('YakitProgress.downloadedPercent', { percent })}
      />
    </YakitHint>
  )
})
