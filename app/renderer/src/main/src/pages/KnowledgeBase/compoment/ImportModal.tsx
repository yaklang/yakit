import { ipc } from '@/services/ipc'
import { useMemoizedFn, useRequest, useSafeState } from 'ahooks'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { failed, success } from '@/utils/notification'
import { Form, Progress } from 'antd'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import styles from '../knowledgeBase.module.scss'
import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react'
import { YakitFormDragger } from '@/components/yakitUI/YakitForm/YakitForm'
import type { KnowledgeBaseContentProps } from '../TKnowledgeBase'
import { type KnowledgeBaseItem, useKnowledgeBase } from '../hooks/useKnowledgeBase'
import { extractFileName, ValidatorFilePath, mergeKnowledgeBaseList } from '../utils'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { randomString } from '@/utils/randomUtil'

interface GeneralProgress {
  Percent: number
  Message: string
  MessageType: string
}

interface TImportModalProps {
  visible: boolean
  onVisible: (visible: boolean) => void
  setAddMode: Dispatch<SetStateAction<string[]>>
}

const ImportModal: React.FC<TImportModalProps> = (props) => {
  const { visible, onVisible, setAddMode } = props
  const [form] = Form.useForm()
  const [importLoading, setImportLoading] = useSafeState(false)
  const [progress, setProgress] = useSafeState<GeneralProgress>({
    Percent: 0,
    Message: '',
    MessageType: '',
  })
  const [token, setToken] = useSafeState<string>('')
  const [hasError, setHasError, getHasError] = useGetSetState(false)
  const controllerRef = useRef<AbortController>()
  useEffect(() => () => controllerRef.current?.abort(), [visible])
  const knowledgeBaseNameRef = useRef<string>('')
  const { addKnowledgeBase, knowledgeBases } = useKnowledgeBase()

  useEffect(() => {
    if (visible) {
      const newToken = `import-kb-${randomString(50)}`
      setToken(newToken)
      setHasError(false)
    }
  }, [visible])

  const { runAsync: existsKnowledgeBaseAsync } = useRequest(
    async () => {
      const result: KnowledgeBaseContentProps = await ipc.invoke('grpc', 'GetKnowledgeBase', {
        Pagination: { Limit: 9999 },
      })
      const { KnowledgeBases } = result
      return KnowledgeBases
    },
    {
      manual: true,
      onError: (error) => {
        failed(`获取知识库列表失败: ${error}`)
      },
      onSuccess: (value) => {
        if (value) {
          const importKnowledgeItem = value.find((item) => item.KnowledgeBaseName === knowledgeBaseNameRef.current)
          if (importKnowledgeItem) {
            addKnowledgeBase({
              ...mergeKnowledgeBaseList([importKnowledgeItem], [])[0],
              addManuallyItem: false,
              historyGenerateKnowledgeList: [],
              streamstep: 'success',
            })
          }
        }
      },
    },
  )

  const handleImport = useMemoizedFn(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      if (error && typeof error === 'object' && 'errorFields' in error) return
      setImportLoading(false)
      setHasError(true)
      failed(`${error}`)
    }
    try {
      const values = await form.validateFields()
      if (controller.signal.aborted) return
      setHasError(false)
      setImportLoading(true)
      setProgress({ Percent: 0, Message: '开始导入...', MessageType: 'info' })
      const name =
        values.knowledgeBaseName ||
        values.importPath.substring(values.importPath.lastIndexOf('/') + 1, values.importPath.lastIndexOf('.'))
      knowledgeBaseNameRef.current = name
      await ipc.openStream(
        'grpc',
        'ImportKnowledgeBase',
        { NewKnowledgeBaseName: name, InputPath: values.importPath },
        {
          token,
          signal: controller.signal,
          onData(data) {
            if (!controller.signal.aborted) setProgress(data)
          },
          onError,
          async onEnd() {
            if (controller.signal.aborted) return
            try {
              setImportLoading(false)
              success('导入知识库成功')
              await existsKnowledgeBaseAsync()
              if (controller.signal.aborted) return
              onVisible(false)
              form.resetFields()
              setAddMode((it) => [...it, 'external'])
              setProgress({ Percent: 0, Message: '', MessageType: '' })
            } catch (error) {
              onError(error)
            }
          },
        },
      )
    } catch (error) {
      onError(error)
    }
  })

  const handleCancel = useMemoizedFn(() => {
    controllerRef.current?.abort()
    onVisible(false)
    form.resetFields()
    setProgress({ Percent: 0, Message: '', MessageType: '' })
    setImportLoading(false)
    setHasError(false)
  })

  return (
    <YakitModal
      title="导入知识库"
      open={visible}
      onCancel={handleCancel}
      width={600}
      destroyOnHidden
      bodyStyle={{ padding: 0 }}
      maskClosable={!importLoading}
      className={styles['knowledge-import-export-modal']}
      footer={[
        <div className={styles['knowledge-base-modal-footer']} key="footer">
          <YakitButton type="outline1" onClick={handleCancel}>
            {importLoading ? '取消导入' : '取消'}
          </YakitButton>
          <YakitButton type="primary" loading={importLoading} onClick={handleImport} disabled={importLoading}>
            导入并创建
          </YakitButton>
        </div>,
      ]}
    >
      <div className={styles['import-hint']}>
        只可导入从知识库里导出的rag文件，导入文件暂不支持修改。导入外部资源存在潜在风险，可能会被植入恶意代码或Payload，造成数据泄露、系统被入侵等严重后果。请务必谨慎考虑引入外部资源的必要性，并确保资源来源可信、内容安全。
      </div>
      <Form
        form={form}
        layout="vertical"
        className={styles['import-form']}
        onValuesChange={(changedValues) => {
          if (changedValues.importPath) {
            const fileName = extractFileName(changedValues.importPath)
            form.setFieldsValue({ knowledgeBaseName: fileName })
          }
        }}
      >
        <YakitFormDragger
          formItemProps={{
            label: '导入文件路径',
            name: 'importPath',
            rules: [
              {
                validator: ValidatorFilePath,
              },
            ],
          }}
          multiple={false}
          size="large"
          help="可将文件拖入框内或"
          selectType="file"
          disabled={importLoading}
          fileExtensionIsExist={false}
        />

        <Form.Item
          label="新知识库名称"
          name="knowledgeBaseName"
          rules={[
            { required: true, message: '该项为必填' },
            {
              validator(_, value) {
                const findKnowledgeIdx = knowledgeBases.findIndex((it) => it.KnowledgeBaseName === value)
                if (findKnowledgeIdx === 0) {
                  return Promise.reject('知识库名称重复，请重新输入')
                }
                return Promise.resolve()
              },
            },
          ]}
        >
          <YakitInput placeholder="请输入新知识库名称" disabled={importLoading} />
        </Form.Item>

        {importLoading && (
          <div style={{ marginTop: 16 }}>
            <Progress
              percent={Math.round(progress.Percent * 100)}
              status={progress.MessageType === 'error' ? 'exception' : 'active'}
            />
            {progress.Message && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: 'var(--Colors-Use-Neutral-Text-1-Title)',
                }}
              >
                {progress.Message}
              </div>
            )}
          </div>
        )}
      </Form>
    </YakitModal>
  )
}

export { ImportModal }
