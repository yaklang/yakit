import type { AIMessageHandler, AIMessageHandlerParams, UpdateRenderDataParams } from './type'
import type { AIAgentGrpcApi, AIInputEvent } from './grpcApi'
import type {
  AIChatQSData,
  AIChatQSDataType,
  AIReviewType,
  AIToolResult,
  ChatStream,
  HttpFlowFuzzStatusCardData,
  ReportFinishCardData,
  ReActChatBaseInfo,
  ReActChatGroupElement,
  ReActChatElement,
  ReActChatRenderItem,
  ReActChatTaskElement,
  ReActChatTaskElementSub,
  PlanItemDetailsData,
} from './aiRender'

import { Uint8ArrayToString } from '@/utils/str'
import {
  genBaseAIChatData,
  genErrorLogData,
  handleTodoListData,
  isAutoExecuteReviewContinue,
  isToolStderrStream,
  isToolStdoutStream,
} from './utils'
import { AIChatQSDataTypeEnum } from './aiRender'
import {
  AIReviewJudgeLevelMap,
  AIStreamContentType,
  convertNodeIdToVerbose,
  DefaultAIToolResult,
  DefaultPlanItemDetailsData,
  DefaultToolResultSummary,
} from './defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import { v4 as uuidv4 } from 'uuid'
import isEmpty from 'lodash/isEmpty'
import isArray from 'lodash/isArray'
// #region Common Utils
/** grpc流数据转换成错误信息输出到日志中 */
const handleErrorGRPCToLog: (
  /** 该条grpc流数据是历史数据 */
  isHistory: AIMessageHandlerParams['res']['IsSync'],
  pushLog: AIMessageHandlerParams['pushLog'],
  error: ReturnType<typeof genErrorLogData>,
) => void = (isHistory, pushLog, error) => {
  if (isHistory) return
  pushLog(error)
}

/**
 * 在 elements 树中查找并更新指定渲染项（含 Task 组 / stream 组嵌套）
 * 只是更新renderNum，不包含新建逻辑
 */
const bumpRenderItem = (list: ReActChatRenderItem[], info: UpdateRenderDataParams): boolean => {
  for (const item of list) {
    if (item.token === info.mapKey && item.type === info.type) {
      item.renderNum += 1
      return true
    }
    if (item.kind === 'task') {
      for (const child of item.children) {
        if (child.token === info.mapKey && child.type === info.type) {
          child.renderNum += 1
          item.renderNum += 1
          return true
        }
        if (child.kind === 'group') {
          const sub = child.children.find((c) => c.token === info.mapKey && c.type === info.type)
          if (sub) {
            sub.renderNum += 1
            child.renderNum += 1
            item.renderNum += 1
            return true
          }
        }
      }
    }
    if (item.kind === 'group') {
      const sub = item.children.find((c) => c.token === info.mapKey && c.type === info.type)
      if (sub) {
        sub.renderNum += 1
        item.renderNum += 1
        return true
      }
    }
  }
  return false
}

/**
 * 将新渲染项追加到 elements（只包含普通节点 和 Task 任务组，单节点不会出现在 Stream 组内）
 * 只是新建逻辑，不包含更新renderNum
 */
const appendRenderItem = (
  old: ReActChatRenderItem[],
  element: ReActChatRenderItem,
  isHistory: boolean,
  options?: { taskIndex: AIChatQSData['taskIndex']; getContentMap: AIMessageHandlerParams['getContentMap'] },
): ReActChatRenderItem[] => {
  if (options?.taskIndex) {
    const taskIndexGroupKey = options?.taskIndex
    const groupIndex = old.findIndex((item) => item.kind === 'task' && item.token === taskIndexGroupKey)
    if (groupIndex >= 0) {
      const list = [...old]
      const group = list[groupIndex] as ReActChatTaskElement
      const children = (
        isHistory ? [element, ...group.children] : [...group.children, element]
      ) as ReActChatTaskElementSub[]
      list[groupIndex] = { ...group, children, renderNum: group.renderNum + 1 }
      return list
    }
  }
  return isHistory ? [element, ...old] : [...old, element]
}

