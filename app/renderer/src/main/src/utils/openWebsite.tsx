import React from 'react'
import { success, yakitFailed, yakitNotify } from './notification'
import { OpenPacketNewWindowItem } from '@/components/OpenPacketNewWindow/OpenPacketNewWindow'
import { childWindowHash } from '@/pages/layout/mainOperatorContent/MainOperatorContent'
import {
  changeClickEngineConsoleFlag,
  clickEngineConsoleFlag,
  engineConsoleWindowHash,
} from '@/components/layout/hooks/useEngineConsole/useEngineConsole'
import i18n from '@/i18n/i18n'
import { Risk } from '@/pages/risks/schema'
import { SSARisk } from '@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType'
import { yakitDialog, yakitShell, yakitWindow } from '@/services/electronBridge'
const tOriginal = i18n.getFixedT(null, ['utils', 'yakitUi'])

const toWritableText = (data?: Uint8Array | string) => {
  if (typeof data === 'string') {
    return data
  }

  if (data instanceof Uint8Array) {
    return new TextDecoder().decode(data)
  }

  return ''
}

export const openExternalWebsite = (u: string) => {
  yakitShell.openExternal(u)
}

export const openPacketNewWindow = (data: OpenPacketNewWindowItem) => {
  if (childWindowHash) {
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
  if (childWindowHash) {
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
  if (childWindowHash) {
    minWinSendToChildWin({ type: 'openSSARiskNewWindow', data })
  } else {
    yakitNotify('info', tOriginal('OpenWebsite.openingNewWindow'))
    yakitWindow.openChildWindow({
      type: 'openSSARiskNewWindow',
      data: data,
    })
  }
}

export const minWinSendToChildWin = (params) => {
  yakitWindow.focusChildWindow()
  yakitWindow.sendToChildWindow({
    type: params.type,
    hash: childWindowHash,
    data: params.data,
  })
}

export const openConsoleNewWindow = () => {
  if (clickEngineConsoleFlag) return
  if (!engineConsoleWindowHash) {
    changeClickEngineConsoleFlag(true)
    yakitWindow.openConsoleWindow()
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
        data: toWritableText(data),
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
      data: toWritableText(data),
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
