import React from 'react'
import { AIToDoListWrapperProps } from './type'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import { useCurrentRawData, useCurrentStore } from '../../hooks/useCurrentDataBySession'
import useCreation from 'ahooks/lib/useCreation'
import cloneDeep from 'lodash/cloneDeep'
import { useStore } from 'zustand'
import { TodoListCardData } from '../../hooks/aiRender'
import { DefaultTodoListCardData } from '../../hooks/defaultConstant'
import { AIToDoList } from '../aiToDoList/AIToDoList'
import styles from './AIToDoListWrapper.module.scss'

export const AIToDoListWrapper: React.FC<AIToDoListWrapperProps> = React.memo((props) => {
  const { activeChat } = useAIAgentStore()
  const store = useCurrentStore()
  const rawData = useCurrentRawData()

  const todoListUpdate = useStore(store, (state) => state.casualChat?.todoListUpdate)

  const todoData: TodoListCardData = useCreation(() => {
    if (!activeChat?.SessionID) return cloneDeep(DefaultTodoListCardData)
    try {
      return rawData.casualChat.planDetails?.todoList || cloneDeep(DefaultTodoListCardData)
    } catch (error) {
      return cloneDeep(DefaultTodoListCardData)
    }
  }, [todoListUpdate, activeChat?.SessionID])

  return (
    <>
      {todoData?.items?.length > 0 && (
        <div className={styles['todoList-wrapper']}>
          <AIToDoList className={styles['to-do-list']} todoData={todoData} />
        </div>
      )}
    </>
  )
})
