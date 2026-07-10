import type { FC } from 'react'
import { Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineChevronsDownUpIcon,
  OutlineChevronsUpDownIcon,
  OutlineListOneIcon,
  OutlineListTodoIcon,
  OutlineRefreshIcon,
} from '@/assets/icon/outline'
import { AIHistoryContinueTask, AIHistorySkipTask } from '../../../chatTemplate/historyTaskTree/HistoryTaskTree'
import { openAIConcurrentStream, OpenAIConcurrentStreamPayload } from '@/utils/openWebsite'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from '../ConcurrentStreamCard.module.scss'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useCreation, useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { ReActChatTaskElementSub } from '@/pages/ai-re-act/hooks/aiRender'

/** 卡片标题栏右侧操作区 */
interface ConcurrentStreamCardActionsProps {
  isChildWindow?: boolean
  expand: boolean
  onExpandToggle: () => void
  onRefresh?: () => void
  onDetails?: () => void

  token: string

  showContinueTask: boolean
  showCancelTask: boolean
  showDetails: boolean
  coordinatorId?: string
  taskIndex?: string | null
}

const ConcurrentStreamCardActions: FC<ConcurrentStreamCardActionsProps> = ({
  isChildWindow,
  expand,
  onExpandToggle,
  onRefresh,
  onDetails,
  showContinueTask,
  showCancelTask,
  showDetails,
  coordinatorId,
  taskIndex,
  token,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])

  const store = useCurrentStore()
  const session = useCurrentSessionId()
  const renderNum = useStore(store, (state) => state.tasks[token].renderNum)
  const rawData = useCurrentRawData()
  const chatType = useCreation(() => {
    if (!rawData) return
    const itemData = rawData.contents.get(token)
    if (!itemData) return
    return itemData.chatType
  }, [])

  const itemData = useCreation(() => {
    if (!rawData) return 0
    const data = rawData.contents.get(token)
    if (!data) return 0
    return data
  }, [renderNum])

  const getKind = useMemoizedFn((childToken) => {
    const state = store.getState()
    if (state.items[childToken]) return 'item'
    if (state.groups[childToken]) return 'group'
    return null
  })

  const openChildWindow = useMemoizedFn((e) => {
    e?.stopPropagation()
    if (!chatType) return
    const elements: ReActChatTaskElementSub[] = []
    const childrenTokens = store.getState().tasks[token]?.childrenTokens || []

    const length = childrenTokens.length
    for (let index = 0; index < length; index++) {
      const childToken = childrenTokens[index]
      const kind = getKind(childToken)
      if (!kind) continue
      const childData = rawData.contents.get(childToken)
      // const subItem: ReActChatTaskElementSub = {
      //   ...childData,
      //   kind,
      // }
    }
    const framePayload: OpenAIConcurrentStreamPayload = {
      session,
      token,
      chatType,
      elements,
    }
    openAIConcurrentStream(framePayload)
  })

  if (isChildWindow) {
    return (
      <Tooltip title={t('ConcurrentStreamCard.refresh')}>
        <YakitButton
          size="middle"
          type="text"
          icon={<OutlineRefreshIcon />}
          onClick={onRefresh}
          className={styles['expand-btn']}
        />
      </Tooltip>
    )
  }
  return (
    <>
      {showContinueTask && coordinatorId != null && taskIndex != null && chatType === 'task' && (
        <AIHistoryContinueTask coordinatorId={coordinatorId} taskIndex={taskIndex} />
      )}
      {showCancelTask && taskIndex != null && chatType === 'task' && <AIHistorySkipTask taskIndex={taskIndex} />}
      {showDetails && chatType === 'task' && (
        <Tooltip title="任务详情" placement="top">
          <YakitButton size="small" icon={<OutlineListTodoIcon />} type="text2" onClick={onDetails} />
        </Tooltip>
      )}
      <Tooltip title={t('ConcurrentStreamCard.openInNewWindow')}>
        <YakitButton
          size="small"
          type="text"
          icon={<OutlineListOneIcon />}
          onClick={openChildWindow}
          className={styles['expand-btn']}
        />
      </Tooltip>
      <Tooltip title={expand ? t('ConcurrentStreamCard.collapse') : t('ConcurrentStreamCard.expand')}>
        <YakitButton
          size="small"
          type="text"
          icon={expand ? <OutlineChevronsDownUpIcon /> : <OutlineChevronsUpDownIcon />}
          onClick={(e) => {
            e.stopPropagation()
            onExpandToggle()
          }}
          className={styles['expand-btn']}
        />
      </Tooltip>
    </>
  )
}

export default ConcurrentStreamCardActions
