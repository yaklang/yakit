import React, { useEffect } from 'react'
import { Form } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { EditTagsModalProps } from '../HTTPFlowTable.constants'

const EditTagsModal = React.memo<EditTagsModalProps>((props) => {
  const { visible, editTagsInfo, onCancel, onOk } = props
  const { t, i18n } = useI18nNamespaces(['yakitUi', 'history'])
  const [form] = Form.useForm()

  useEffect(() => {
    if (editTagsInfo) {
      const tagsStr = editTagsInfo.Tags?.filter((tag) => !tag.startsWith('YAKIT_')).join(',') || ''
      form.setFieldsValue({ tags: tagsStr })
    }
  }, [editTagsInfo])

  const handleOk = useMemoizedFn(() => {
    form.validateFields().then((res) => {
      if (editTagsInfo) {
        const { tags } = res
        const formTags = tags.split(',')
        const colorTags = editTagsInfo.Tags.filter((item) => item.startsWith('YAKIT_'))
        const existedTags = [...new Set([...formTags, ...colorTags])].filter((item) => item)
        onOk({
          Id: editTagsInfo.Id,
          Hash: editTagsInfo.Hash,
          Tags: existedTags,
        })
      }

      onCancel()
    })
  })

  return (
    <YakitModal
      open={visible}
      title={t('EditTagsModal.editTag')}
      width={600}
      destroyOnHidden={true}
      maskClosable={false}
      okText={t('YakitButton.save')}
      onCancel={onCancel}
      onOk={handleOk}
    >
      <Form form={form} colon={false} labelCol={{ span: 3 }} wrapperCol={{ span: 21 }}>
        <Form.Item label="Tag" name="tags">
          <YakitInput.TextArea placeholder={t('EditTagsModal.multipleTagsComma')} rows={5}></YakitInput.TextArea>
        </Form.Item>
      </Form>
    </YakitModal>
  )
})

EditTagsModal.displayName = 'EditTagsModal'

export default EditTagsModal
