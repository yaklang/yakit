import ImportExportModal, { type ImportExportModalExtra } from '@/components/ImportExportModal/ImportExportModal'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getMainOperatorPageBodyContainerOrBody } from '@/utils/getMainOperatorPageBodyContainer'
import { yakitNotify } from '@/utils/notification'
import { useMemoizedFn } from 'ahooks'
import { Form } from 'antd'
import { forwardRef, memo, useImperativeHandle, useState } from 'react'
import type {
  BatchImportHotPatchTemplateProps,
  BatchImportHotPatchTemplateRef,
  ImportHotPatchFormValues,
  ImportHotPatchTemplateStreamRequest,
} from './type'
import { extractExecResultProgress } from '@/components/yakitLogSchema'
import { YakitFormDragger } from '@/components/yakitUI/YakitForm/YakitForm'
import type { ExecResult } from '../../../pages/invoker/schema'

export const BatchImportHotPatchTemplate = memo(
  forwardRef<BatchImportHotPatchTemplateRef, BatchImportHotPatchTemplateProps>((props, ref) => {
    const { t } = useI18nNamespaces(['yakitUi'])
    const [importExtra, setImportExtra] = useState<ImportExportModalExtra>({
      hint: false,
      title: '导入热加载模板',
      type: 'import',
      apiKey: 'ImportHotPatchTemplateStream',
    })

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setImportExtra((prev) => ({ ...prev, hint: true }))
        },
      }),
      [],
    )

    const handleFinishedExportHint = useMemoizedFn((result: boolean) => {
      if (result) {
        props.onSuccess?.()
        yakitNotify('success', t('YakitNotification.imported'))
      }
      setImportExtra((prev) => ({ ...prev, hint: false }))
    })

    if (!importExtra.hint) return null

    return (
      <ImportExportModal<ImportHotPatchFormValues, ImportHotPatchTemplateStreamRequest, ExecResult>
        getContainer={getMainOperatorPageBodyContainerOrBody()}
        extra={importExtra}
        importDesc="将读取文件中自带的模板类型进行导入"
        getProgressValue={(p: ExecResult) => {
          return (
            extractExecResultProgress(p, {
              page: 'BatchImportHotPatchTemplate',
              fun: 'ImportHotPatchTemplateStream',
            })?.value || 0
          )
        }}
        isProgressFinished={(p: ExecResult) => {
          return (
            extractExecResultProgress(p, {
              page: 'BatchImportHotPatchTemplate',
              fun: 'ImportHotPatchTemplateStream',
            })?.finished || false
          )
        }}
        onFinished={handleFinishedExportHint}
        renderForm={() => (
          <>
            <YakitFormDragger
              formItemProps={{
                name: 'Filename',
                label: '本地路径',
                rules: [{ required: true, message: '请输入本地路径' }],
              }}
              multiple={false}
              selectType="file"
              fileExtensionIsExist={false}
            />
            <Form.Item label={'密码'} name="Password">
              <YakitInput />
            </Form.Item>
          </>
        )}
        onSubmitForm={(values) => ({
          ...values,
        })}
      />
    )
  }),
)
