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
import { yakitDialog, yakitShell, yakitWindow } from '@/services/electronBridge'
import { normalizeFileExportData } from './fileExport'
const tOriginal = i18n.getFixedT(null, ['utils', 'yakitUi'])

const { ipcRenderer } = window.require('electron')

export const openExternalWebsite = (u: string) => {
  yakitShell.openExternal(u)
}

export const openPacketNewWindow = (data: OpenPacketNewWindowItem) => {
  if (getChildWindowHash()) {
    minWinSendToChildWin({ type: 'openPacketNewWindow', data })
  } else {
    yakitNotify('info', tOriginal('OpenWebsite.openingNewWindow'))
    yakitWindow.openChildWindow({
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
    yakitWindow.openChildWindow({
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
    yakitWindow.openChildWindow({
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
  return ipcRenderer.invoke('open-ai-concurrent-stream-window', data)
}

export const minWinSendToChildWin = (params) => {
  yakitWindow.focusChildWindow()
  yakitWindow.sendToChildWindow({
    type: params.type,
    hash: getChildWindowHash(),
    data: params.data,
  })
}

export const openConsoleNewWindow = () => {
  if (clickEngineConsoleFlag) return
  if (!engineConsoleWindowHash) {
    changeClickEngineConsoleFlag(true)
    yakitWindow.openConsoleWindow().finally(() => changeClickEngineConsoleFlag(false))
  } else {
    yakitWindow.focusConsoleWindow()
  }
}

export const openABSFile = (u: string) => {
  yakitShell.openAbsoluteFile(u)
}

export const openABSFileLocated = (u: string) => {
  yakitShell.openSpecifiedFile(u)
}

export const saveABSFileToOpen = (name: string, data?: Uint8Array | string) => {
  yakitDialog.showSaveDialog(name).then((res) => {
    if (res.canceled || !res.filePath) return
    yakitDialog
      .writeFile({
        route: res.filePath,
        data: normalizeFileExportData(data),
      })
      .then(() => {
        success(tOriginal('YakitNotification.downloadFinished'))
        if (res.filePath) {
          yakitShell.openSpecifiedFile(res.filePath)
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
  const showSaveDialogRes = await yakitDialog.showSaveDialog(name)
  if (showSaveDialogRes.canceled || !showSaveDialogRes.filePath) return
  return yakitDialog
    .writeFile({
      route: showSaveDialogRes.filePath,
      data: normalizeFileExportData(data),
    })
    .then(() => {
      success(successMsg)
      isOpenSpecifiedFile && showSaveDialogRes.filePath && yakitShell.openSpecifiedFile(showSaveDialogRes.filePath)
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
