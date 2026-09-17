import { ipc, type GrpcInput } from '@/services/ipc'
import { memo, useEffect, useRef } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitFormDragger } from '@/components/yakitUI/YakitForm/YakitForm'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { ImportAndExportStatusInfo } from '@/components/YakitUploadModal/YakitUploadModal'
import { yakitNotify } from '@/utils/notification'
import { openABSFileLocated } from '@/utils/openWebsite'
import { randomString } from '@/utils/randomUtil'
import { useMemoizedFn, useSafeState } from 'ahooks'
import { Form } from 'antd'
import { useCampare } from '@/hook/useCompare/useCompare'
import type { YakitFormDraggerProps } from '@/components/yakitUI/YakitForm/YakitFormType'
import styles from './ImportExportModal.module.scss'

const ImportExportModalSize = {
  export: {
    width: 520,
    labelCol: 5,
    wrapperCol: 18,
  },
  import: {
    width: 720,
    labelCol: 6,
    wrapperCol: 17,
  },
}
export interface ExportImportProgress {
  Progress: number
  Verbose: string
}
type ExportFilter =
  | NonNullable<GrpcInput<'ExportFingerprint'>['Filter']>
  | NonNullable<GrpcInput<'ExportSyntaxFlows'>['Filter']>
interface ExportRequest<T extends ExportFilter> {
  Filter: T
  Password?: string
  TargetPath: string
}
interface ImportRequest {
  InputPath: string
  Password?: string
}
export type ImportExportModalExtra = {
  hint: boolean
} & {
  title: string
  type: 'export' | 'import'
  apiKey: 'ImportFingerprint' | 'ExportFingerprint' | 'ImportSyntaxFlows' | 'ExportSyntaxFlows'
}
type ImportExportWhichUse = 'fingerprint' | 'rule'
interface ImportExportModalComProps<T extends ExportFilter> {
  /** 是否被dom节点包含 */
  getContainer?: HTMLElement
  extra: ImportExportModalExtra
  whichUse: ImportExportWhichUse
  filterData: T
  onCallback: (result: boolean) => void
  yakitFormDraggerProps?: YakitFormDraggerProps
}
const ImportExportModalInner = <T extends ExportFilter>(props: ImportExportModalComProps<T>) => {
  const { getContainer, extra, onCallback, filterData, yakitFormDraggerProps = {} } = props

  const [form] = Form.useForm()

  const [token, setToken] = useSafeState('')
  const controllerRef = useRef<AbortController>()
  const submittingRef = useRef(false)
  const [showProgressStream, setShowProgressStream] = useSafeState(false)
  const timeRef = useRef<ReturnType<typeof setTimeout>>()
  const importExportStreamRef = useRef<ExportImportProgress>({
    Progress: 0,
    Verbose: '',
  })
  const [progressStream, setProgressStream] = useSafeState<ExportImportProgress>({
    Progress: 0,
    Verbose: '',
  })

  // 导出路径
  const exportPath = useRef<string>('')

  const onSubmit = useMemoizedFn(async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    const controller = new AbortController()
    controllerRef.current = controller
    const flush = () => setProgressStream({ ...importExportStreamRef.current })
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      clearInterval(timeRef.current)
      flush()
      yakitNotify('error', `[${extra.apiKey}] error: ${error}`)
    }
    try {
      const value = await form.validateFields()
      const request: ExportRequest<T> | ImportRequest =
        extra.type === 'export'
          ? {
              Filter: filterData,
              TargetPath: value.TargetPath.endsWith('.zip') ? value.TargetPath : value.TargetPath + '.zip',
              Password: value.Password || undefined,
            }
          : { InputPath: value.InputPath, Password: value.Password || undefined }
      if ('TargetPath' in request)
        exportPath.current = await ipc.invoke('local', 'GenerateProjectsFilePath', request.TargetPath)
      if (controller.signal.aborted) return
      setShowProgressStream(true)
      timeRef.current = setInterval(flush, 500)
      await ipc.openStream('grpc', extra.apiKey, request, {
        token,
        signal: controller.signal,
        onData(value) {
          if (!controller.signal.aborted) importExportStreamRef.current = value
        },
        onError,
        onEnd() {
          if (controller.signal.aborted) return
          clearInterval(timeRef.current)
          flush()
          yakitNotify('info', `[${extra.apiKey}] finished`)
        },
      })
    } catch (error) {
      onError(error)
    } finally {
      if (controllerRef.current === controller) submittingRef.current = false
    }
  })

  const onCancelStream = useMemoizedFn(() => {
    controllerRef.current?.abort()
    clearInterval(timeRef.current)
  })
  const onSuccessStream = useMemoizedFn(() => {
    if (extra.type === 'export') {
      exportPath.current && openABSFileLocated(exportPath.current)
    }
    onCallback(true)
  })

  const progressStreamCom = useCampare(progressStream)
  useEffect(() => {
    if (progressStream.Progress === 1) {
      onSuccessStream()
    }
  }, [progressStreamCom])

  const onCancel = useMemoizedFn(() => {
    onCallback(false)
  })

  // modal header 描述文字
  const exportDescribeMemoizedFn = useMemoizedFn((type) => {
    switch (type) {
      case 'export':
        return (
          <div className={styles['export-hint']}>
            远程模式下导出后请打开~Yakit\yakit-projects\projects路径查看导出文件，文件名无需填写后缀
          </div>
        )
      case 'import':
        return (
          <div className={styles['import-hint']}>
            导入外部资源存在潜在风险，可能会被植入恶意代码或Payload，造成数据泄露、系统被入侵等严重后果。请务必谨慎考虑引入外部资源的必要性，并确保资源来源可信、内容安全。如果确实需要使用外部资源，建议优先选择官方发布的安全版本，或自行编写可控的数据源。同时，请保持系统和软件的最新版本，及时修复已知漏洞，做好日常安全防护。
          </div>
        )

      default:
        break
    }
  })

  // 导入 / 导出 item 节点
  const exportItemMemoizedFn = useMemoizedFn((type) => {
    switch (type) {
      case 'export':
        return (
          <Form.Item label={'文件夹名'} rules={[{ required: true, message: '请填写文件夹名' }]} name={'TargetPath'}>
            <YakitInput />
          </Form.Item>
        )
      case 'import':
        return (
          <>
            <YakitFormDragger
              formItemProps={{
                name: 'InputPath',
                label: '本地路径',
                rules: [{ required: true, message: '请输入本地路径' }],
              }}
              multiple={false}
              selectType="file"
              fileExtensionIsExist={false}
              {...yakitFormDraggerProps}
            />
          </>
        )

      default:
        break
    }
  })

  useEffect(() => {
    if (extra.hint) {
      setToken(randomString(40))
      form.resetFields()
    }
    // 关闭时重置所有数据
    return () => {
      if (extra.hint) {
        onCancelStream()
        submittingRef.current = false
        setShowProgressStream(false)
        setProgressStream({ Progress: 0, Verbose: '' })
        importExportStreamRef.current = { Progress: 0, Verbose: '' }
        exportPath.current = ''
        clearInterval(timeRef.current)
      }
    }
  }, [extra.hint])

  return (
    <>
      <YakitModal
        getContainer={getContainer}
        type="white"
        width={ImportExportModalSize[extra.type].width}
        centered={true}
        keyboard={false}
        maskClosable={false}
        open={extra.hint}
        title={extra.title}
        bodyStyle={{ padding: 0 }}
        onCancel={() => {
          onCancelStream()
          onCancel()
        }}
        footerStyle={{ justifyContent: 'flex-end' }}
        footer={
          <>
            {!showProgressStream ? (
              <>
                {extra.type === 'export' && (
                  <YakitButton type={'outline2'} onClick={onCancel} style={{ marginRight: 8 }}>
                    取消
                  </YakitButton>
                )}
                <YakitButton onClick={onSubmit}>{extra.type === 'import' ? '导入' : '确定'}</YakitButton>
              </>
            ) : (
              <YakitButton
                type={'outline2'}
                onClick={() => {
                  onCancelStream()
                  onCancel()
                }}
              >
                取消
              </YakitButton>
            )}
          </>
        }
      >
        {!showProgressStream ? (
          <div className={styles['import-export-modal']}>
            {exportDescribeMemoizedFn(extra.type)}
            <Form
              form={form}
              layout={'horizontal'}
              labelCol={{ span: ImportExportModalSize[extra.type].labelCol }}
              wrapperCol={{ span: ImportExportModalSize[extra.type].wrapperCol }}
              onSubmitCapture={(e) => {
                e.preventDefault()
              }}
            >
              {exportItemMemoizedFn(extra.type)}
              <Form.Item label={'密码'} name={'Password'}>
                <YakitInput />
              </Form.Item>
            </Form>
          </div>
        ) : (
          <div style={{ padding: '0 16px' }}>
            <ImportAndExportStatusInfo
              title={extra.type === 'export' ? '导出中' : '导入中'}
              showDownloadDetail={false}
              streamData={progressStream || { Progress: 0 }}
              logListInfo={[]}
            />
          </div>
        )}
      </YakitModal>
    </>
  )
}
const ImportExportModal = memo(<T extends ExportFilter>(props: ImportExportModalComProps<T>) => (
  <ImportExportModalInner {...props} />
)) as <T extends ExportFilter>(props: ImportExportModalComProps<T>) => JSX.Element

export default ImportExportModal