/** 更新UI-State变量数据(独立单条数据) */
const handleUpdateUISingleState = (
  setElements: AIMessageHandlerParams['setElements'],
  getContentMap: AIMessageHandlerParams['getContentMap'],
  isHistory: AIMessageHandlerParams['res']['IsSync'],
  info: UpdateRenderDataParams & { chatType: ReActChatBaseInfo['chatType'] },
) => {
  try {
    setElements((old) => {
      if (bumpRenderItem(old, info)) {
        return [...old]
      }

      const element: ReActChatRenderItem = {
        chatType: info.chatType,
        token: info.mapKey,
        type: info.type,
        kind: 'item',
        renderNum: 1,
      }
      const chatDetail = getContentMap(info.mapKey)
      if (!chatDetail || chatDetail.id !== info.mapKey) return old
      return appendRenderItem(old, element, isHistory, {
        taskIndex: chatDetail?.taskIndex,
        getContentMap,
      })
    })
  } catch {}
}

/** 更新UI-State变量数据(组数据) */
const handleUpdateUIGroupState: (
  /** group数据 */
  group: { mapKey: string; type: AIChatQSDataType },
  /** sub数据 */
  sub: { mapKey: string; type: AIChatQSDataType },
  setElement: AIMessageHandlerParams['setElements'],
  /** 父 TaskIndex 集合组 token */
  taskNodeKey?: string,
) => void = (group, sub, setElement, taskNodeKey) => {
  try {
    setElement((old) => {
      const scope: ReActChatRenderItem[] = taskNodeKey
        ? (old.find((item) => item.kind === 'task' && item.token === taskNodeKey) as ReActChatTaskElement | undefined)
            ?.children || []
        : old

      const find = scope.find((item) => item.token === group.mapKey && item.type === group.type)
      if (find && find.kind === 'group') {
        const subFind = find.children.find((item) => item.token === sub.mapKey && item.type === sub.type)
        if (subFind) subFind.renderNum += 1
        find.renderNum += 1
        if (taskNodeKey) {
          const taskGroup = old.find((item) => item.kind === 'task' && item.token === taskNodeKey) as
            | ReActChatTaskElement
            | undefined
          if (taskGroup) taskGroup.renderNum += 1
        }
        return [...old]
      }

      return old
    })
  } catch {}
}
// #endregion

/** 将 task 容器内 children 写回顶层 list，并给renderNum加一 */
const writeBackTaskGroupChildren = (
  list: ReActChatRenderItem[],
  taskGroupIndex: number,
  children: ReActChatTaskElementSub[],
): ReActChatRenderItem[] => {
  const taskGroup = list[taskGroupIndex] as ReActChatTaskElement
  list[taskGroupIndex] = { ...taskGroup, children, renderNum: taskGroup.renderNum + 1 }
  return list
}

