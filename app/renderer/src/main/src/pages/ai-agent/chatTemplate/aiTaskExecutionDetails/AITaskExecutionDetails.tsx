import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import {
  AITaskActionItemProps,
  AITaskDetailsCardListProps,
  AITaskExecutionDetailsCardProps,
  AITaskExecutionDetailsProps,
  AITaskStatisticsStatusProps,
} from './type'
import { OutlinePresentationchartbarIcon, OutlineTrashIcon } from '@/assets/icon/outline'
import styles from './AITaskExecutionDetails.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AIDeleteNodeIcon, AIDoingNodeIcon, AIDoneNodeIcon, AIPendingNodeIcon, AISkippedNodeIcon } from './icon'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { AIToDoListItem } from '@/pages/ai-re-act/aiReActChat/aiToDoList/AIToDoList'
import { useCreation, useInterval, useMemoizedFn } from 'ahooks'
import useChatIPCDispatcher from '../../useContext/ChatIPCContent/useDispatcher'
import useAIAgentStore from '../../useContext/useStore'
import { PlanItemDetailsData, TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'
import { cloneDeep } from 'lodash'
import { Progress } from 'antd'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'

export const AITaskExecutionDetails: React.FC<AITaskExecutionDetailsProps> = React.memo((props) => {
  const { taskIndex, taskGoal, taskName } = props
  const { chatIPCEvents } = useChatIPCDispatcher()
  const { activeChat } = useAIAgentStore()

  const [planItemDetailsData, setPlanItemDetailsData] = useState<PlanItemDetailsData>()
  const [todoList, setTodoList] = useState<TodoListCardData>()
  const perPlanItemDetailsDataUUIdRef = useRef<string>('')
  const perTodoListUUIdRef = useRef<string>('')
  useEffect(() => {
    onReset()
    getData()
    getTodoList()
  }, [taskIndex])
  useInterval(() => {
    getData()
    getTodoList()
  }, 5 * 1000)
  const onReset = useMemoizedFn(() => {
    setPlanItemDetailsData(undefined)
    setTodoList(undefined)
    perPlanItemDetailsDataUUIdRef.current = ''
    perTodoListUUIdRef.current = ''
  })
  const getTodoList = useMemoizedFn(() => {
    if (!taskIndex) return
    const todoListMap = chatIPCEvents.fetchChatDataStore()?.get(activeChat?.SessionID || '')?.taskChat.todoListMap
    if (!todoListMap || todoListMap.size === 0) return
    const itemData: TodoListCardData | undefined = todoListMap.get(taskIndex)
    if (!itemData) return
    if (perTodoListUUIdRef.current === itemData.uuid) return
    perTodoListUUIdRef.current = itemData.uuid
    setTodoList(cloneDeep(itemData))
  })
  const getData = useMemoizedFn(() => {
    if (!taskIndex) return
    const planDetailsMap = chatIPCEvents.fetchChatDataStore()?.get(activeChat?.SessionID || '')?.taskChat.planDetailsMap
    if (!planDetailsMap || planDetailsMap.size === 0) return
    const itemData: PlanItemDetailsData | undefined = planDetailsMap.get(taskIndex)
    if (!itemData) return
    if (perPlanItemDetailsDataUUIdRef.current === itemData.uuid) return
    perPlanItemDetailsDataUUIdRef.current = itemData.uuid
    setPlanItemDetailsData(cloneDeep(itemData))
  })
  const perception = useCreation(() => {
    if (!planItemDetailsData) return
    return planItemDetailsData.perception
  }, [planItemDetailsData?.perception])

  const finishedCount = useCreation(() => {
    return (todoList?.stats?.deleted || 0) + (todoList?.stats?.done || 0) + (todoList?.stats?.skipped || 0)
  }, [todoList?.stats])
  const total = useCreation(() => todoList?.items?.length || 0, [todoList?.items?.length])

  const todoData = useCreation(() => {
    const unFinish: TodoListCardData['items'] = []
    const finished: TodoListCardData['items'] = []
    const progressNumber: AITaskStatisticsStatusProps['list'] = [
      {
        key: 'pending',
        color: 'neutral-with-border',
        title: '待处理',
        footerLeft: 0,
        footerRight: <AIPendingNodeIcon />,
      },
      { key: 'doing', color: 'main', title: '进行中', footerLeft: 0, footerRight: <AIDoingNodeIcon /> },
      { key: 'done', color: 'green', title: '已完成', footerLeft: 0, footerRight: <AIDoneNodeIcon /> },
      { key: 'skipped', color: 'neutral', title: '已跳过', footerLeft: 0, footerRight: <AISkippedNodeIcon /> },
      { key: 'deleted', color: 'red', title: '已删除', footerLeft: 0, footerRight: <AIDeleteNodeIcon /> },
    ]

    for (const item of todoList?.items || []) {
      switch (item.status) {
        case 'PENDING':
          progressNumber[0].footerLeft = progressNumber[0].footerLeft + 1
          unFinish.push(item)
          break

        case 'DOING':
          progressNumber[1].footerLeft = progressNumber[1].footerLeft + 1
          unFinish.push(item)
          break

        case 'DONE':
          progressNumber[2].footerLeft = progressNumber[2].footerLeft + 1
          finished.push(item)
          break

        case 'SKIPPED':
          progressNumber[3].footerLeft = progressNumber[3].footerLeft + 1
          finished.push(item)
          break

        case 'DELETED':
          progressNumber[4].footerLeft = progressNumber[4].footerLeft + 1
          finished.push(item)
          break
        default:
          break
      }
    }
    return { unFinish, finished, progressNumber }
  }, [todoList?.items])

  return (
    <div className={styles['ai-task-execution-details-container']}>
      {/* 头部 */}
      <div className={styles['header']}>
        <div className={styles['header-title']}>
          <OutlinePresentationchartbarIcon className={styles['header-icon']} />
          <span className={styles['title-text']}>任务执行详情</span>
        </div>
        <div className={styles['header-subtitle']}>{taskName}</div>
      </div>

      <div className={styles['content-body']}>
        {/* 上半部分：左侧目标与意图 + 右侧统计 */}
        <div className={styles['top-section']}>
          <div className={styles['top-left']}>
            <AITaskExecutionDetailsCard title="任务目标" content={taskGoal} />
            <AITaskExecutionDetailsCard title="意图感知" content={perception?.summary} />
          </div>
          <div className={styles['task-statistics']}>
            <div className={styles['stats-header']}>
              <span className={styles['title']}>任务统计</span>
              {!!total && (
                <>
                  <span className={styles['progress-text']}>
                    进度
                    <span className={styles['progress-number']}>
                      {finishedCount}/{total || 1}
                    </span>
                  </span>
                  <Progress
                    strokeColor="var(--Colors-Use-Neutral-Disable)"
                    trailColor="var(--Colors-Use-Neutral-Bg-Hover)"
                    percent={Math.ceil(finishedCount / total) * 100}
                    size="small"
                    showInfo={false}
                    className={styles['progress-bar']}
                  />
                </>
              )}
            </div>
            {!!total ? (
              <>
                {/* 状态统计区块 */}
                <AITaskStatisticsStatus list={todoData.progressNumber} />
                <div className={styles['stats-content']}>
                  {/* 待办列表区块 */}
                  <div className={styles['todo-list-wrapper']}>
                    <div className={styles['todo-list-header']}>
                      <span className={styles['todo-title']}>待办</span>
                      <YakitTag border={false} fullRadius size="small">
                        {todoData.unFinish.length}
                      </YakitTag>
                    </div>
                    <div className={styles['todo-list']}>
                      {todoData.unFinish.map((item, index) => (
                        <AIToDoListItem key={index} item={item} />
                      ))}
                    </div>
                  </div>
                  {/* 已结束 */}
                  <div className={styles['todo-list-wrapper']}>
                    <div className={styles['todo-list-header']}>
                      <span className={styles['todo-title']}>已结束</span>
                      <YakitTag border={false} fullRadius size="small">
                        {todoData.finished.length}
                      </YakitTag>
                    </div>
                    <div className={styles['todo-list']}>
                      {todoData.finished.map((item, index) => (
                        <AIToDoListItem key={index} item={item} />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles['empty-body']}>
                <YakitEmpty
                  imageStyle={{ width: 160, height: 140 }}
                  title="暂无待办任务"
                  description="当前任务暂未生成待办任务，请稍后查看"
                />
              </div>
            )}
          </div>
        </div>

        {/* 下半部分：技能、工具、插件三列 */}
        <div className={styles['bottom-section']}>
          <AITaskDetailsCardList
            key="forge"
            colTitle="技能"
            fixedList={planItemDetailsData?.forges.fixed || []}
            dynamicList={planItemDetailsData?.forges.dynamic || []}
          />
          <AITaskDetailsCardList
            key="tool"
            colTitle={'工具'}
            fixedList={planItemDetailsData?.tool.fixed || []}
            dynamicList={planItemDetailsData?.tool.dynamic || []}
          />
          <AITaskDetailsCardList
            key="yak_plugin"
            colTitle={'插件'}
            fixedList={planItemDetailsData?.plugins.fixed || []}
            dynamicList={planItemDetailsData?.plugins.dynamic || []}
          />
        </div>
      </div>
    </div>
  )
})

const AITaskDetailsCardList: React.FC<AITaskDetailsCardListProps> = React.memo((props) => {
  const { colTitle, fixedList, dynamicList } = props
  const [fixedScroll, setFixedScroll] = useState<boolean>(false)
  const [dynamicScroll, setDynamicScroll] = useState<boolean>(false)
  return (
    <div className={styles['section-card']}>
      <div className={styles['section-card-title']}>{colTitle}</div>
      {/* 固定加载 */}
      {!!fixedList.length && (
        <div className={styles['plugin-group']}>
          <div className={styles['plugin-group-header']}>
            <div className={styles['plugin-group-title']}>
              固定加载
              <YakitTag border={false} fullRadius size="small">
                {fixedList.length}
              </YakitTag>
            </div>
          </div>
          <div
            className={styles['plugin-list']}
            style={{ overflowY: fixedScroll ? 'auto' : 'hidden' }}
            onMouseEnter={() => setFixedScroll(true)}
            onMouseLeave={() => setFixedScroll(false)}
          >
            {fixedList.map((fixedItem, index) => (
              <AITaskActionItem
                key={fixedItem.verbose_name + fixedItem.name}
                title={fixedItem.verbose_name || fixedItem.name}
                description={fixedItem.description}
              />
            ))}
          </div>
        </div>
      )}
      {/* 动态加载 */}
      <div className={styles['plugin-group']}>
        <div className={styles['plugin-group-header']}>
          <div className={styles['plugin-group-title']}>
            动态加载
            <YakitTag border={false} fullRadius size="small">
              {dynamicList.length}
            </YakitTag>
          </div>
          <YakitButton type="text" className={styles['add-btn']}>
            添加
          </YakitButton>
        </div>
        {!!dynamicList.length && (
          <div
            className={styles['plugin-list']}
            style={{ overflowY: dynamicScroll ? 'auto' : 'hidden' }}
            onMouseEnter={() => setDynamicScroll(true)}
            onMouseLeave={() => setDynamicScroll(false)}
          >
            {dynamicList.map((dynamicItem, index) => (
              <AITaskActionItem
                key={dynamicItem.name}
                title={dynamicItem.name}
                description={dynamicItem.description}
                titleExtra={
                  <YakitPopconfirm title={'确定删除嘛?'} onConfirm={() => {}}>
                    <YakitButton isHover icon={<OutlineTrashIcon />} type="secondary2" colors="danger" />
                  </YakitPopconfirm>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

const AITaskActionItem: React.FC<AITaskActionItemProps> = React.memo((props) => {
  const { title, description, titleExtra } = props
  return (
    <div className={classNames(styles['plugin-item'])}>
      <div className={styles['plugin-item-heard']}>
        <div className={styles['plugin-item-title']}>{title}</div>
        {titleExtra && <div className={styles['plugin-item-actions']}>{titleExtra}</div>}
      </div>
      {description && <div className={styles['plugin-item-desc']}>{description}</div>}
    </div>
  )
})

const AITaskExecutionDetailsCard: React.FC<AITaskExecutionDetailsCardProps> = React.memo((props) => {
  const { title, content, className } = props
  return (
    <div className={classNames(styles['card'], className)}>
      <div className={styles['card-title']}>{title}</div>
      <div className={styles['card-content']}>
        {!!content ? content : <span className={styles['empty-text']}>暂无信息...</span>}
      </div>
    </div>
  )
})

const AITaskStatisticsStatus: React.FC<AITaskStatisticsStatusProps> = React.memo((props) => {
  const { list } = props
  return (
    <div className={styles['stats-overview']}>
      {list.map((item) => (
        <div key={item.key} className={classNames(styles['stat-box'], styles[`stat-${item.color}`])}>
          <div className={styles['stat-label']}>{item.title}</div>
          <div className={styles['stat-footer']}>
            <div className={styles['stat-footer-left']}>{item.footerLeft}</div>
            <div className={styles['stat-footer-right']}> {item.footerRight} </div>
          </div>
        </div>
      ))}
    </div>
  )
})
