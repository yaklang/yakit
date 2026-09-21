import React from 'react'
import type { AIToDoListWrapperProps } from './type'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import { useCurrentRawData, useCurrentStore } from '../../hooks/useCurrentDataBySession'
import cloneDeep from 'lodash/cloneDeep'
import { useStore } from 'zustand'
import type { TodoListCardData } from '../../hooks/aiRender'
import { DefaultTodoListCardData } from '../../hooks/defaultConstant'
import { AIToDoList } from '../aiToDoList/AIToDoList'
import styles from './AIToDoListWrapper.module.scss'
import { useCreation } from 'ahooks'

export const AIToDoListWrapper: React.FC<AIToDoListWrapperProps> = React.memo((props) => {
  const { activeChat } = useAIAgentStore()
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const currentChatStatusQuestionID = useStore(store, (state) => state.currentChatStatus.questionID)
  const todoListUpdate = useStore(store, (state) => state.chatTodoListUpdate)

  const todoData: TodoListCardData = useCreation(() => {
    if (!activeChat?.SessionID) return cloneDeep(DefaultTodoListCardData)
    try {
      return rawData.taskDetailsMap.get(currentChatStatusQuestionID)?.todoList || cloneDeep(DefaultTodoListCardData)
    } catch (error) {
      return cloneDeep(DefaultTodoListCardData)
    }
  }, [todoListUpdate, activeChat?.SessionID, currentChatStatusQuestionID])

  const reActTaskId: string = useCreation(() => {
    if (!activeChat?.SessionID) return ''
    return rawData.taskDetailsMap.get(currentChatStatusQuestionID)?.taskId ?? ''
  }, [todoListUpdate, activeChat?.SessionID, currentChatStatusQuestionID])

  return (
    <>
      {reActTaskId === currentChatStatusQuestionID && todoData?.items?.length > 0 && (
        <div className={styles['todoList-wrapper']}>
          <AIToDoList className={styles['to-do-list']} todoData={todoData} />
        </div>
      )}
    </>
  )
})
