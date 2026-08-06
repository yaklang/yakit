import type { Dispatch, SetStateAction } from 'react'
import { loadAdvancedConfig } from '@/pages/mitm/MITMAdvancedConfig'
import { MITMConsts } from '@/pages/mitm/MITMConsts'
import { SingleManualHijackInfoMessage } from '@/pages/mitm/MITMHacker/utils'
import { execPacketScanWithNewTab } from '@/pages/packetScanner/PacketScanner'
import { getRemoteValue } from '@/utils/kv'
import { debugToPrintLogs } from '@/utils/logCollection'
import { info, yakitFailed, yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import type { TFunction } from '@/i18n/useI18nNamespaces'
import type { HTTPFlow } from './HTTPFlowTable.constants'
import { buildFavoriteTags, buildHTTPFlowColorTags, isHTTPFlowFavorite, patchHTTPFlowTags } from './HTTPFlowTable.utils'

const { ipcRenderer } = window.require('electron')
const tOriginal = i18n.getFixedT(null, ['yakitUi', 'history'])

/** 发送 Web Fuzzer */
export const onSendToTab = async (
  rowData?: HTTPFlow | SingleManualHijackInfoMessage,
  openFlag?: boolean,
  downstreamProxyStr?: string,
  fromMITM?: boolean,
) => {
  if (!rowData) return
  const params: Record<string, string> = {}
  const { Url, URL } = rowData as HTTPFlow
  const isHttpUrl = (Url || URL)?.startsWith('http://')

  if (fromMITM) {
    try {
      const [stateSecretHijackingResult, advancedConfigResult] = await Promise.allSettled([
        getRemoteValue(MITMConsts.MITMDefaultEnableGMTLS),
        loadAdvancedConfig(),
      ])
      const stateSecretHijacking =
        stateSecretHijackingResult.status === 'fulfilled' ? stateSecretHijackingResult.value : ''
      const disableSystemProxy =
        advancedConfigResult.status === 'fulfilled' ? advancedConfigResult.value.DisableSystemProxy : false
      const MITMData: Record<string, boolean> = { noSystemProxy: disableSystemProxy }

      if (stateSecretHijacking && !isHttpUrl) {
        if (['enableGMTLS', '1'].includes(stateSecretHijacking)) {
          MITMData.enableGMTLS = true
        } else if (stateSecretHijacking === 'randomJA3') {
          MITMData.randomJA3 = true
        }
      }
      Object.assign(params, { MITMData: JSON.stringify(MITMData) })
    } catch (e) {
      debugToPrintLogs({
        page: 'HTTPFlowTable',
        fun: 'onSendToTab',
        content: e,
      })
      console.error(e)
    }
  }

  ipcRenderer
    .invoke('send-to-tab', {
      type: 'fuzzer',
      data: {
        openFlag,
        isHttps: isHttpUrl ? false : (rowData as HTTPFlow).IsHTTPS,
        downstreamProxyStr,
        ...params,
        request: (rowData as HTTPFlow).InvalidForUTF8Request
          ? (rowData as HTTPFlow).SafeHTTPRequest!
          : new Buffer(rowData.Request).toString('utf8'),
      },
    })
    .then(() => {
      if (openFlag === false) {
        info(tOriginal('YakitNotification.sendSuccess'))
      }
    })
}

/** 标注颜色 */
export const CalloutColor = (
  flow: HTTPFlow,
  i: { color: string },
  _data: HTTPFlow[],
  setData: Dispatch<SetStateAction<HTTPFlow[]>>,
) => {
  if (!flow) return

  const existedTags = buildHTTPFlowColorTags(flow.Tags, i.color)

  ipcRenderer
    .invoke('SetTagForHTTPFlow', {
      Id: flow.Id,
      Hash: flow.Hash,
      Tags: existedTags,
    })
    .then(() => {
      yakitNotify('success', tOriginal('HTTPFlowTable.setColorSuccess'))
      setData((current) => patchHTTPFlowTags(current, [{ Id: flow.Id, Hash: flow.Hash, Tags: existedTags.join('|') }]))
    })
    .catch((e) => {
      yakitFailed(`${e}`)
    })
}

/** 移除颜色 */
export const onRemoveCalloutColor = (
  flow: HTTPFlow,
  _data: HTTPFlow[],
  setData: Dispatch<SetStateAction<HTTPFlow[]>>,
) => {
  if (!flow) return

  const existedTags = buildHTTPFlowColorTags(flow.Tags)

  ipcRenderer
    .invoke('SetTagForHTTPFlow', {
      Id: flow.Id,
      Hash: flow.Hash,
      Tags: existedTags,
    })
    .then(() => {
      yakitNotify('success', tOriginal('HTTPFlowTable.removeColorSuccess'))
      setData((current) => patchHTTPFlowTags(current, [{ Id: flow.Id, Hash: flow.Hash, Tags: existedTags.join('|') }]))
    })
    .catch((e) => {
      yakitFailed(`${e}`)
    })
}

export const toggleHTTPFlowFavorite = (
  flow: HTTPFlow,
  favorite: boolean,
  setData: Dispatch<SetStateAction<HTTPFlow[]>>,
  removeWhenUnfavorite = false,
) => {
  if (!flow) return

  const nextTags = buildFavoriteTags(flow.Tags, favorite)
  ipcRenderer
    .invoke('SetTagForHTTPFlow', {
      Id: flow.Id,
      Hash: flow.Hash,
      Tags: nextTags,
    })
    .then(() => {
      setData((prev: HTTPFlow[]) => {
        const newData = prev.map((item) => {
          if (item.Hash !== flow.Hash) return item
          return {
            ...item,
            Tags: nextTags.join('|'),
          }
        })
        return removeWhenUnfavorite && !favorite ? newData.filter(isHTTPFlowFavorite) : newData
      })
    })
    .catch((e) => {
      yakitFailed(`${e}`)
    })
}

export const onBatchExecPacketScan = (params: {
  httpFlowIds: string[]
  maxLength: number
  currentPacketScan: { Keyword?: string; Verbose: string }
}) => {
  const { httpFlowIds, maxLength, currentPacketScan } = params
  if (httpFlowIds.length > maxLength) {
    yakitNotify('warning', tOriginal('HTTPFlowTable.sendLimitData', { length: maxLength }))
    return
  }
  execPacketScanWithNewTab({
    httpFlowIds,
    https: false,
    keyword: currentPacketScan.Keyword || '',
    verbose: currentPacketScan.Verbose,
  })
}

export const calloutColorBatch = (params: {
  flowList: HTTPFlow[]
  number: number
  colorItem: { color: string }
  data: HTTPFlow[]
  setData: Dispatch<SetStateAction<HTTPFlow[]>>
  setSelectedRowKeys: (keys: string[]) => void
  setSelectedRows: (rows: HTTPFlow[]) => void
  t: TFunction
}) => {
  const { flowList, number, colorItem, setData, setSelectedRowKeys, setSelectedRows, t } = params
  if (flowList.length === 0) {
    yakitNotify('warning', t('HTTPFlowTable.pleaseSelectData'))
    return
  }
  if (flowList.length > number) {
    yakitNotify('warning', t('HTTPFlowTable.maxOperateData', { number }))
    return
  }
  const newList = flowList.map((flow) => {
    const existedTags = buildHTTPFlowColorTags(flow.Tags, colorItem.color)
    return { Id: flow.Id, Hash: flow.Hash, Tags: existedTags }
  })
  ipcRenderer
    .invoke('SetTagForHTTPFlow', {
      CheckTags: newList,
    })
    .then(() => {
      setData((current) =>
        patchHTTPFlowTags(
          current,
          newList.map((item) => ({ ...item, Tags: item.Tags.join('|') })),
        ),
      )
      setSelectedRowKeys([])
      setSelectedRows([])
    })
    .catch((e) => {
      yakitFailed(`${e}`)
    })
}

export const onRemoveCalloutColorBatch = (params: {
  flowList: HTTPFlow[]
  number: number
  data: HTTPFlow[]
  setData: Dispatch<SetStateAction<HTTPFlow[]>>
  setSelectedRowKeys: (keys: string[]) => void
  setSelectedRows: (rows: HTTPFlow[]) => void
  t: TFunction
}) => {
  const { flowList, number, setData, setSelectedRowKeys, setSelectedRows, t } = params
  if (flowList.length === 0) {
    yakitNotify('warning', t('HTTPFlowTable.pleaseSelectData'))
    return
  }
  if (flowList.length > number) {
    yakitNotify('warning', t('HTTPFlowTable.maxOperateData', { number }))
    return
  }
  const newList = flowList.map((flow) => {
    const existedTags = buildHTTPFlowColorTags(flow.Tags)
    return { Id: flow.Id, Hash: flow.Hash, Tags: existedTags }
  })
  ipcRenderer
    .invoke('SetTagForHTTPFlow', {
      CheckTags: newList,
    })
    .then(() => {
      setData((current) =>
        patchHTTPFlowTags(
          current,
          newList.map((item) => ({ ...item, Tags: item.Tags.join('|') })),
        ),
      )
      setSelectedRowKeys([])
      setSelectedRows([])
    })
    .catch((e) => {
      yakitFailed(`${e}`)
    })
}

export const toggleHTTPFlowFavoriteBatch = (params: {
  flowList: HTTPFlow[]
  number: number
  favorite: boolean
  data: HTTPFlow[]
  onlyFavorite: boolean
  setData: Dispatch<SetStateAction<HTTPFlow[]>>
  setSelectedRowKeys: (keys: string[]) => void
  setSelectedRows: (rows: HTTPFlow[]) => void
  t: TFunction
}) => {
  const { flowList, number, favorite, data, onlyFavorite, setData, setSelectedRowKeys, setSelectedRows, t } = params
  if (flowList.length === 0) {
    yakitNotify('warning', t('HTTPFlowTable.pleaseSelectData'))
    return
  }
  if (flowList.length > number) {
    yakitNotify('warning', t('HTTPFlowTable.maxOperateData', { number }))
    return
  }
  const newList = flowList.map((flow) => ({
    Id: flow.Id,
    Hash: flow.Hash,
    Tags: buildFavoriteTags(flow.Tags, favorite),
  }))
  ipcRenderer
    .invoke('SetTagForHTTPFlow', {
      CheckTags: newList,
    })
    .then(() => {
      const newData = data.map((item) => {
        const find = newList.find((ele) => ele.Hash === item.Hash)
        if (!find) return item
        return {
          ...item,
          Tags: find.Tags.join('|'),
        }
      })
      setData(onlyFavorite && !favorite ? newData.filter(isHTTPFlowFavorite) : newData)
      setSelectedRowKeys([])
      setSelectedRows([])
      yakitNotify('success', favorite ? t('HTTPFlowTable.favoriteSuccess') : t('HTTPFlowTable.cancelFavoriteSuccess'))
    })
    .catch((e) => {
      yakitFailed(`${e}`)
    })
}