/** stream数据初始化到UI上的逻辑处理 */
const handleIsGroupDisplayForStream: (
  /** grpc流数据 */
  res: AIMessageHandlerParams['res'],
  /** stream类型对应的详细数据 */
  streamDetail: ChatStream,
  /** 当前渲染的数据列表 */
  data: ReActChatRenderItem[],
  /** 获取详情数据映射的函数 */
  getContentMap: AIMessageHandlerParams['getContentMap'],
) => ReActChatRenderItem[] = (res, streamDetail, data, getContentMap) => {
  const taskNodeKey = streamDetail.taskIndex
  const list = [...data]
  /** 任务节点的索引 */
  let taskNodeIndex = -1
  /** task 容器内操作的列表；未命中时为顶层 list */
  let targetList: ReActChatTaskElementSub[] | ReActChatRenderItem[] = list

  if (taskNodeKey) {
    taskNodeIndex = list.findIndex((item) => item.kind === 'task' && item.token === taskNodeKey)
    if (taskNodeIndex >= 0) {
      const taskGroup = list[taskNodeIndex] as ReActChatTaskElement
      targetList = [...taskGroup.children]
    }
  }

  const { ContentType, IsSync } = res
  const element: ReActChatElement = {
    chatType: streamDetail.chatType,
    token: streamDetail.id,
    type: streamDetail.type,
    kind: 'item',
    renderNum: 1,
  }

  const commitIfInTaskGroup = (): ReActChatRenderItem[] | null => {
    if (taskNodeIndex < 0) return null
    return writeBackTaskGroupChildren(list, taskNodeIndex, targetList as ReActChatTaskElementSub[])
  }

  // 以下 判断stream数据已经渲染在UI上的逻辑处理
  const find = targetList.find((item) => item.token === element.token)
  if (find) {
    // 已经渲染到UI上, 是单个节点，或者是task节点下的单个节点/组数据的节点key命中
    if (find.kind === 'group') {
      const subFind = find.children.find((item) => item.token === element.token && item.type === element.type)
      if (subFind) subFind.renderNum += 1
    }
    find.renderNum += 1
    return commitIfInTaskGroup() ?? [...targetList]
  }
  if (streamDetail && streamDetail.parentGroupKey) {
    // 已经渲染到UI上, 不是组数据的key, 但是是组内数据, 找到组信息，并触发渲染更新
    const group = targetList.find(
      (item) => item.token === streamDetail.parentGroupKey && item.type === AIChatQSDataTypeEnum.STREAM_GROUP,
    )
    if (group && group.kind === 'group') {
      const subFind = group.children.find((item) => item.token === element.token && item.type === element.type)
      if (subFind) subFind.renderNum += 1
      group.renderNum += 1
    }
    return commitIfInTaskGroup() ?? [...targetList]
  }

  // 以下 stream数据没有渲染在UI上的逻辑处理
  if (ContentType !== AIStreamContentType.DEFAULT || !targetList.length) {
    // 新增不可成组类型数据
    IsSync ? targetList.unshift(element) : targetList.push(element)
    return commitIfInTaskGroup() ?? [...targetList]
  }

  const active = IsSync ? targetList[0] : targetList[targetList.length - 1]
  const activeDetail = getContentMap(active.token)
  if (!activeDetail || activeDetail.type !== AIChatQSDataTypeEnum.STREAM) {
    // UI详细数据没有或不是可成组类型，新增数据到UI上
    IsSync ? targetList.unshift(element) : targetList.push(element)
    return commitIfInTaskGroup() ?? [...targetList]
  }

  if (active.type === AIChatQSDataTypeEnum.STREAM && active.kind !== 'group') {
    if (activeDetail.data.NodeId === streamDetail.data.NodeId) {
      // 命中单项，准备整合成组数据，将原有单项的token当成组token
      const groupInfo: ReActChatGroupElement = {
        chatType: active.chatType,
        token: active.token,
        type: AIChatQSDataTypeEnum.STREAM_GROUP,
        renderNum: 1,
        kind: 'group',
        children: [],
      }
      groupInfo.children = IsSync
        ? [element, cloneDeep(active) as ReActChatElement]
        : [cloneDeep(active) as ReActChatElement, element]
      const arr = groupInfo.children.map((item) => item.token)
      for (let el of arr) {
        const info = getContentMap(el)
        if (info) info.parentGroupKey = active.token
      }
      IsSync ? targetList.shift() : targetList.pop()
      IsSync ? targetList.unshift(groupInfo) : targetList.push(groupInfo)
    } else {
      IsSync ? targetList.unshift(element) : targetList.push(element)
    }
    return commitIfInTaskGroup() ?? [...targetList]
  } else if (active.type === AIChatQSDataTypeEnum.STREAM_GROUP && active.kind === 'group') {
    if (activeDetail.data.NodeId === streamDetail.data.NodeId) {
      // 命中组内数据，追加到组内
      streamDetail.parentGroupKey = active.token
      IsSync ? active.children.unshift(element) : active.children.push(element)
      active.renderNum += 1
    } else {
      IsSync ? targetList.unshift(element) : targetList.push(element)
    }
    return commitIfInTaskGroup() ?? [...targetList]
  } else {
    IsSync ? targetList.unshift(element) : targetList.push(element)
    return commitIfInTaskGroup() ?? [...targetList]
  }
}

/**
 * grpc流数据的各种类型处理逻辑集合
 * 该逻辑集合里的方法处理，没有使用try-catch拦截，因为在hook层进行了同一try-catch拦截
 * 注意！别的地方单独使用时，请自行加入try-catch拦截错误
 */
export const grpcAIMessageHandlers: Record<string, AIMessageHandler> = {}
