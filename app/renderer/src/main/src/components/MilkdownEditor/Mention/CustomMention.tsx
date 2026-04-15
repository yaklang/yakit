import { useNodeViewContext } from '@prosemirror-adapter/react'
import React, { useState } from 'react'
import styles from './CustomMention.module.scss'
import classNames from 'classnames'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useMemoizedFn } from 'ahooks'
import { API } from '@/services/swagger/resposeType'
import { apiNotepadEit } from './utils'
import { yakitNotify } from '@/utils/notification'
import { getMentionId } from '../utils/mentionPlugin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

interface CustomMentionProps {
  notepadHash: string
}
export const CustomMention: React.FC<CustomMentionProps> = (props) => {
  const { notepadHash } = props
  const { t } = useI18nNamespaces(['components'])
  const { node, setAttrs, selected, contentRef } = useNodeViewContext()
  const [visible, setVisible] = useState<boolean>(false)
  const onSendMessage = useMemoizedFn(() => {
    if (!node.attrs?.userId) {
      yakitNotify('error', t('MilkdownEditor.customMention.userIdMissing'))
      return
    }
    let mentionId = node.attrs?.mentionId
    if (!mentionId) {
      const id = getMentionId()
      setAttrs({ mentionId: id })
      mentionId = id
    }
    const params: API.NotepadEitRequest = {
      eitUser: node.attrs?.userId,
      notepadHash,
      mentionId,
    }
    apiNotepadEit(params).finally(() => setVisible(false))
  })
  return (
    <YakitPopover
      content={
        <div className={styles['mention-custom-popover-title']}>
          {t('MilkdownEditor.customMention.sendMentionPrompt')}
          <YakitButton type="primary" onClick={onSendMessage}>
            {t('MilkdownEditor.customMention.notify')}
          </YakitButton>
        </div>
      }
      visible={visible}
      onVisibleChange={setVisible}
      trigger="click"
      overlayClassName={styles['mention-custom-popover']}
    >
      <div
        className={classNames(styles['mention-custom'], {
          [styles['mention-custom-selected']]: selected,
        })}
        ref={contentRef}
        id={node.attrs?.mentionId}
        contentEditable={false}
      ></div>
    </YakitPopover>
  )
}
