import { ipc } from '../../../../../shared/communication/window-client'
import type React from 'react'
import { success, yakitFailed, yakitNotify } from './notification'
import type { OpenPacketNewWindowItem } from '@/components/OpenPacketNewWindow/OpenPacketNewWindow'
import { getChildWindowHash } from '@/utils/childWindowHash'
import {
  changeClickEngineConsoleFlag,
  clickEngineConsoleFlag,
  engineConsoleWindowHash,
} from '@/components/layout/hooks/useEngineConsole/useEngineConsole'
import i18n from '@/i18n/i18n'
import type { Risk } from '@/pages/risks/schema'
import type { SSARisk } from '@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType'
import type { ConcurrentStreamFramePayload } from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'
import { normalizeFileExportData } from './fileExport'
const tOriginal = i18n.getFixedT(null, ['utils', 'yakitUi'])

export const openExternalWebsite = (u: string) => {
  ipc.invoke('local', 'shell-open-external', u)
}

export const openPacketNewWindow = (data: OpenPacketNewWindowItem) => {
  if (getChildWindowHash()) {
    minWinSendToChildWin({ type: 'openPacketNewWindow', data })
  } else {
    yakitNotify('info', tOriginal('OpenWebsite.openingNewWindow'))
    ipc.invoke('local', 'open-new-child-window', {
      type: 'openPacketNewWindow',
      data: data,
    })
  }
}

export const openRiskNewWindow = (data?: Risk) => {
  if (getChildWindowHash()) {
    minWinSendToChildWin({ type: 'openRiskNewWindow', data })
  } else {
    yakitNotify('info', tOriginal('OpenWebsite.openingNewWindow'))
    ipc.invoke('local', 'open-new-child-window', {
      type: 'openRiskNewWindow',
      data: data,
    })
  }
}

export const openSSARiskNewWindow = (data?: SSARisk) => {
  if (getChildWindowHash()) {
    minWinSendToChildWin({ type: 'openSSARiskNewWindow', data })
  } else {
    yakitNotify('info', tOriginal('OpenWebsite.openingNewWindow'))
    ipc.invoke('local', 'open-new-child-window', {
      type: 'openSSARiskNewWindow',
      data: data,
    })
  }
}

export interface OpenAIConcurrentStreamOptions {
  /** 刷新/推送更新时不弹「新窗口打开中」 */
  silent?: boolean
}

/** 打开并发流 aux 子窗，创建时传入 elements 等帧数据 */
export const openAIConcurrentStream = (data: ConcurrentStreamFramePayload, options?: OpenAIConcurrentStreamOptions) => {
  if (!options?.silent) {
    yakitNotify('info', tOriginal('OpenWebsite.openingNewWindow'))
  }
  return ipc.invoke('local', 'open-ai-concurrent-stream-window', data)
}

export const minWinSendToChildWin = (params) => {
  ipc.invoke('local', 'onTop-childWin', {})
  ipc.invoke('local', 'minWin-send-to-childWin', {
    type: params.type,
    hash: getChildWindowHash(),
    data: params.data,
  })
}

export const openConsoleNewWindow = () => {
  if (clickEngineConsoleFlag) return
  if (!engineConsoleWindowHash) {
    changeClickEngineConsoleFlag(true)
    ipc.invoke('local', 'open-console-new-window', {}).finally(() => changeClickEngineConsoleFlag(false))
  } else {
    ipc.invoke('local', 'onTop-console-new-window', {})
  }
}

export const openABSFile = (u: string) => {
  ipc.invoke('local', 'shell-open-abs-file', u)
}

export const openABSFileLocated = (u: string) => {
  ipc.invoke('local', 'open-specified-file', u)
}

export const saveABSFileToOpen = (name: string, data?: Uint8Array | string) => {
  ipc.invoke('local', 'show-save-dialog', name).then((res) => {
    if (res.canceled || !res.filePath) return
    ipc
      .invoke('local', 'write-file', {
        route: res.filePath,
        data: normalizeFileExportData(data),
      })
      .then(() => {
        success(tOriginal('YakitNotification.downloadFinished'))
        if (res.filePath) {
          ipc.invoke('local', 'open-specified-file', res.filePath)
        }
      })
  })
}

export const saveABSFileAnotherOpen = async (params: {
  name: string
  data?: Uint8Array | string
  successMsg: string
  errorMsg: string
  isOpenSpecifiedFile?: boolean
}) => {
  const {
    name,
    data,
    successMsg = tOriginal('YakitNotification.downloadFinished'),
    errorMsg = tOriginal('YakitNotification.downloadFailedNoError'),
    isOpenSpecifiedFile = false,
  } = params
  const showSaveDialogRes = await ipc.invoke('local', 'show-save-dialog', name)
  if (showSaveDialogRes.canceled || !showSaveDialogRes.filePath) return
  return ipc
    .invoke('local', 'write-file', {
      route: showSaveDialogRes.filePath,
      data: normalizeFileExportData(data),
    })
    .then(() => {
      success(successMsg)
      isOpenSpecifiedFile &&
        showSaveDialogRes.filePath &&
        ipc.invoke('local', 'open-specified-file', showSaveDialogRes.filePath)
      return showSaveDialogRes.filePath
    })
    .catch((e) => {
      errorMsg && yakitFailed(`${errorMsg}：${e}`)
      return Promise.reject(e)
    })
}

export interface ExternalUrlProp {
  url: string
  title?: React.ReactNode
}

export const ExternalUrl: React.FC<ExternalUrlProp> = (props) => {
  return (
    <a
      onClick={(e) => {
        openExternalWebsite(props.url)
      }}
    >
      {props.title || props.url}
    </a>
  )
}
