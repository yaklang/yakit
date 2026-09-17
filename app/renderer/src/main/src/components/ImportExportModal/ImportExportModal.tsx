import { ipc, type GrpcApiOfKind, type GrpcInput, type GrpcOutput } from '@/services/ipc'
import { memo, useEffect, useMemo, useRef } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitModal, type YakitModalProp } from '@/components/yakitUI/YakitModal/YakitModal'
import { ImportAndExportStatusInfo, type LogListInfo } from '@/components/YakitUploadModal/YakitUploadModal'
import { yakitNotify } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import { useMemoizedFn, useSafeState } from 'ahooks'
import { Form, type FormInstance, type FormProps } from 'antd'
import styles from './ImportExportModal.module.scss'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

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

type IsProgressFinished<P> = (progress: P) => boolean
type GetProgressValue<P> = (progress: P) => number

export type ImportExportModalExtra<A extends GrpcApiOfKind<'serverStream'> = GrpcApiOfKind<'serverStream'>> = {
  hint: boolean
} & {
  title: string
  type: 'export' | 'import'
  apiKey: A
}
interface ImportExportModalProps<F, A extends GrpcApiOfKind<'serverStream'>> {
  getContainer?: HTMLElement
  extra: ImportExportModalExtra<A>
  hasDesc?: boolean
  modelProps?: YakitModalProp
  formProps?: FormProps
  renderForm: (form: FormInstance) => React.ReactNode
  onBeforeSubmit?: (values: F) => Promise<void> | void
  onSubmitForm: (values: F) => GrpcInput<A>
  getProgressValue: GetProgressValue<GrpcOutput<A>>
  isProgressFinished: IsProgressFinished<GrpcOutput<A>>
  getlogListInfo?: (stream: GrpcOutput<A>[]) => LogListInfo[]
  onFinished: (result: boolean) => void
}
/**
 * 通用导入导出组件，参考ForgeName组件
 */
const ImportExportModalInner = <F, A extends GrpcApiOfKind<'serverStream'>>(props: ImportExportModalProps<F, A>) => {
  const {
    getContainer,
    extra,
    hasDesc = true,
    modelProps = {},
    formProps = {},
    renderForm,
    onBeforeSubmit,
    onSubmitForm,
    getProgressValue,
    isProgressFinished,
    getlogListInfo,
    onFinished,
  } = props
  const { t, i18nRefresh } = useI18nNamespaces(['components', 'yakitUi'])

  const [form] = Form.useForm<F>()

  const token = useRef('')
  const controllerRef = useRef<AbortController>()
  const submittingRef = useRef(false)
  const [showProgressStream, setShowProgressStream] = useSafeState(false)
  const timeRef = useRef<ReturnType<typeof setTimeout>>()
  const importExportStreamRef = useRef<GrpcOutput<A>[]>([])
  const [progressStream, setProgressStream] = useSafeState<GrpcOutput<A>[]>([])

  const handleReset = useMemoizedFn(() => {
    controllerRef.current?.abort()
    submittingRef.current = false
    clearInterval(timeRef.current)
    token.current = ''
    setShowProgressStream(false)
    timeRef.current = undefined
    importExportStreamRef.current = []
    setProgressStream([])
  })

  const onSubmit = useMemoizedFn(async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    const controller = new AbortController()
    controllerRef.current = controller
    const flush = () => setProgressStream([...importExportStreamRef.current])
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      clearInterval(timeRef.current)
      flush()
      yakitNotify('error', `[${extra.apiKey}] error: ${error}`)
    }
    try {
      const values = await form.validateFields()
      await onBeforeSubmit?.(values)
      if (controller.signal.aborted) return
      const params = onSubmitForm(values)
      token.current = randomString(40)
      setShowProgressStream(true)
      timeRef.current = setInterval(flush, 500)
      await ipc.openStream('grpc', extra.apiKey, params, {
        token: token.current,
        signal: controller.signal,
        onData(data) {
          if (!controller.signal.aborted) importExportStreamRef.current.unshift(data)
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

  useEffect(() => {
    if (progressStream.length && isProgressFinished(progressStream[0])) {
      onFinished(true)
    }
  }, [progressStream.length])
  const streamData = useMemo(() => {
    return {
      Progress: progressStream.length ? getProgressValue(progressStream[0]) : 0,
    }
  }, [progressStream.length])
  const logListInfo = useMemo(() => {
    return getlogListInfo?.(progressStream) || []
  }, [progressStream.length])
  const progressTitle = useMemo(() => {
    return extra.type === 'export'
      ? progressStream.length
        ? isProgressFinished(progressStream[0])
          ? t('ImportExportModal.exportDone')
          : t('ImportExportModal.exporting')
        : t('ImportExportModal.exporting')
      : progressStream.length
        ? isProgressFinished(progressStream[0])
          ? t('ImportExportModal.importDone')
          : t('ImportExportModal.importing')
        : t('ImportExportModal.importing')
  }, [extra.type, progressStream.length, i18nRefresh])

  const onCancel = useMemoizedFn(() => {
    onFinished(false)
  })

  // modal header 描述文字
  const exportDescribeMemoizedFn = useMemoizedFn((type) => {
    if (!hasDesc) return null
    switch (type) {
      case 'export':
        return <div className={styles['export-hint']}>{t('ImportExportModal.exportHint')}</div>
      case 'import':
        return <div className={styles['import-hint']}>{t('ImportExportModal.importHint')}</div>

      default:
        break
    }
  })

  useEffect(() => {
    if (extra.hint) {
      handleReset()
      form.resetFields()
    }
    // 关闭时重置所有数据
    return () => {
      if (extra.hint) {
        onCancelStream()
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
        {...modelProps}
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
                    {t('YakitButton.cancel')}
                  </YakitButton>
                )}
                <YakitButton onClick={onSubmit}>
                  {extra.type === 'import' ? t('YakitButton.import') : t('YakitButton.ok')}
                </YakitButton>
              </>
            ) : (
              <YakitButton
                type={'outline2'}
                onClick={() => {
                  onCancelStream()
                  onCancel()
                }}
              >
                {progressStream.length
                  ? isProgressFinished(progressStream[0])
                    ? t('YakitButton.finish')
                    : t('YakitButton.cancel')
                  : t('YakitButton.cancel')}
              </YakitButton>
            )}
          </>
        }
      >
        {!showProgressStream ? (
          <div className={styles['import-export-modal']}>
            <Form
              form={form}
              layout={'horizontal'}
              labelCol={{ span: ImportExportModalSize[extra.type].labelCol }}
              wrapperCol={{ span: ImportExportModalSize[extra.type].wrapperCol }}
              {...formProps}
              onSubmitCapture={(e) => {
                e.preventDefault()
              }}
            >
              {exportDescribeMemoizedFn(extra.type)}
              {renderForm(form)}
            </Form>
          </div>
        ) : (
          <div style={{ padding: '0 16px' }}>
            <ImportAndExportStatusInfo
              title={progressTitle}
              showDownloadDetail={false}
              streamData={streamData}
              logListInfo={logListInfo}
            />
          </div>
        )}
      </YakitModal>
    </>
  )
}
const ImportExportModal = memo(<F, A extends GrpcApiOfKind<'serverStream'>>(props: ImportExportModalProps<F, A>) => (
  <ImportExportModalInner {...props} />
)) as <F, A extends GrpcApiOfKind<'serverStream'>>(props: ImportExportModalProps<F, A>) => JSX.Element

export default ImportExportModal
