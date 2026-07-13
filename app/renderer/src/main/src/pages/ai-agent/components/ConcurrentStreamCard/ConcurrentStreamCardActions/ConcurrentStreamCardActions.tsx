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
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { ReActChatElement, ReActChatTaskElementSub } from '@/pages/ai-re-act/hooks/aiRender'

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
  taskId?: string | null
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
  taskId,
  token,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])

  const store = useCurrentStore()
  const session = useCurrentSessionId()
  const rawData = useCurrentRawData()
  const chatType = useCreation(() => {
    if (!rawData) return
    const itemData = rawData.contents.get(token)
    if (!itemData) return
    return itemData.chatType
  }, [])

  const getKind = useMemoizedFn((childToken) => {
    const state = store.getState()
    if (state.items[childToken]) return 'item'
    if (state.groups[childToken]) return 'group'
    return null
  })

  // TODO - 待优化
  const openChildWindow = useMemoizedFn((e) => {
    e?.stopPropagation()
    if (!chatType) return
    const elements: ReActChatTaskElementSub[] = []
    const childrenTokens = store.getState().tasks[token]?.childrenTokens || []

    const length = childrenTokens.length

    const getItem = (tokenList) => {
      const items: ReActChatElement[] = []
      for (const token in tokenList) {
        const childData = rawData.contents.get(token)
        if (!childData) continue
        const item: ReActChatElement = {
          kind: 'item',
          token,
          type: childData?.type,
          chatType: childData?.chatType,
          renderNum: store.getState().tasks[token]?.renderNum,
        }
        items.push(item)
      }
      return items
    }
    for (let index = 0; index < length; index++) {
      const childToken = childrenTokens[index]
      const kind = getKind(childToken)
      if (!kind) continue
      const childData = rawData.contents.get(childToken)

      if (!childData) continue
      switch (kind) {
        case 'group':
          const groupItem: ReActChatTaskElementSub = {
            kind: 'group',
            token: childToken,
            type: childData?.type,
            chatType: childData?.chatType,
            children: getItem(store.getState().groups[token]?.childrenTokens),
            renderNum: store.getState().tasks[childToken]?.renderNum,
          }
          elements.push(groupItem)
          break
        case 'item':
          const item: ReActChatTaskElementSub = {
            kind: 'item',
            token: childToken,
            type: childData?.type,
            chatType: childData?.chatType,
            renderNum: store.getState().tasks[childToken]?.renderNum,
          }
          elements.push(item)
          break
        default:
          break
      }
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
      {showContinueTask && coordinatorId != null && !!taskId && (
        <AIHistoryContinueTask coordinatorId={coordinatorId} taskId={taskId} />
      )}
      {showCancelTask && !!taskId && <AIHistorySkipTask taskId={taskId} isTask={chatType === 'task'} />}
      {showDetails && (
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
