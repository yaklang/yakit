import React, { memo, useCallback, useMemo, useState } from 'react'
import { AITreeNodeProps, AITreeProps } from './type'
import { TaskErrorIcon, TaskInProgressIcon, TaskSkippedIcon, TaskSuccessIcon } from './icon'
import { OutlineInformationcircleIcon } from '@/assets/icon/outline'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { useMemoizedFn } from 'ahooks'

import classNames from 'classnames'
import styles from './AITree.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AITaskInfoProps } from '@/pages/ai-re-act/hooks/aiRender'
import emiter from '@/utils/eventBus/eventBus'
import useChatIPCStore from '../useContext/ChatIPCContent/useStore'
import { AIHistorySkipTask } from '../chatTemplate/historyTaskTree/HistoryTaskTree'

// 起始节点层级
const START_LEVEL = 1

function lineStyles(i: number, levelDiff: number, lineNum: number) {
  if (i === 0 || lineNum === i + 1 || i < lineNum - levelDiff) return {}

  return {
    height: '37px',
    flex: 'none',
  }
}

export const AITree: React.FC<AITreeProps> = memo((props) => {
  const { tasks, className, aiTreeTitleExtraNode } = props
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null)

  const onNodeHoverEnd = useCallback(() => setHoveredIndex(null), [])

  // position / dependsOnTasks / onClick 只在 tasks 变化时重算，hover 时保持稳定引用
  const taskMetaMap = useMemo(() => {
    const map = new Map<
      string,
      { position: AITreeNodeProps['position']; dependsOnTasks: AITaskInfoProps[]; onClick: () => void }
    >()
    tasks.forEach((item, index) => {
      const prev = tasks[index - 1]
      const next = tasks[index + 1]
      map.set(item.index, {
        position: {
          isStart: index === 0,
          isEnd: index === tasks.length - 1,
          isStartOfLevel: item.level > (prev?.level ?? 0),
          isEndOfLevel: item.level > (next?.level ?? 0),
          isParentLast: item.level > (next?.level ?? 0) && (next?.level ?? 0) !== item.level - 1,
          levelDiff: Math.abs(item.level - (next?.level ?? 2)), // START_LEVEL 加上 去掉第一层，所以是 2
        },
        dependsOnTasks: (item.depends_on ?? [])
          .map((depIndex) => tasks.find((t) => t.index === depIndex))
          .filter((t): t is AITaskInfoProps => !!t),
        onClick: () => emiter.emit('onAITreeLocatePlanningList', item.index),
      })
    })
    return map
  }, [tasks])

  const hoveredTask = hoveredIndex !== null ? tasks.find((t) => t.index === hoveredIndex) : null
  return (
    <div
      className={classNames(styles['ai-tree'], className || '', {
        [styles['ai-tree-hovering']]: hoveredIndex !== null,
      })}
    >
      {tasks.map((item, index) => {
        const meta = taskMetaMap.get(item.index)!
        const isDimmed =
          hoveredIndex !== null &&
          item.index !== hoveredIndex &&
          !(hoveredTask?.depends_on?.includes(item.index) ?? false)
        const isHovered = item.index === hoveredIndex
        return (
          <AITreeNode
            key={item.index}
            order={index}
            position={meta.position}
            data={item}
            onClick={meta.onClick}
            isDimmed={isDimmed}
            isHovered={isHovered}
            dependsOnTasks={meta.dependsOnTasks}
            onNodeHover={setHoveredIndex}
            onNodeHoverEnd={onNodeHoverEnd}
            aiTreeTitleExtraNode={aiTreeTitleExtraNode}
          />
        )
      })}
      <div className={styles['ai-tree-node-end']}>
        <div />
      </div>
    </div>
  )
})

