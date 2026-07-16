import { ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import {
  ImportAndExportStatusInfo,
  LogListInfo,
  SaveProgressStream,
} from '@/components/YakitUploadModal/YakitUploadModal'
import { v4 as uuidv4 } from 'uuid'
import { yakitFailed, yakitNotify } from '@/utils/notification'
import { ExportYakScriptLocalResponse, ExportYakScriptStreamRequest } from './PluginsLocalType'
import { useDebounceEffect } from 'ahooks'
import { Form } from 'antd'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { ExecResult } from '@/pages/invoker/schema'
import { ExecResultMessage } from '@/components/yakitLogSchema'
import { openABSFileLocated } from '@/utils/openWebsite'
import { JSONParseLog } from '@/utils/tool'
import { YakitFormDragger } from '@/components/yakitUI/YakitForm/YakitForm'
import { getPathJoin } from '@/pages/yakRunner/utils'
import { SystemInfo } from '@/constants/hardware'
const { ipcRenderer } = window.require('electron')

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

  useDebounceEffect(
    () => {
      let timer
      if (visible) {
        // 发送导出流信号
        const sendExportSignal = async () => {
          try {
            await ipcRenderer.invoke('ExportYakScriptStream', exportLocalParams)
          } catch (error) {
            yakitFailed(error + '')
          }
        }
        sendExportSignal()

        // 每200毫秒渲染一次数据
        timer = setInterval(() => {
          setLocalStreamData(localStreamDataRef.current)
        }, 200)

        ipcRenderer.on('export-yak-script-data', (e, data: ExecResult) => {
          let obj: ExecResultMessage = JSONParseLog(Buffer.from(data.Message).toString(), {
            page: 'PluginLocalExportProps',
            fun: 'export-yak-script-data',
          })
          if (obj.type === 'progress') {
            localStreamDataRef.current = { Progress: obj.content.progress }
            if (obj.content.progress === 1) {
              let name = exportLocalParams.OutputFilename
              if (!exportLocalParams.OutputFilename.endsWith('.zip')) {
                name += '.zip'
              }
              if (exportLocalParams.Password) {
                name += '.enc'
              }

              if (!isRemoteEngine) {
                ipcRenderer.invoke('is-file-exists', exportLocalParams.OutputPluginDir).then((flag: boolean) => {
                  if (!flag) {
                    yakitNotify('error', '目标路径不存在，导出失败')
                  } else {
                    getPathJoin(exportLocalParams.OutputPluginDir, name).then((path) => {
                      openABSFileLocated(path)
                      yakitNotify('success', '导出完毕')
                    })
                  }
                })
              } else {
                yakitNotify('success', '导出完毕')
              }

              setTimeout(() => {
                handleExportLocalPluginFinish()
              }, 300)
            }
          }
        })

        return () => {
          clearInterval(timer)
          ipcRenderer.invoke('cancel-ExportYakScriptStream')
          ipcRenderer.removeAllListeners('export-yak-script-data')
        }
      }
    },
    [visible, exportLocalParams],
    { wait: 300 },
  )

  const resetLocalExport = () => {
    setLocalStreamData(undefined)
    setLocallogListInfo([])
    localStreamDataRef.current = undefined
  }

  const handleExportLocalPluginFinish = () => {
    if (localStreamDataRef.current && localStreamDataRef.current.Progress !== 1) {
      ipcRenderer.invoke('cancel-ExportYakScriptStream')
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
      destroyOnClose={true}
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
      ipcRenderer.invoke('GetProjectsFilePath').then((path) => {
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
