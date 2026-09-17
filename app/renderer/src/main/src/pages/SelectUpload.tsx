import { projectsForUI } from '@/pages/softwareSettings/projectUtils'
import { ipc } from '@/services/ipc'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Form, Progress } from 'antd'
import { useMemoizedFn, useGetState } from 'ahooks'
import { failed, success, warn } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import type { FileProjectInfoProps, ProjectIOProgress, ProjectsResponse } from './softwareSettings/ProjectManage'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import YakitCascader from '@/components/yakitUI/YakitCascader/YakitCascader'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export interface SelectUploadProps {
  onCancel: () => void
}

interface CascaderValueProps {
  Id: number | string
  DatabasePath: string
}

const layout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 16 },
}

const SelectUpload: React.FC<SelectUploadProps> = (props) => {
  const { t } = useI18nNamespaces(['core', 'yakitUi'])
  const { onCancel } = props
  const [loading, setLoading] = useState<boolean>(false)
  const operation = useRef<AbortController>()
  const [form] = Form.useForm()
  const [percent, setPercent] = useState<number>(0.0)
  const filePath = useRef<string>()
  const [cascaderValue, setCascaderValue] = useState<CascaderValueProps>()

  const [data, setData, getData] = useGetState<FileProjectInfoProps[]>([])

  const onFinish = useMemoizedFn(async () => {
    if (!cascaderValue) return
    operation.current?.abort()
    const controller = new AbortController()
    operation.current = controller
    setLoading(true)
    setPercent(0)
    try {
      const targetPath = await new Promise<string>((resolve, reject) => {
        let output = ''
        const abort = () => reject(controller.signal.reason)
        controller.signal.addEventListener('abort', abort, { once: true })
        ipc
          .openStream(
            'grpc',
            'ExportProject',
            { Id: cascaderValue.Id, Password: '' },
            {
              signal: controller.signal,
              onData(data) {
                if (controller.signal.aborted) return
                if (data.TargetPath) output = data.TargetPath
                if (data.Percent > 0) setPercent(data.Percent * 0.5)
              },
              onError: reject,
              onEnd() {
                if (output) resolve(output)
                else reject(new Error('项目导出没有返回文件路径'))
              },
            },
          )
          .catch(reject)
      })
      controller.signal.throwIfAborted()
      setPercent(0.51)
      const { TaskStatus } = await ipc.invoke(
        'local',
        'split-upload',
        {
          url: 'fragment/upload',
          path: targetPath,
          type: 'Project',
        },
        {
          signal: controller.signal,
          onProgress({ progress }) {
            if (!controller.signal.aborted) setPercent(Math.min(99, Math.max(1, progress)) / 200 + 0.5)
          },
        },
      )
      if (controller.signal.aborted) return
      if (!TaskStatus) throw new Error(t('SelectUpload.uploadFailed'))
      setPercent(1)
      success(t('SelectUpload.uploadSuccess'))
      onCancel()
    } catch (error) {
      if (!controller.signal.aborted) failed(`${t('SelectUpload.uploadFailed')}:${error}`)
    } finally {
      if (operation.current === controller && !controller.signal.aborted) {
        operation.current = undefined
        setLoading(false)
      }
    }
  })
  const cancleUpload = () => {
    operation.current?.abort()
    setLoading(false)
    setPercent(0)
    warn(t('SelectUpload.cancelSuccess'))
  }
  useEffect(() => () => operation.current?.abort(), [])

  const fetchChildNode = useMemoizedFn((selectedOptions: FileProjectInfoProps[]) => {
    const targetOption = selectedOptions[selectedOptions.length - 1]
    targetOption.loading = true
    ipc
      .invoke('grpc', 'GetProjects', {
        FolderId: targetOption.Id,
        Pagination: { Page: 1, Limit: 1000, Order: 'desc', OrderBy: 'updated_at' },
      })
      .then(projectsForUI)
      .then((rsp) => {
        try {
          setTimeout(() => {
            if (rsp.Projects.length === 0) {
              targetOption.children = [] // 为空数组
            } else {
              targetOption.children = [...rsp.Projects].map((item) => {
                const info: FileProjectInfoProps = { ...item }
                if (info.Type === 'file') {
                  info.isLeaf = false
                } else {
                  info.isLeaf = true
                }
                return info
              })
            }
            targetOption.loading = false
            setData([...getData()])
          }, 300)
        } catch (e) {
          failed(t('SelectUpload.processDataFailed', { error: String(e) }))
        }
      })
      .catch((e) => {
        failed(t('SelectUpload.queryProjectsFailed', { error: String(e) }))
      })
  })

  const fetchFirstList = useMemoizedFn(() => {
    const param = {
      Pagination: { Page: 1, Limit: 1000, Order: 'desc', OrderBy: 'updated_at' },
    }

    ipc
      .invoke('grpc', 'GetProjects', param)
      .then(projectsForUI)
      .then((rsp) => {
        try {
          setData(
            rsp.Projects.map((item) => {
              const info: FileProjectInfoProps = { ...item }
              if (info.Type === 'file') {
                info.isLeaf = false
              } else {
                info.isLeaf = true
              }
              return info
            }),
          )
        } catch (e) {
          failed(t('SelectUpload.processDataFailed', { error: String(e) }))
        }
      })
      .catch((e) => {
        failed(t('SelectUpload.queryProjectsFailed', { error: String(e) }))
      })
  })

  useEffect(() => {
    fetchFirstList()
  }, [])

  return (
    <Form {...layout} form={form} onFinish={onFinish}>
      <Form.Item
        name="name"
        label={t('SelectUpload.project')}
        rules={[{ required: true, message: t('YakitForm.requiredField') }]}
      >
        <YakitCascader
          disabled={loading}
          options={data}
          placeholder={t('SelectUpload.selectProject')}
          fieldNames={{ label: 'ProjectName', value: 'Id', children: 'children' }}
          loadData={(selectedOptions) => fetchChildNode(selectedOptions as any)}
          showCheckedStrategy="SHOW_CHILD"
          onChange={(value, selectedOptions) => {
            if (selectedOptions.length > 0 && selectedOptions[selectedOptions.length - 1].Type === 'project') {
              const item = selectedOptions[selectedOptions.length - 1]
              setCascaderValue({ Id: item.Id, DatabasePath: item.DatabasePath })
            }
          }}
          suffixIcon={<ChevronDownOutlined style={{ color: 'var(--Colors-Use-Neutral-Text-1-Title)' }} />}
        />
      </Form.Item>
      {percent > 0 && (
        <div style={{ width: 276, margin: '0 auto', paddingBottom: 14 }}>
          <Progress
            strokeColor="var(--Colors-Use-Main-Primary)"
            trailColor="var(--Colors-Use-Neutral-Bg)"
            percent={Math.floor((percent || 0) * 100)}
          />
        </div>
      )}
      <div style={{ textAlign: 'center' }}>
        {loading ? (
          <YakitButton style={{ width: 200 }} type="primary" onClick={cancleUpload}>
            {t('YakitButton.cancel')}
          </YakitButton>
        ) : (
          <YakitButton style={{ width: 200 }} type="primary" htmlType="submit">
            {t('YakitButton.ok')}
          </YakitButton>
        )}
      </div>
    </Form>
  )
}

export default SelectUpload
