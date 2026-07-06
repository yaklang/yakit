import React, { useState } from 'react'
import { AIHorizontalScrollCardProps } from './type'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { HorizontalScrollCard } from '@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard'
import { useStore } from 'zustand'
import classNames from 'classnames'
import styles from './AIHorizontalScrollCard.module.scss'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { OutlinePlussmIcon, OutlineNewspaperIcon, OutlineClouddownloadIcon } from '@/assets/icon/outline'
import { SolidChatalt2Icon } from '@/assets/icon/solid'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { ExpandAndRetract } from '@/pages/plugins/operator/expandAndRetract/ExpandAndRetract'
import { Divider } from 'antd'
import { onNewChat } from '../../historyChat/HistoryChat'
import AIContextToken from '../AIContextToken/AIContextToken'
import useAIAgentStore from '../../useContext/useStore'
import useAiChatLog from '@/hook/useAiChatLog/useAiChatLog.ts'
import { ExportAILogsModal } from '../../components/ExportAILogsModal/ExportAILogsModal'
import { failed, yakitNotify } from '@/utils/notification'
import { grpcExportAILogs } from '../../grpc'
import useMemoizedFn from 'ahooks/lib/useMemoizedFn'

export const AIHorizontalScrollCard: React.FC<AIHorizontalScrollCardProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const [isExpand, setIsExpand] = useState<boolean>(true)

  const [exportModalVisible, setExportModalVisible] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const { activeChat } = useAIAgentStore()
  const { onOpenLogWindow } = useAiChatLog()

  const store = useCurrentStore()
  const yakExecResultCard = useStore(store, (state) => state.card)

  const onExpand = useMemoizedFn((e) => {
    e.stopPropagation()
    setIsExpand(!isExpand)
  })

  const onOpenLog = useMemoizedFn((e) => {
    e.stopPropagation()
    onOpenLogWindow()
  })
  const onOpenExportModal = useMemoizedFn((e) => {
    e.stopPropagation()
    setExportModalVisible(true)
  })

  const onExportCancel = useMemoizedFn(() => {
    setExportModalVisible(false)
  })

  const onExportOk = useMemoizedFn(async (data: { types: string[]; outputPath: string }) => {
    if (!activeChat?.Id) {
      failed(t('AIChatContent.noActiveChat'))
      return
    }
    setExportLoading(true)
    //
    try {
      await grpcExportAILogs(
        {
          SessionID: activeChat.SessionID,
          ExportDataTypes: data.types,
          OutputPath: data.outputPath,
        },
        true,
      )
      yakitNotify('success', t('YakitNotification.exportSuccess'))
      setExportModalVisible(false)
    } catch (error) {
      failed(t('YakitNotification.exportFailed', { error: error + '' }))
    } finally {
      setExportLoading(false)
    }
  })
  return (
    <>
      <ExpandAndRetract
        isExpand={isExpand}
        onExpand={onExpand}
        className={classNames(styles['expand-retract-wrapper'], {
          [styles['expand-retract-wrapper-collapsed']]: !yakExecResultCard.length,
        })}
        animationWrapperClassName={classNames(styles['expand-retract-animation-wrapper'], {
          [styles['expand-retract-animation-wrapper-hidden']]: !yakExecResultCard.length,
        })}
        expandText={t('YakitButton.expand')}
        retractText={t('YakitButton.collapse')}
      >
        <div className={styles['expand-retract-content']}>
          <div className={styles['header']}>
            <div className={styles['title']}>
              <SolidChatalt2Icon className={styles['chat-alt-icon']} />
              <div className={styles['chat-title']}>{activeChat?.Title || t('AIChatContent.newChatTitle')}</div>
              <Divider type="vertical" />
              <YakitButton type="secondary2" icon={<OutlinePlussmIcon />} onClick={() => onNewChat()}>
                {t('AIChatContent.newChat')}
              </YakitButton>
            </div>
            <div className={styles['extra']}>
              <AIContextToken />
              <YakitButton type="secondary2" icon={<OutlineNewspaperIcon />} onClick={onOpenLog}>
                {t('AIChatContent.log')}
              </YakitButton>
              <YakitButton type="secondary2" icon={<OutlineClouddownloadIcon />} onClick={onOpenExportModal}>
                {t('AIChatContent.exportLog')}
              </YakitButton>
            </div>
          </div>
          {yakExecResultCard.length > 0 ? (
            <HorizontalScrollCard
              hiddenHeard={true}
              data={yakExecResultCard}
              className={classNames(styles['card-list-wrapper'], {
                [styles['card-list-wrapper-hidden']]: !isExpand,
              })}
              itemProps={{ size: 'small' }}
            />
          ) : null}
        </div>
      </ExpandAndRetract>
      <ExportAILogsModal
        visible={exportModalVisible}
        onCancel={onExportCancel}
        onOk={onExportOk}
        loading={exportLoading}
      />
    </>
  )
})
