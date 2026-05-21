import React, { forwardRef, memo, useImperativeHandle, useRef, useState } from 'react'
import { Form } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { cloneDeep } from 'lodash'
import { shallow } from 'zustand/shallow'
import ImportExportModal, { ImportExportModalExtra } from '@/components/ImportExportModal/ImportExportModal'
import { LogListInfo } from '@/components/YakitUploadModal/YakitUploadModal'
import { YakitFormDragger } from '@/components/yakitUI/YakitForm/YakitForm'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { openABSFileLocated } from '@/utils/openWebsite'
import { yakitNotify } from '@/utils/notification'
import { usePageInfo } from '@/store/pageInfo'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { defaultExportAIToolRequest } from '../defaultConstant'
import {
  ExportAIToolFormValues,
  ExportAIToolRequest,
  ExportImportAIToolProgress,
  ImportAIToolFormValues,
  ImportAIToolRequest,
} from '../type/aiTool'

const { ipcRenderer } = window.require('electron')

export interface BatchExportAIToolRef {
  open: (params: Partial<ExportAIToolRequest>) => void
}

export interface BatchExportAIToolProps {}

export interface ImportAIToolRef {
  open: () => void
}

export interface ImportAIToolProps {
  onSuccess?: () => void
}

export const BatchExportAITool = memo(
  forwardRef<BatchExportAIToolRef, BatchExportAIToolProps>((props, ref) => {
    const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
    const currentRouteKey = usePageInfo((state) => state.getCurrentPageTabRouteKey(), shallow)

    const [exportExtra, setExportExtra] = useState<ImportExportModalExtra>({
      hint: false,
      title: t('AIToolList.exportTool'),
      type: 'export',
      apiKey: 'ExportAITool',
    })
    const logListRef = useRef<LogListInfo[]>([])
    const toolExtraParams = useRef<ExportAIToolRequest>(cloneDeep(defaultExportAIToolRequest))
    const exportPath = useRef<string>('')

    useImperativeHandle(
      ref,
      () => ({
        open: (params: Partial<ExportAIToolRequest>) => {
          toolExtraParams.current = {
            ...cloneDeep(defaultExportAIToolRequest),
            ...params,
          }
          setExportExtra((prev) => ({ ...prev, hint: true }))
        },
      }),
      [],
    )

    const handleFinishedExportHint = useMemoizedFn((result: boolean) => {
      if (result) {
        if (exportPath.current) {
          openABSFileLocated(exportPath.current)
        }
        yakitNotify('success', t('YakitNotification.exportSuccess'))
      }
      exportPath.current = ''

      const index = logListRef.current.findIndex((i) => i.isError)
      if (index === -1) {
        setExportExtra((prev) => ({ ...prev, hint: false }))
      }
      logListRef.current = []
    })

    if (!exportExtra.hint) return null

    return (
      <ImportExportModal<ExportAIToolFormValues, ExportAIToolRequest, ExportImportAIToolProgress>
        getContainer={document.getElementById(`main-operator-page-body-${currentRouteKey}`) || undefined}
        extra={exportExtra}
        getProgressValue={(p: ExportImportAIToolProgress) => p.Percent / 100}
        getlogListInfo={(stream: ExportImportAIToolProgress[]) => {
          logListRef.current = stream.map((item) => ({
            message: item.Message,
            isError: item.MessageType === 'error',
            key: Math.random() * 5 + '',
          }))
          return logListRef.current
        }}
        onFinished={handleFinishedExportHint}
        formProps={{
          initialValues: {
            OutputName: toolExtraParams.current?.OutputName || '',
          },
        }}
        renderForm={() => (
          <>
            <Form.Item label={t('AIToolList.fileName')} name="OutputName" rules={[{ required: true }]}>
              <YakitInput />
            </Form.Item>
            <Form.Item label={t('AIToolList.password')} name="Password">
              <YakitInput />
            </Form.Item>
          </>
        )}
        onBeforeSubmit={async (values) => {
          let name = values.OutputName + '.zip'
          if (values.Password) name += '.enc'
          try {
            exportPath.current = await ipcRenderer.invoke('GenerateProjectsFilePath', name)
          } catch (error) {}
        }}
        onSubmitForm={(values) => ({
          ...toolExtraParams.current,
          ...values,
          TargetPath: exportPath.current,
        })}
        isProgressFinished={(p: ExportImportAIToolProgress) => p.Percent === 100 && p.MessageType === 'success'}
      />
    )
  }),
)

export const ImportAIToolModal = memo(
  forwardRef<ImportAIToolRef, ImportAIToolProps>((props, ref) => {
    const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
    const currentRouteKey = usePageInfo((state) => state.getCurrentPageTabRouteKey(), shallow)

    const [importExtra, setImportExtra] = useState<ImportExportModalExtra>({
      hint: false,
      title: t('AIToolList.importTool'),
      type: 'import',
      apiKey: 'ImportAITool',
    })
    const logListRef = useRef<LogListInfo[]>([])

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setImportExtra((prev) => ({ ...prev, hint: true }))
        },
      }),
      [],
    )

    const handleFinishedImportHint = useMemoizedFn((result: boolean) => {
      if (result) {
        props.onSuccess?.()
        yakitNotify('success', t('YakitNotification.imported'))
      }

      const index = logListRef.current.findIndex((i) => i.isError)
      if (index === -1) {
        setImportExtra((prev) => ({ ...prev, hint: false }))
      }
      logListRef.current = []
    })

    if (!importExtra.hint) return null

    return (
      <ImportExportModal<ImportAIToolFormValues, ImportAIToolRequest, ExportImportAIToolProgress>
        getContainer={document.getElementById(`main-operator-page-body-${currentRouteKey}`) || undefined}
        extra={importExtra}
        getProgressValue={(p: ExportImportAIToolProgress) => p.Percent / 100}
        getlogListInfo={(stream: ExportImportAIToolProgress[]) => {
          logListRef.current = stream.map((item) => ({
            message: item.Message,
            isError: item.MessageType === 'error',
            key: Math.random() * 5 + '',
          }))
          return logListRef.current
        }}
        onFinished={handleFinishedImportHint}
        renderForm={() => (
          <>
            <YakitFormDragger
              formItemProps={{
                name: 'InputPath',
                label: t('AIToolList.localPath'),
                rules: [{ required: true, message: t('AIToolList.enterLocalPath') }],
              }}
              multiple={false}
              selectType={importExtra?.apiKey === 'ImportAITool' ? 'all' : 'file'}
              fileExtensionIsExist={false}
            />
            <Form.Item label={t('AIToolList.password')} name="Password">
              <YakitInput />
            </Form.Item>
          </>
        )}
        onSubmitForm={(values) => ({
          Overwrite: true,
          ...values,
        })}
        isProgressFinished={(p: ExportImportAIToolProgress) => p.Percent === 100}
      />
    )
  }),
)
