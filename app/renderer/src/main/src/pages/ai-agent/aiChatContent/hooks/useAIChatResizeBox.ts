import { YakitResizeBoxProps } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { useCreation } from 'ahooks'
import { useRef, useState } from 'react'
import { AITabsEnumType } from '../../aiAgentType'
import { AITabsEnum } from '../../defaultConstant'
import type { UseTaskChatState } from '@/pages/ai-re-act/hooks/type'

type ResizeBoxProps = Omit<YakitResizeBoxProps, 'firstNode' | 'secondNode'>

type ResizeBoxOverride = Partial<ResizeBoxProps>

interface Params {
  activeKey?: AITabsEnumType
  showFreeChat: boolean
  timeLine: boolean
  taskChat: UseTaskChatState
  /** 任务规划 tabs 是否有内容 */
  hasTaskTabs: boolean
  /** 文件系统是否有预览文件 */
  hasFilePreview: boolean
}

export function useAIChatResizeBox(params: Params) {
  const overrideRef = useRef<ResizeBoxOverride | null>(null)
  const [version, setVersion] = useState(0)

  const emitResizeBox = (override: ResizeBoxOverride | null) => {
    overrideRef.current = override
    setVersion((v) => v + 1)
  }

  const resizeBoxProps = useCreation<ResizeBoxProps>(() => {
    const { activeKey, showFreeChat, timeLine, hasTaskTabs, hasFilePreview } = params
    let override = overrideRef.current
    // 消费一次就清掉
    overrideRef.current = null
    if (!activeKey) {
      return {
        firstNodeStyle: { display: 'none' },
        secondRatio: '100%',
        lineStyle: { display: 'none' },
        secondNodeStyle: { width: '100%', padding: 0 },
        ...override,
      }
    }

    const isTaskContent = activeKey === AITabsEnum.Task_Content
    const isFileSystem = activeKey === AITabsEnum.File_System
    const isOperationLog = activeKey === AITabsEnum.Operation_Log
    // 详情区为空 / 读写日志：左侧只保留列表宽度（与时间线一致），自由对话变大
    const isDetailEmpty = (isTaskContent && !hasTaskTabs) || (isFileSystem && !hasFilePreview) || isOperationLog

    let secondRatio: ResizeBoxProps['secondRatio']
    let firstRatio: ResizeBoxProps['firstRatio']

    if (showFreeChat) {
      if (isDetailEmpty) {
        // 与任务内容时间线一致：左侧约 70%×30%=21%，自由对话变大
        firstRatio = isTaskContent && !timeLine ? undefined : '21%'
        secondRatio = isTaskContent && !timeLine ? 'calc(100% - 30px)' : '79%'
      } else {
        // 有详情 / 其它面板：保持原布局
        secondRatio = '432px'
        firstRatio = '70%'
      }
    }

    const computed: ResizeBoxProps = {
      freeze: showFreeChat,
      firstRatio,
      firstMinSize: showFreeChat ? (isDetailEmpty ? (isTaskContent && !timeLine ? 30 : 280) : 30) : 400,
      secondMinSize: showFreeChat ? 400 : 30,
      secondRatio,
      lineDirection: 'left',
      firstNodeStyle: {
        padding: 0,
        ...(!showFreeChat && { width: '100%' }),
        ...(showFreeChat && isTaskContent && !hasTaskTabs && !timeLine ? { maxWidth: 30, minWidth: 30 } : {}),
      },
      secondNodeStyle: {
        padding: 0,
        ...(!showFreeChat && { minWidth: 30, maxWidth: 30 }),
      },
    }

    return {
      ...computed,
      ...override,
    }
  }, [
    params.activeKey,
    params.showFreeChat,
    params.timeLine,
    params.hasTaskTabs,
    params.hasFilePreview,
    params.taskChat.elements?.length,
    version,
  ])

  return {
    resizeBoxProps,
    emitResizeBox,
  }
}
