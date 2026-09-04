import { memo, useState } from 'react'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { HorizontalScrollCard } from '@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard'
import { useStore } from 'zustand'
import classNames from 'classnames'
import styles from './AIHorizontalScrollCard.module.scss'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import {
  FigmaIcon2017756Outlined,
  FlagOutlined,
  MessageCirclePlusOutlined,
  NewspaperOutlined,
  ScrollTextOutlined,
  Settings2Outlined,
  TimelineOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { ChatAlt2Solid } from '@yakit-libs/yakit-ui-icons/solid'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { ExpandAndRetract } from '@/pages/plugins/operator/expandAndRetract/ExpandAndRetract'
import AIContextToken from '../AIContextToken/AIContextToken'
import useAIAgentStore from '../../useContext/useStore'
import useAIAgentDispatcher from '../../useContext/useDispatcher'
import useAiChatLog from '@/hook/useAiChatLog/useAiChatLog.ts'
import { ExportAILogsModal } from '../../components/ExportAILogsModal/ExportAILogsModal'
import { failed, yakitNotify } from '@/utils/notification'
import { grpcExportAILogs } from '../../grpc'
import { useMemoizedFn } from 'ahooks'
import ContextDetailPopover from '../AIContextToken/ContextDetailPopover'
import { useMultiFuncPaneStore } from '../../aiAgentChat/useMultiFuncPaneStore'
import { onNewChat } from '../../historyChat/HistoryChat'
import { AISourceEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { useCasualTaskTab } from '../hooks/useCasualTaskTab'
import { useHasTaskTree } from '../../chatTemplate/historyTaskTree/useHasTaskTree'
import { Tooltip } from 'antd'

export const AIHorizontalScrollCard = memo(() => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const [isExpand, setIsExpand] = useState<boolean>(true)

  const [exportModalVisible, setExportModalVisible] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const { activeChat } = useAIAgentStore()
  const { getSetting } = useAIAgentDispatcher()
  const { onOpenLogWindow } = useAiChatLog()
  const multiFuncVisible = useMultiFuncPaneStore((state) => state.visible)
  const openMultiFuncWithTab = useMultiFuncPaneStore((state) => state.openWithTab)
  const [dropdownVisible, setDropdownVisible] = useState(false)

  const store = useCurrentStore()
  const yakExecResultCard = useStore(store, (state) => state.card)
  const hasTaskTree = useHasTaskTree()
  const { currentChatStatusQuestionID, syncCasualTaskTab } = useCasualTaskTab()

  const onExpand = useMemoizedFn((e) => {
    e.stopPropagation()
    setIsExpand(!isExpand)
  })

  const onDetails = useMemoizedFn((e) => {
    e.stopPropagation()
    if (!currentChatStatusQuestionID) {
      yakitNotify('error', t('AIHorizontalScrollCard.questionIdMissing'))
      return
    }
    if (getSetting().Source !== AISourceEnum.aiAgent) {
      yakitNotify('info', t('AIHorizontalScrollCard.taskDetailSourceMismatch'))
      return
    }
    syncCasualTaskTab()
  })
  const onOpenExportModal = useMemoizedFn((e?: React.MouseEvent) => {
    e?.stopPropagation()
    setExportModalVisible(true)
  })
  const onMenuClick = useMemoizedFn(({ key }: { key: string }) => {
    setDropdownVisible(false)
    switch (key) {
      case 'task-list':
        if (!hasTaskTree) return
        openMultiFuncWithTab(key)
        break
      case 'timeline':
        openMultiFuncWithTab(key)
        break
      case 'export-log':
        onOpenExportModal()
        break
      case 'view-log':
        onOpenLogWindow()
        break
      default:
        break
    }
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
        <div className={classNames(styles['expand-retract-content'])}>
          <div className={styles['header']}>
            <div className={styles['title']}>
              <ChatAlt2Solid className={styles['chat-alt-icon']} color="currentColor" />
              <div className={styles['chat-title']}>{activeChat?.Title || t('AIChatContent.newChatTitle')}</div>
            </div>
            <div className={styles['extra']}>
              <AIContextToken />
              <ContextDetailPopover />
              <Tooltip title={t('AIChatContent.taskDetail')}>
                <YakitButton
                  hidden={!currentChatStatusQuestionID}
                  type="text2"
                  icon={<ScrollTextOutlined color="currentColor" />}
                  onClick={onDetails}
                />
              </Tooltip>
              <Tooltip title={t('AIChatContent.newChat')}>
                <YakitButton
                  type="text2"
                  icon={<MessageCirclePlusOutlined color="currentColor" />}
                  onClick={onNewChat}
                />
              </Tooltip>
              <YakitDropdownMenu
                menu={{
                  data: [
                    {
                      key: 'task-list',
                      label: t('AIAgentChatTemplate.tasklist'),
                      itemIcon: <FlagOutlined color="currentColor" />,
                      disabled: !hasTaskTree,
                    },
                    {
                      key: 'timeline',
                      label: t('AIAgentChatTemplate.timeline'),
                      itemIcon: <TimelineOutlined color="currentColor" />,
                    },
                    {
                      key: 'export-log',
                      label: t('AIChatContent.exportLog'),
                      itemIcon: <FigmaIcon2017756Outlined color="currentColor" />,
                    },
                    {
                      key: 'view-log',
                      label: t('AIChatContent.log'),
                      itemIcon: <NewspaperOutlined color="currentColor" />,
                    },
                  ],
                  onClick: onMenuClick,
                }}
                dropdown={{
                  trigger: ['click'],
                  placement: 'bottomRight',
                  visible: dropdownVisible,
                  onVisibleChange: setDropdownVisible,
                }}
              >
                <Tooltip title={t('YakitButton.more')}>
                  <YakitButton
                    type="text2"
                    isActive={multiFuncVisible || dropdownVisible}
                    icon={<Settings2Outlined color="currentColor" />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Tooltip>
              </YakitDropdownMenu>
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