/** @name 树节点 */
// prettier-ignore
const AITreeNode: React.FC<AITreeNodeProps> = memo(({ data, position, onClick, isDimmed, isHovered, dependsOnTasks, onNodeHover, onNodeHoverEnd, aiTreeTitleExtraNode }) => {
  const { syncIdInfoMap } = useChatIPCStore()
  const lineNum = useMemo(() => {
    return data.level - START_LEVEL
  }, [data.level])
  const { isStart, isEnd, isStartOfLevel, isEndOfLevel, isParentLast, levelDiff } = position
  const [infoShow, setInfoShow] = React.useState(false)

  const handleFindLeafNode = useMemoizedFn((info: AITaskInfoProps) => {
    if (data.subtasks && data.subtasks.length > 0) {
      return handleFindLeafNode(data.subtasks[0])
    } else {
      return info
    }
  })

  const handleMouseEnter = useMemoizedFn(() => onNodeHover?.(data.index))
  const [Icon, Card] = useMemo(() => {
    const titleNode = (
      <div className={styles['node-title']}>
        <p>{data.name}</p>
        <div className={styles['node-extra']}>
          <YakitPopover
            overlayClassName={styles['task-detail-popover']}
            overlayStyle={{ paddingLeft: 4 }}
            placement="rightTop"
            content={
              <div className={styles['detail-wrapper']}>
                <div className={styles['detail-title']}>{data.name}</div>
                <div className={styles['detail-description']}>{data.goal}</div>
              </div>
            }
            visible={infoShow}
            onVisibleChange={setInfoShow}
          >
            <OutlineInformationcircleIcon className={styles['info-icon']} />
          </YakitPopover>
          {data.isLeaf && data.progress === 'processing' && (
            <AIHistorySkipTask taskIndex={data.index} />
          )}
          {aiTreeTitleExtraNode && <div className={styles['ai-tree-extra-node']}>{aiTreeTitleExtraNode?.(data)}</div>}
        </div>
      </div>
    )
    const contentNode = (
      <div className={styles['node-content']}>
        <div className={styles['node-content-text']}>{data.goal}</div>
        <div className={styles['node-content-tag']}>
          {[data.fail_tool_call_count, data.success_tool_call_count].map((item, index) => {
            if (!item) return null
            const color = index === 0 ? 'danger' : 'success'
            return (
              <YakitTag key={index} size="small" fullRadius color={color} className={styles['node-content-tag-num']}>
                {item}
              </YakitTag>
            )
          })}
        </div>
      </div>
    )
    const style = isParentLast && !data.progress ? { marginBottom: '16px' } : {}

    const getWrapper = (extraClass?: string) => (
      <div className={classNames(styles['node-wrapper'], extraClass)} style={style} onClick={onClick}>
        {titleNode}
        {data.progress && contentNode}
      </div>
    )
    switch (data.progress) {
      case 'completed':
        return [<TaskSuccessIcon key="success" />, getWrapper(styles['node-wrapper-success'])]
      case 'aborted':
        return [<TaskErrorIcon key="error" />, getWrapper(styles['node-wrapper-error'])]
      case 'skipped':
        return [<TaskSkippedIcon key="skipped" />, getWrapper(styles['node-wrapper-skipped'])]
      case 'processing':
        return [<TaskInProgressIcon key="in-progress" />, getWrapper(styles['node-wrapper-in-progress'])]
      default:
        return [<div key="circle" className={styles['node-circle-icon']} />,
          getWrapper(styles['node-wrapper-default']),
        ]
    }
  }, [data, infoShow, isParentLast, onClick, syncIdInfoMap, aiTreeTitleExtraNode])

  if (data === null) return null

  return (
    <div
      className={classNames(styles['ai-tree-node'], { [styles['ai-tree-node-dimmed']]: isDimmed })}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onNodeHoverEnd}
    >
      {Array.from({ length: lineNum }).map((_, i) => {
        const isLast = i === lineNum - 1
        const backslash = isLast && isStartOfLevel
        const slash = isLast && isEndOfLevel
        const bgColor = (isLast && isStartOfLevel) || isStart ? 'transparent' : 'var(--Colors-Use-Neutral-Disable)'
        const height = isEndOfLevel ? lineStyles(i, levelDiff, lineNum) : {}
        return (
          <div
            key={i}
            className={classNames(styles['node-icon'], {
              [styles['node-icon-backslash']]: backslash && i !== 0,
              [styles['node-icon-parent-slash']]: i !== 0 && !slash && isParentLast,
              [styles['node-icon-slash']]: i !== 0 && slash,
            })}
          >
            <div
              style={{
                backgroundColor: bgColor,
              }}
              className={styles['node-icon-line-top']}
            />
            {isLast && Icon}
            <div
              className={classNames(styles['node-icon-line'], isLast && isEnd && styles['node-icon-line-bottom'])}
              style={height}
            />
          </div>
        )
      })}
      <YakitPopover
        overlayClassName={styles['depends-on-popover']}
        placement='right'
        visible={isHovered}
        content={
          <div className={styles['depends-on-content']}>
            <div className={styles['depends-on-title']}>高亮的为该任务的关联任务</div>
            {dependsOnTasks && dependsOnTasks.length > 0 ? (
              <div className={styles['depends-on-list']}>
                {dependsOnTasks.map((task) => (
                  <div key={task.index} className={styles['depends-on-item']}>
                    {task.name}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles['depends-on-empty']}>暂无其他关联任务</div>
            )}
          </div>
        }
      >
        {Card}
      </YakitPopover>
    </div>
  )
},
)
