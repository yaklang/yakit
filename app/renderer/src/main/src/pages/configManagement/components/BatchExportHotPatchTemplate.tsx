import ImportExportModal, { type ImportExportModalExtra } from '@/components/ImportExportModal/ImportExportModal'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getMainOperatorPageBodyContainerOrBody } from '@/utils/getMainOperatorPageBodyContainer'
import { yakitNotify } from '@/utils/notification'
import { openABSFileLocated } from '@/utils/openWebsite'
import { useMemoizedFn } from 'ahooks'
import { Form } from 'antd'
import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type {
  BatchExportHotPatchTemplateProps,
  BatchExportHotPatchTemplateRef,
  ExportHotPatchFormValues,
  ExportHotPatchTemplateStreamRequest,
} from './type'
import { extractExecResultProgress } from '@/components/yakitLogSchema'
import { cloneDeep } from 'lodash'
import { YakitFormDragger } from '@/components/yakitUI/YakitForm/YakitForm'
import { SystemInfo } from '@/constants/hardware'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import type { ExecResult } from '../../../pages/invoker/schema'
import { getPathJoin } from '@/pages/yakRunner/utils'
const { ipcRenderer } = window.require('electron')

const defaultExportHotPatchRequest: ExportHotPatchTemplateStreamRequest = {
  OutputPluginDir: '',
  OutputFilename: '',
  Password: '',
  Filter: {
    Type: 'global',
    Name: [],
  },
}

export const BatchExportHotPatchTemplate = memo(
  forwardRef<BatchExportHotPatchTemplateRef, BatchExportHotPatchTemplateProps>((props, ref) => {
    const { t } = useI18nNamespaces(['yakitUi', 'webFuzzer'])
    const isRemoteEngine = SystemInfo.mode === 'remote'
    const [showChangePath, setShowChangePath] = useState<boolean>(!isRemoteEngine)
    const [exportExtra, setExportExtra] = useState<ImportExportModalExtra>({
      hint: false,
      title: t('HotPatchTemplateImportExport.export_title'),
      type: 'export',
      apiKey: 'ExportHotPatchTemplateStream',
    })
    const hotPatchExtraParams = useRef<ExportHotPatchTemplateStreamRequest>(cloneDeep(defaultExportHotPatchRequest))
    const exportPath = useRef<string>('')
    const [defaultOutputPluginDir, setDefaultOutputPluginDir] = useState<string>('')

    useImperativeHandle(
      ref,
      () => ({
        open: (params: Partial<ExportHotPatchTemplateStreamRequest>) => {
          hotPatchExtraParams.current = {
            ...cloneDeep(defaultExportHotPatchRequest),
            ...params,
          }
          setExportExtra((prev) => ({ ...prev, hint: true }))
        },
      }),
      [],
    )

    useEffect(() => {
      if (!isRemoteEngine) {
        ipcRenderer.invoke('GetProjectsFilePath').then((path) => {
          hotPatchExtraParams.current = {
            ...hotPatchExtraParams.current,
            OutputPluginDir: path,
          }
          setDefaultOutputPluginDir(path)
        })
      }
    }, [isRemoteEngine])

    const handleFinishedExportHint = useMemoizedFn((result: boolean) => {
      if (result) {
        if (exportPath.current) {
          openABSFileLocated(exportPath.current)
        }
        yakitNotify('success', t('YakitNotification.exportSuccess'))
      }
      exportPath.current = ''
      setExportExtra((prev) => ({ ...prev, hint: false }))
    })

    if (!exportExtra.hint) return null

    return (
      <ImportExportModal<ExportHotPatchFormValues, ExportHotPatchTemplateStreamRequest, ExecResult>
        getContainer={getMainOperatorPageBodyContainerOrBody()}
        extra={exportExtra}
        hasDesc={isRemoteEngine}
        getProgressValue={(p: ExecResult) => {
          return (
            extractExecResultProgress(p, {
              page: 'BatchExportHotPatchTemplate',
              fun: 'ExportHotPatchTemplateStream',
            })?.value || 0
          )
        }}
        isProgressFinished={(p: ExecResult) => {
          return (
            extractExecResultProgress(p, {
              page: 'BatchExportHotPatchTemplate',
              fun: 'ExportHotPatchTemplateStream',
            })?.finished || false
          )
        }}
        onFinished={handleFinishedExportHint}
        formProps={{
          initialValues: {
            OutputPluginDir: defaultOutputPluginDir || '',
            OutputFilename: hotPatchExtraParams.current.OutputFilename || '',
            Password: '',
          },
        }}
        renderForm={() => (
          <>
            {showChangePath && (
              <YakitFormDragger
                formItemProps={{
                  name: 'OutputPluginDir',
                  label: t('HotPatchTemplateImportExport.export_path'),
                  rules: [
                    { required: !isRemoteEngine, message: t('HotPatchTemplateImportExport.export_path_placeholder') },
                  ],
                }}
                multiple={false}
                selectType="folder"
                help={
                  isRemoteEngine
                    ? t('HotPatchTemplateImportExport.export_path_help_remote')
                    : t('HotPatchTemplateImportExport.export_path_help_local')
                }
                uploadFolderText={t('HotPatchTemplateImportExport.select_folder')}
                showUploadBtn={!isRemoteEngine}
              />
            )}
            <Form.Item
              label={t('HotPatchTemplateImportExport.filename')}
              name="OutputFilename"
              rules={[{ required: true, message: t('HotPatchTemplateImportExport.filename_placeholder') }]}
            >
              <YakitInput />
            </Form.Item>
            <Form.Item label={t('HotPatchTemplateImportExport.password')} name="Password">
              <YakitInput />
            </Form.Item>
          </>
        )}
        descExtra={
          <YakitButton
            type="text"
            onClick={() => {
              setShowChangePath(true)
            }}
          >
            {t('HotPatchTemplateImportExport.change_path')}
          </YakitButton>
        }
        onBeforeSubmit={async (values) => {
          let name = values.OutputFilename + '.zip'
          if (values.Password) name += '.enc'
          try {
            exportPath.current = await getPathJoin(values.OutputPluginDir, name)
          } catch (error) {}
        }}
        onSubmitForm={(values) => ({
          ...hotPatchExtraParams.current,
          ...values,
        })}
      />
    )
  }),
)
