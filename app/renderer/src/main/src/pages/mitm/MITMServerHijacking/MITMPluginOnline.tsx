import React, { useEffect, useMemo, useState } from 'react'
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

const { ipcRenderer } = window.require('electron')

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
  useEffect(() => {
    if (!taskToken) {
      return
    }
    ipcRenderer.on(`${taskToken}-data`, (_, data: DownloadOnlinePluginAllResProps) => {
      const p = Math.floor(data.Progress * 100)
      setPercent(p)
    })
    ipcRenderer.on(`${taskToken}-end`, () => {
      setTimeout(() => {
        setPercent(0)
        setVisible(false)
        onFinish && onFinish()
        if (isCommunityEdition()) ipcRenderer.invoke('refresh-public-menu')
        else ipcRenderer.invoke('change-main-menu')
        onRefLocalPluginList()
      }, 200)
    })
    ipcRenderer.on(`${taskToken}-error`, (_, e) => {
      onRefLocalPluginList()
      yakitNotify('error', t('YakitNotification.downloadFailed', { error: e + '' }))
    })
    return () => {
      ipcRenderer.removeAllListeners(`${taskToken}-data`)
      ipcRenderer.removeAllListeners(`${taskToken}-error`)
      ipcRenderer.removeAllListeners(`${taskToken}-end`)
    }
  }, [taskToken])
  useEffect(() => {
    if (visible) {
      const addParams: DownloadOnlinePluginsRequest = {
        ListType: listType === 'online' ? '' : listType,
        PluginType: pluginType ? pluginType : [],
      }
      ipcRenderer
        .invoke('DownloadOnlinePlugins', addParams, taskToken)
        .then(() => {})
        .catch((e) => {
          failed(t('YakitNotification.downloadFailed', { error: e + '' }))
        })
    }
  }, [visible])
  const StopAllPlugin = () => {
    ipcRenderer.invoke('cancel-DownloadOnlinePlugins', taskToken).catch((e) => {
      failed(t('MITMPluginLocalList.stop_download_failed_e', { e }))
      onRefLocalPluginList()
    })
  }
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
