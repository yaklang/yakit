import React, { useEffect, useState } from 'react'
import {
  AIPlanReviewTreeArrowLineProps,
  AIPlanReviewTreeItemProps,
  AIPlanReviewTreeLineProps,
  AIPlanReviewTreeProps,
  ContentEditableDivProps,
  SetItemOption,
} from './AIPlanReviewTreeType'
import styles from './AIPlanReviewTree.module.scss'
import { useControllableValue, useCreation, useDebounceFn, useMemoizedFn } from 'ahooks'
import { ExpandIcon, RetractIcon } from './icon'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlinePlussmIcon, OutlineTrashIcon } from '@/assets/icon/outline'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { GetAIToolListRequest, GetAIToolListResponse } from '../type/aiTool'
import { yakitNotify } from '@/utils/notification'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { SolidAnnotationIcon, SolidToolIcon } from '@/assets/icon/solid'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { grpcGetAIToolList } from '../aiToolList/utils'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { generateTaskChatExecution } from '../defaultConstant'
import { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { findPlanTaskSubtreeEnd, getPlanTaskLevel } from '@/pages/ai-agent/utils'
import { randomString } from '@/utils/randomUtil'

const AIPlanReviewTree: React.FC<AIPlanReviewTreeProps> = React.memo((props) => {
  const { editable, planReviewTreeKeywordsMap, currentPlansId } = props
  const [list, setList] = useControllableValue<AIAgentGrpcApi.PlanTask[]>(props, {
    defaultValue: [],
    valuePropName: 'list',
    trigger: 'setList',
  })

  /** 添加子节点 */
  const onAddSubNode = useMemoizedFn((item: AIAgentGrpcApi.PlanTask) => {
    const parentPos = list.findIndex((task) => task.task_id === item.task_id)
    if (parentPos === -1) return

    const parentLevel = getPlanTaskLevel(item)
    const newChildTask: AIAgentGrpcApi.PlanTask = {
      ...generateTaskChatExecution(),
      task_id: randomString(16),
      level: parentLevel + 1,
      isUserAdd: true,
    }

    const insertPos = findPlanTaskSubtreeEnd(list, parentPos) + 1
    list.splice(insertPos, 0, newChildTask)
    setList([...list])
    onFocusAfterAddNode(newChildTask)
  })

  /** 添加兄弟节点 */
  const onAddBrotherNode = useMemoizedFn((item: AIAgentGrpcApi.PlanTask) => {
    if (getPlanTaskLevel(item) === 1) return

    const siblingPos = list.findIndex((task) => task.task_id === item.task_id)
    if (siblingPos === -1) return

    const newSiblingTask: AIAgentGrpcApi.PlanTask = {
      ...generateTaskChatExecution(),
      task_id: randomString(16),
      level: getPlanTaskLevel(item),
      isUserAdd: true,
    }

    const insertPos = findPlanTaskSubtreeEnd(list, siblingPos) + 1
    list.splice(insertPos, 0, newSiblingTask)
    setList([...list])
    onFocusAfterAddNode(newSiblingTask)
  })

  /** 新增节点后，聚焦在该节点上 */
  const onFocusAfterAddNode = useMemoizedFn((item: AIAgentGrpcApi.PlanTask) => {
    setTimeout(() => {
      const dom = document.getElementById(item.task_id)
      if (!dom) return
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const isVisible = entry.isIntersecting
            if (!isVisible) {
              dom.scrollIntoView()
              setTimeout(() => {
                const classString = styles['temp-highlight']
                dom.classList.add(classString)
                setTimeout(() => {
                  dom.classList.remove(classString)
                }, 1000)
              }, 200)
            }
          })
          observer.disconnect()
        },
        { threshold: 0.01 },
      )
      observer.observe(dom)
    }, 200)
  })

  const onRemoveNode = useMemoizedFn((item: AIAgentGrpcApi.PlanTask) => {
    const pos = list.findIndex((ele) => ele.task_id === item.task_id)
    if (pos === -1) return
    const end = findPlanTaskSubtreeEnd(list, pos)
    const newList = list.map((ele, index) => {
      if (index >= pos && index <= end) {
        return { ...ele, isRemove: true }
      }
      return { ...ele }
    })
    setList([...newList])
  })

  const setItem = useMemoizedFn((item: AIAgentGrpcApi.PlanTask, option: SetItemOption) => {
    const { label, value } = option
    const newList = list.map((ele: AIAgentGrpcApi.PlanTask) => {
      if (ele.task_id === item.task_id) {
        ele = {
          ...ele,
          [label]: value,
        }
      }
      return { ...ele }
    })
    setList([...newList])
  })

  return (
    <div className={styles['ai-plan-review-tree']}>
      {list.length > 0 ? (
        <>
          <div className={styles['dot']} />
          {list.map((item, index) => {
            return (
              <React.Fragment key={item.task_id}>
                <AIPlanReviewTreeItem
                  order={index}
                  item={item}
                  preLevel={list[index - 1] ? getPlanTaskLevel(list[index - 1]) : 0}
                  nextLevel={list[index + 1] ? getPlanTaskLevel(list[index + 1]) : 0}
                  editable={editable}
                  onAddSubNode={onAddSubNode}
                  onAddBrotherNode={onAddBrotherNode}
                  onRemoveNode={onRemoveNode}
                  setItem={setItem}
                  planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
                  currentPlansId={currentPlansId}
                />
              </React.Fragment>
            )
          })}
          <AIPlanReviewTreeArrowLine />
        </>
      ) : (
        <YakitEmpty />
      )}
    </div>
  )
})

