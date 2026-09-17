import { ipc } from '@/services/ipc'
import { randomString } from '@/utils/randomUtil'
import { type ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import {
  ImportAndExportStatusInfo,
  type LogListInfo,
  type SaveProgressStream,
} from '@/components/YakitUploadModal/YakitUploadModal'
import { yakitFailed, yakitNotify } from '@/utils/notification'
import type { ExportYakScriptStreamRequest } from './PluginsLocalType'
import { useDebounceEffect } from 'ahooks'
import { Form } from 'antd'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import type { ExecResult } from '@/pages/invoker/schema'
import type { ExecResultMessage } from '@/components/yakitLogSchema'
import { openABSFileLocated } from '@/utils/openWebsite'
import { JSONParseLog } from '@/utils/tool'
import { YakitFormDragger } from '@/components/yakitUI/YakitForm/YakitForm'
import { getPathJoin } from '@/pages/yakRunner/utils'
import { SystemInfo } from '@/constants/hardware'
declare type getContainerFunc = () => HTMLElement
interface PluginLocalExportProps {
  visible: boolean
  onClose: () => void
  getContainer?: string | HTMLElement | getContainerFunc | false
  exportLocalParams: ExportYakScriptStreamRequest
}

export const PluginLocalExport: React.FC<PluginLocalExportProps> = (props) => {
  const { visible, exportLocalParams, onClose, getContainer } = props
  const [localStreamData, setLocalStreamData] = useState<SaveProgressStream>()
  const localStreamDataRef = useRef<SaveProgressStream>()
  const [locallogListInfo, setLocallogListInfo] = useState<LogListInfo[]>([])
  const isRemoteEngine = SystemInfo.mode === 'remote'

  const controllerRef = useRef<AbortController>()
  useEffect(() => {
    if (!visible) return
    const controller = new AbortController()
    controllerRef.current = controller
    const flush = () => {
      if (!controller.signal.aborted) setLocalStreamData(localStreamDataRef.current)
    }
    const timer = setInterval(flush, 200)
    const onError = (error: unknown) => {
      clearInterval(timer)
      if (controller.signal.aborted) return
      flush()
      yakitFailed(String(error))
    }
    void ipc
      .openStream('grpc', 'ExportYakScriptStream', exportLocalParams, {
        token: randomString(40),
        signal: controller.signal,
        onData(data) {
          if (controller.signal.aborted || !data.IsMessage) return
          const obj: ExecResultMessage = JSONParseLog(new TextDecoder().decode(data.Message), {
            page: 'PluginLocalExportProps',
            fun: 'export',
          })
          if (obj?.type === 'progress') localStreamDataRef.current = { Progress: obj.content.progress }
        },
        onError,
        async onEnd() {
          clearInterval(timer)
          if (controller.signal.aborted) return
          flush()
          try {
            if (!isRemoteEngine) {
              const exists = await ipc.invoke('local', 'is-file-exists', exportLocalParams.OutputPluginDir)
              if (controller.signal.aborted) return
              if (!exists) throw new Error('目标路径不存在，导出失败')
              let name = exportLocalParams.OutputFilename
              if (!name.endsWith('.zip')) name += '.zip'
              if (exportLocalParams.Password) name += '.enc'
              const path = await getPathJoin(exportLocalParams.OutputPluginDir, name)
              if (controller.signal.aborted) return
              openABSFileLocated(path)
            }
            yakitNotify('success', '导出完毕')
            resetLocalExport()
            onClose()
          } catch (error) {
            onError(error)
          }
        },
      })
      .catch(onError)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [visible, exportLocalParams])

  const resetLocalExport = () => {
    setLocalStreamData(undefined)
    setLocallogListInfo([])
    localStreamDataRef.current = undefined
  }

  const handleExportLocalPluginFinish = () => {
    controllerRef.current?.abort()
    if (localStreamDataRef.current && localStreamDataRef.current.Progress !== 1) {
      controllerRef.current?.abort()
      yakitNotify('info', '取消导出插件')
    }
    resetLocalExport()
    onClose()
  }

  return (
    <YakitModal
      open={visible}
      getContainer={getContainer}
      type="white"
      title="导出本地插件"
      onCancel={handleExportLocalPluginFinish}
      width={680}
      closable={true}
      maskClosable={false}
      destroyOnHidden={true}
      bodyStyle={{ padding: 0 }}
      footerStyle={{ justifyContent: 'flex-end' }}
      footer={
        <YakitButton type={'outline2'} onClick={handleExportLocalPluginFinish}>
          {localStreamData?.Progress === 1 ? '完成' : '取消'}
        </YakitButton>
      }
    >
      <div style={{ padding: '0 16px' }}>
        <ImportAndExportStatusInfo
          title="导出中"
          showDownloadDetail={false}
          streamData={localStreamData || { Progress: 0 }}
          logListInfo={locallogListInfo}
        ></ImportAndExportStatusInfo>
      </div>
    </YakitModal>
  )
}

export interface PluginLocalExportFormRefProps {
  onSetShowChangePath: React.Dispatch<React.SetStateAction<boolean>>
}
interface PluginLocalExportFormProps {
  ref?: ForwardedRef<PluginLocalExportFormRefProps>
  onCancel: () => void
  onOK: (values: { OutputFilename: string; Password: string; OutputPluginDir: string }) => void
}
export const PluginLocalExportForm = forwardRef((props: PluginLocalExportFormProps, ref) => {
  const { onCancel, onOK } = props
  const [form] = Form.useForm()
  const isRemoteEngine = SystemInfo.mode === 'remote'
  const [showChangePath, setShowChangePath] = useState<boolean>(!isRemoteEngine)

  useImperativeHandle(
    ref,
    () => ({
      onSetShowChangePath: setShowChangePath,
    }),
    [form],
  )

  useEffect(() => {
    if (!isRemoteEngine) {
      ipc.invoke('local', 'GetProjectsFilePath', {}).then((path) => {
        form.setFieldsValue({ OutputPluginDir: path })
      })
    }
  }, [isRemoteEngine])

  return (
    <Form
      form={form}
      layout={'horizontal'}
      labelCol={{ span: 5 }}
      wrapperCol={{ span: 18 }}
      onValuesChange={(changedValues, allValues) => {}}
      onSubmitCapture={(e) => {
        e.preventDefault()
      }}
    >
      {showChangePath && (
        <YakitFormDragger
          formItemProps={{
            name: 'OutputPluginDir',
            label: '导出路径',
            rules: [{ required: !isRemoteEngine, message: '请输入导出路径' }],
          }}
          multiple={false}
          selectType="folder"
          help={isRemoteEngine ? '可手动输入导出路径，' : '可手动输入导出路径或点击此处'}
          uploadFolderText="选择文件夹"
          showUploadBtn={!isRemoteEngine}
        />
      )}
      <Form.Item label={'文件名'} rules={[{ required: true, message: '请填写文件夹名' }]} name={'OutputFilename'}>
        <YakitInput />
      </Form.Item>

      <Form.Item label={'密码'} name={'Password'}>
        <YakitInput />
      </Form.Item>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginRight: 20 }}>
        <YakitButton type="outline2" onClick={onCancel}>
          取消
        </YakitButton>
        <YakitButton type={'primary'} onClick={() => form.validateFields().then((res) => onOK(res))}>
          确定
        </YakitButton>
      </div>
    </Form>
  )
})
