import React, { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Divider, Form, Space } from 'antd'
import { InputItem, SwitchItem } from './inputUtil'
import { useGetState, useMemoizedFn } from 'ahooks'
import { getRemoteValue, setRemoteValue } from './kv'
import {
  BRIDGE_ADDR,
  BRIDGE_SECRET,
  DNSLOG_ADDR,
  DNSLOG_INHERIT_BRIDGE,
  DNSLOG_SECRET,
} from '../pages/reverse/ReverseServerPage'
import { failed, info } from './notification'
import type { YakExecutorParam } from '../pages/invoker/YakExecutorParams'
import useHoldingIPCRStream from '../hook/useHoldingIPCRStream'
import { randomString } from './randomUtil'
import { PluginResultUI } from '../pages/yakitStore/viewers/base'
import { isCommunityEdition } from './envfile'
import type { NetInterface } from '@/models/Traffic'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { RefreshIcon } from '@/assets/newIcon'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitReverse, yakitScript, yakitStream } from '@/services/electronBridge'

export interface YakScriptParam {
  Script: string
  Params: YakExecutorParam[]
}

interface StartExecYakCodeModalProps {
  visible: boolean
  onClose: () => void
  noErrorsLogCallBack?: () => void
  verbose: string
  params: YakScriptParam
  successInfo?: boolean
}
export const StartExecYakCodeModal: React.FC<StartExecYakCodeModalProps> = (props) => {
  const { visible, onClose, params, verbose, successInfo, noErrorsLogCallBack } = props
  const { t, i18n } = useI18nNamespaces(['utils'])

  const startToExecYakScriptViewerRef = useRef<any>()

  const onCancel = () => {
    yakitStream.cancel('ExecYakCode', startToExecYakScriptViewerRef.current.token)

    onClose()
  }

  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    setRefresh((c) => c + 1)
  }, [visible])

  return (
    <YakitModal
      open={visible}
      type="white"
      width="60%"
      maskClosable={false}
      destroyOnHidden={true}
      title={`${t('basic.StartExecYakCodeModal.executing')}${verbose}`}
      onCancel={onCancel}
      closable={true}
      footer={null}
    >
      <div style={{ height: 400, overflowY: 'auto' }}>
        <StartToExecYakScriptViewer
          key={refresh}
          ref={startToExecYakScriptViewerRef}
          noErrorsLogCallBack={noErrorsLogCallBack}
          script={params}
          verbose={verbose}
          successInfo={successInfo}
          onCancel={onCancel}
        />
      </div>
    </YakitModal>
  )
}

const StartToExecYakScriptViewer = React.forwardRef(
  (
    props: {
      ref: any
      noErrorsLogCallBack?: () => void
      verbose: string
      script: YakScriptParam
      successInfo?: boolean
      onCancel: () => void
    },
    ref,
  ) => {
    const { script, verbose, successInfo = true, onCancel, noErrorsLogCallBack } = props
    const { t, i18n } = useI18nNamespaces(['utils'])
    const [token, setToken] = useState(randomString(40))
    const [loading, setLoading] = useState(true)
    const [messageStateStr, setMessageStateStr] = useState<string>('')
    const checkErrorsFlagRef = useRef<boolean>(false)

    useImperativeHandle(ref, () => ({
      token,
    }))

    const [infoState, { reset, setXtermRef }] = useHoldingIPCRStream(
      verbose,
      'ExecYakCode',
      token,
      () => setTimeout(() => setLoading(false), 300),
      () => {
        yakitScript
          .execYakCode(script, token)
          .then(() => {
            successInfo && info(t('basic.StartToExecYakScriptViewer.executeSuccess', { verbose }))
          })
          .catch((e) => {
            failed(`${t('basic.StartToExecYakScriptViewer.executeError', { verbose })}${e}`)
          })
      },
    )
    useEffect(() => {
      setMessageStateStr(JSON.stringify(infoState.messageState))
    }, [infoState.messageState])

    useEffect(() => {
      if (messageStateStr !== '') {
        const messageState = JSON.parse(messageStateStr)
        for (let i = 0; i < messageState.length; i++) {
          const item = messageState[i]
          if (item.level === 'error') {
            checkErrorsFlagRef.current = true
            return
          }
        }
        // 导入日志都没有错误
        if (!checkErrorsFlagRef.current && !loading && messageState.length) {
          noErrorsLogCallBack && noErrorsLogCallBack()
          onCancel()
        }
      }
    }, [messageStateStr, loading])

    return (
      <PluginResultUI
        loading={loading}
        defaultConsole={false}
        statusCards={infoState.statusState}
        risks={infoState.riskState}
        featureType={infoState.featureTypeState}
        feature={infoState.featureMessageState}
        progress={infoState.processState}
        results={infoState.messageState}
        onXtermRef={setXtermRef}
      />
    )
  },
)