export default AIPlanReviewTree

const AIPlanReviewTreeItem: React.FC<AIPlanReviewTreeItemProps> = React.memo((props) => {
  const {
    order,
    item,
    preLevel,
    nextLevel,
    editable,
    onAddSubNode,
    onAddBrotherNode,
    onRemoveNode,
    setItem,
    planReviewTreeKeywordsMap,
    currentPlansId,
  } = props
  const [expand, setExpand] = useState<boolean>(true)
  const [visible, setVisible] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)
  const [response, setResponse] = useState<GetAIToolListResponse>({
    Tools: [],
    Pagination: genDefaultPagination(100),
    Total: 0,
  })
  const [isRef, setIsRef] = useState<boolean>(false)

  useEffect(() => {
    if (open) getToolList()
  }, [open])

  const getToolList = useDebounceFn(
    useMemoizedFn(async (page?: number) => {
      setLoading(true)
      const newQuery: GetAIToolListRequest = {
        Query: '',
        ToolName: '',
        Pagination: {
          ...genDefaultPagination(100),
          OrderBy: 'created_at',
          Page: page || 1,
        },
        OnlyFavorites: false,
      }
      try {
        const res = await grpcGetAIToolList(newQuery)
        if (!res.Tools) res.Tools = []
        const newPage = +res.Pagination.Page
        const newRes: GetAIToolListResponse = {
          Tools: newPage === 1 ? res?.Tools : [...response.Tools, ...(res?.Tools || [])],
          Pagination: res?.Pagination || {
            ...genDefaultPagination(20),
          },
          Total: res.Total,
        }
        setResponse(newRes)
        if (newPage === 1) {
          setIsRef(!isRef)
        }
      } catch (error) {}
      setTimeout(() => {
        setLoading(false)
      }, 300)
    }),
    { wait: 500 },
  ).run

  const level = useCreation(() => getPlanTaskLevel(item), [item])

  const onSetExpand = useMemoizedFn(() => {
    if (item.isRemove) {
      yakitNotify('error', '该节点已被删除')
      return
    }
    setExpand((prev) => !prev)
  })
  const onExpand = useMemoizedFn((e: React.MouseEvent) => {
    e.stopPropagation()
    onSetExpand()
  })
  const onAddNode = useMemoizedFn((e) => {
    const { key, domEvent } = e
    domEvent.stopPropagation()
    switch (key) {
      case 'sub':
        onAddSubNode(item)
        break
      case 'brother':
        if (level === 1) return
        onAddBrotherNode(item)
        break
      default:
        break
    }
    setVisible(false)
  })
  const onRemove = useMemoizedFn((e) => {
    e.stopPropagation()
    onRemoveNode(item)
  })
  const onSetName = useMemoizedFn((value: string) => {
    setItem(item, { label: 'name', value })
  })
  const onSetGoal = useMemoizedFn((value: string) => {
    setItem(item, { label: 'goal', value })
  })

  const extraInfo: AIAgentGrpcApi.PlanReviewRequireExtra | undefined = useCreation(() => {
    const info = planReviewTreeKeywordsMap.get(item.task_id)
    if (info?.plans_id === currentPlansId) {
      return info
    }
  }, [item.task_id, planReviewTreeKeywordsMap, currentPlansId])

  useEffect(() => {
    setItem(item, { label: 'description', value: extraInfo?.description || '' })
  }, [extraInfo?.description])
  useEffect(() => {
    if (!item.tools.length) {
      onSetTool(extraInfo?.keywords || [])
    }
  }, [extraInfo?.keywords])

  const onSetTool = useMemoizedFn((value: string[]) => {
    setItem(item, { label: 'tools', value })
  })
  const selectValue = useCreation(() => {
    if (item.tools && item.tools.length > 0) return item.tools
    return extraInfo?.keywords || []
  }, [item.tools, extraInfo?.keywords])

  const description = useCreation(() => {
    if (item?.description && item?.description?.length > 0) return item.description
    return extraInfo?.description || ''
  }, [item.description, extraInfo?.description])

  const showTool = useCreation(() => {
    return selectValue.length > 0 || (editable && !item?.isRemove)
  }, [editable, item?.isRemove, selectValue.length])

  const treeItemMenuData = useCreation(() => {
    const menu = [
      {
        key: 'sub',
        label: '添加子任务',
      },
    ]
    if (level > 1) {
      menu.push({
        key: 'brother',
        label: '添加兄弟任务',
      })
    }
    return menu
  }, [level])

  const name = useCreation(() => {
    if (item?.isRemove && !item.name) return '该节点被删除'
    return item.name
  }, [item.name, item?.isRemove])

  return (
    <div className={styles['ai-plan-review-tree-item']} style={{ '--width': `${level * 16}px` } as React.CSSProperties}>
      <AIPlanReviewTreeLine
        order={order}
        item={item}
        preLevel={preLevel}
        nextLevel={nextLevel}
        expand={expand}
        onSetExpand={onSetExpand}
      />

      <div className={styles['tree-item-content']}>
        <div
          id={item.task_id}
          className={classNames(styles['title'], {
            [styles['title-editable']]: editable && !item?.isRemove,
            [styles['title-hover']]: visible && !item?.isRemove,
            [styles['title-remove']]: item?.isRemove,
          })}
          onClick={onExpand}
        >
          <ContentEditableDiv
            className={styles['title-name']}
            value={name}
            editable={editable && !item?.isRemove}
            setValue={onSetName}
          />
          <div className={styles['icon-body']}>
            {level > 1 && (
              <YakitButton
                type="text2"
                className={styles['trash-icon']}
                icon={<OutlineTrashIcon />}
                onClick={onRemove}
              />
            )}
            <YakitDropdownMenu
              menu={{
                data: treeItemMenuData,
                onClick: onAddNode,
              }}
              dropdown={{
                trigger: ['click'],
                placement: 'bottom',
                visible: visible,
                onVisibleChange: setVisible,
              }}
            >
              <YakitButton
                onClick={(e) => e.stopPropagation()}
                type="text2"
                icon={<OutlinePlussmIcon />}
                className={styles['plus-sm-icon']}
              />
            </YakitDropdownMenu>
          </div>
        </div>
        {expand && !item?.isRemove && (
          <div className={styles['body']}>
            <ContentEditableDiv value={item.goal} editable={editable} setValue={onSetGoal} />
            {showTool && (
              <div className={styles['related-tools']}>
                <div className={styles['related-tools-heard']}>
                  <SolidToolIcon />
                  <span>关联工具</span>
                </div>
                <YakitSelect
                  size="middle"
                  value={selectValue}
                  onChange={onSetTool}
                  bordered={false}
                  mode="tags"
                  disabled={!editable || !!item?.isRemove}
                  open={open}
                  onDropdownVisibleChange={setOpen}
                  notFoundContent={loading ? <YakitSpin size="small" /> : null}
                >
                  {response.Tools.map((toolItem) => {
                    return (
                      <YakitSelect.Option value={toolItem.Name} key={toolItem.Name}>
                        {toolItem.Name}
                      </YakitSelect.Option>
                    )
                  })}
                </YakitSelect>
              </div>
            )}
            {description && (
              <div className={styles['description']}>
                <div className={styles['description-heard']}>
                  <SolidAnnotationIcon />
                  <span>解释</span>
                </div>
                <div>{description}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

const ContentEditableDiv: React.FC<ContentEditableDivProps> = React.memo((props) => {
  const { editable, className, placeholder = '请输入内容...' } = props
  const [value, setValue] = useControllableValue<string>(props, {
    defaultValue: '',
    valuePropName: 'value',
    trigger: 'setValue',
  })
  const onRowClick = useMemoizedFn((e) => {
    if (editable) e.stopPropagation()
  })
  return (
    <div
      className={classNames(className || '', {
        [styles['content-editable']]: editable,
      })}
      style={{ width: value ? '' : '100%' }}
      onClick={onRowClick}
      contentEditable={editable}
      onBlur={(e) => {
        setValue(e.target.innerText || '')
      }}
      suppressContentEditableWarning={true}
      spellCheck={false}
      data-placeholder={placeholder}
    >
      {value}
    </div>
  )
})

const AIPlanReviewTreeLine: React.FC<AIPlanReviewTreeLineProps> = React.memo((props) => {
  const { order, item, preLevel, nextLevel, expand, onSetExpand } = props
  const level = useCreation(() => getPlanTaskLevel(item), [item])

  const isLastNode = useCreation(() => {
    if (!nextLevel) return true
    if (level > nextLevel) return true
    return false
  }, [level, nextLevel])

  const lineType = useCreation(() => {
    if (order === 0) return ''
    if (level - preLevel === 1) return 'start'
    if (preLevel - level === 1) return 'end'
    return ''
  }, [level, order, preLevel])

  const gap = useCreation(() => {
    if (level === 1) return 0
    if (!nextLevel) return 1
    const gapNumber = level - nextLevel
    if (gapNumber > 1) return gapNumber
    return 0
  }, [level, nextLevel])

  const onExpand = useMemoizedFn((e: React.MouseEvent) => {
    e.stopPropagation()
    onSetExpand()
  })

  return (
    <div className={styles['prefix-box']}>
      {Array.from({ length: level }, (_, idx) => {
        const isEndLine = idx === level - 1 && isLastNode && level > 1
        const left = idx === 0 ? 7 : idx * 16 + 7
        const hasBottom = gap && idx < level - 2 && idx >= 1 && idx > nextLevel - 1
        return (
          <div
            key={idx}
            className={classNames(styles['vertical-line'], {
              [styles['no-bulge-line']]: isEndLine && level !== 1,
              [styles['slash-last-line']]: isEndLine && !nextLevel,
              [styles['slash-right-line']]: idx === level - 1 && lineType === 'start',
              [styles['slash-left-line']]: idx === level - 1 && lineType === 'end',
              [styles['slash-gap-line-before']]: gap && idx === level - 1 && level > preLevel,
              [styles['slash-gap-line-after']]: gap && idx === level - 1,
              [styles['gap-no-bulge-line']]: gap && idx >= 1 && idx >= nextLevel,
              [styles['gap-left-line']]:
                gap && ((nextLevel > 0 && idx === nextLevel) || (nextLevel === 0 && idx === 1)),
            })}
            style={
              {
                left,
                '--height': `${Math.sqrt(Math.pow(20, 2) + Math.pow(16, 2))}px`,
                '--rotate': `${Math.atan2(16, 20) * (180 / Math.PI)}deg`,
              } as React.CSSProperties
            }
          >
            {!!hasBottom && <div className={styles['border-bottom']} />}
          </div>
        )
      })}
      <div style={{ left: level === 1 ? 0 : (level - 1) * 16 }} onClick={onExpand} className={styles['icon-box']}>
        {expand ? (
          <ExpandIcon className={styles['chevron-down-icon']} />
        ) : (
          <RetractIcon className={styles['chevron-right-icon']} />
        )}
      </div>
    </div>
  )
})

const AIPlanReviewTreeArrowLine: React.FC<AIPlanReviewTreeArrowLineProps> = React.memo(() => {
  return (
    <div className={styles['ai-plan-review-tree-item']}>
      <div className={classNames(styles['vertical-line'], styles['arrow-box'])}>
        <div className={styles['arrow']} />
      </div>
    </div>
  )
})
