import React from 'react'
import { HTTPFlow } from '@/components/HTTPFlowTable/HTTPFlowTable'
import { Alert, Space } from 'antd'
import { failed } from '@/utils/notification'
import { CopyableField } from '@/utils/inputUtil'
import { openExternalWebsite } from '@/utils/openWebsite'
import i18n from '@/i18n/i18n'
import { showYakitModal } from './yakitUI/YakitModal/YakitModalConfirm'
import { YakitButton } from './yakitUI/YakitButton/YakitButton'
const tOriginal = i18n.getFixedT(null, 'components')

const { ipcRenderer } = window.require('electron')

export const showResponseViaHTTPFlowID = (v: HTTPFlow) => {
  showResponse(v, undefined, true)
}

export const showResponseViaResponseRaw = (v: Uint8Array, url?: string) => {
  showResponse(v, url, true)
}

const showResponse = (v: HTTPFlow | Uint8Array | string, url?: string, noConfirm?: boolean) => {
  let params: {
    HTTPFlowID?: number
    Url?: string
    HTTPResponse?: Uint8Array
  } = {
    Url: url,
  }

  try {
    if (typeof v === 'object' && 'Id' in v) {
      params.HTTPFlowID = (v as HTTPFlow).Id
    } else {
      params.HTTPResponse = v as Uint8Array
    }
  } catch (e) {
    failed(tOriginal('ShowInBrowser.buildParamsFailed'))
    return
  }

  ipcRenderer
    .invoke('RegisterFacadesHTTP', params)
    .then((res: { FacadesUrl: string }) => {
      if (!!noConfirm) {
        openExternalWebsite(res.FacadesUrl)
        return
      }

      let m = showYakitModal({
        title: (modalT) => modalT('ShowInBrowser.confirmOpenTitle'),
        width: '50%',
        content: (modalT) => (
          <Space direction={'vertical'} style={{ maxWidth: '100%' }}>
            <Alert type={'info'} message={modalT('ShowInBrowser.infoMessage')} />
            <CopyableField text={res.FacadesUrl} mark={true} />
            <YakitButton
              onClick={() => {
                m.destroy()
                openExternalWebsite(res.FacadesUrl)
              }}
              type={'primary'}
            >
              {modalT('ShowInBrowser.confirmOpen')}
            </YakitButton>
          </Space>
        ),
      })
    })
    .catch((e) => {
      failed(tOriginal('ShowInBrowser.showResponseFailed', { error: String(e) }))
    })
}
