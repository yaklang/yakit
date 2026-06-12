import React, { useEffect, useRef } from 'react'
import { useChatEngineRef } from './test2'
import { AIChatQSDataTypeEnum } from './aiRender'
import { useCreation, useMemoizedFn } from 'ahooks'
import { randomString } from '@/utils/randomUtil'

export const ChatControllerMock = () => {
  const { store, contentInstance } = useChatEngineRef()

  const thoughtData = useMemoizedFn(() => {
    const data = {
      id: randomString(16),
      type: AIChatQSDataTypeEnum.THOUGHT,
      content: randomString(100),
    }
    contentInstance.set(data.id, data)
    store.getState().addNode(null, { kind: 'item', token: data.id, type: data.type, renderNum: 0 })
  })

  const taskId = useRef('')
  const taskPushData = useMemoizedFn(() => {
    const data = {
      id: randomString(16),
      type: AIChatQSDataTypeEnum.TASK_NODE_GROUP,
      content: randomString(100),
    }
    taskId.current = data.id
    contentInstance.set(data.id, data)
    store.getState().addNode(null, {
      kind: 'task',
      token: data.id,
      type: data.type,
      renderNum: 0,
      childrenTokens: [],
    })
  })
  const taskPopData = useMemoizedFn(() => {
    if (!taskId.current) return
    const detail = store.getState().tasks[taskId.current]
    store.getState().updateNode(taskId.current, 'tasks', { renderNum: detail.renderNum + 1 })
    taskId.current = ''
  })

  const streamId = useRef('')
  const streamData = useMemoizedFn(() => {
    const data = {
      id: randomString(16),
      type: AIChatQSDataTypeEnum.STREAM,
      content: randomString(100),
    }
    streamId.current = data.id
    contentInstance.set(data.id, data)
    store.getState().addNode(taskId.current || null, {
      kind: 'item',
      token: data.id,
      type: data.type,
      renderNum: 0,
    })
  })
  const streamEndData = useMemoizedFn(() => {
    if (!streamId.current) return
    const detail = store.getState().items[streamId.current]
    store.getState().updateNode(streamId.current, 'items', { renderNum: detail.renderNum + 1 })
    streamId.current = ''
  })

  const events = useCreation(() => {
    return { thoughtData, taskPushData, taskPopData, streamData, streamEndData }
  }, [])

  return events
}
