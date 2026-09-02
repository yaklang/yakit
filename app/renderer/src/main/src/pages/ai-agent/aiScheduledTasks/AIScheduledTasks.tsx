import React, { useEffect, useRef, useState } from 'react'
import type { AIScheduledTasksListItemProps, AIScheduledTasksProps, ScheduleQueryType } from './type'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useDebounceFn, useInViewport, useMemoizedFn } from 'ahooks'
import type { AIReActSchedule } from '../../ai-re-act/hooks/grpcApi'
import {
  grpcDeleteAIReActSchedule,
  grpcGetAIReActSchedule,
  grpcQueryAIReActSchedules,
  grpcRunAIReActScheduleNow,
  grpcSetAIReActScheduleEnabled,
} from './utils'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineDotsverticalIcon,
  OutlinePencilaltIcon,
  OutlinePauseIcon,
  OutlinePlayIcon,
  OutlineSearchIcon,
  OutlineTrashIcon,
  OutlinePlusIcon,
  OutlineRefreshIcon,
  OutlinePlussmIcon,
  OutlineQuestionmarkcircleIcon,
  OutlineFilterIcon,
  OutlineMessageCirclePlusIcon,
} from '@/assets/icon/outline'
import styles from './AIScheduledTasks.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import type { YakitTagColor } from '@/components/yakitUI/YakitTag/YakitTagType'
import { YakitRoundCornerTag } from '@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag'
import type { QueryAIReActSchedulesRequest, QueryAIReActSchedulesResponse } from '../../ai-re-act/hooks/grpcApi'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import type { YakitMenuItemType } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { yakitNotify } from '@/utils/notification'
import { type TFunction, useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { Tooltip } from 'antd'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { showYakitModal, YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import ScheduledTasksForm from './scheduledTasksForm/ScheduledTasksForm'
import AIScheduledTasksDetail from './aiScheduledTasksDetail/AIScheduledTasksDetail'
import { waitForAISessionPush } from './waitForAISessionPush'
import classNames from 'classnames'
import emiter from '@/utils/eventBus/eventBus'
import { SwitchAIAgentTabEventEnum, AIAgentTabListEnum } from '../defaultConstant'
import moment from 'moment'
/**
 * 任务状态标签颜色
 */
const scheduleStatusColor: Record<string, YakitTagColor> = {
  active: 'success',
  paused: 'warning',
  completed: 'info',
}

/**
 * 任务状态筛选选项
 *  - 全部：展示全部任务
 *  - 进行中 / 已暂停 / 已完成 Status 字段筛选
 */
const scheduleQueryTypeOptions = (t: TFunction): YakitMenuItemType[] => {
  return [
    {
      label: t('AIScheduledTasks.all'),
      key: 'all',
    },
    {
      label: t('AIScheduledTasks.active'),
      key: 'active',
    },
    {
      label: t('AIScheduledTasks.paused'),
      key: 'paused',
    },
    {
      label: t('AIScheduledTasks.completed'),
      key: 'completed',
    },
  ]
}
/**
 * 任务操作菜单
 *  - 编辑：编辑该任务
 *  - 立即运行：立即触发一次任务
 *  - 删除：删除该任务
 */
const scheduleMenu: (t: TFunction) => YakitMenuItemType[] = (t: TFunction) => {
  return [
    {
      key: 'edit',
      label: t('YakitButton.edit'),
      itemIcon: <OutlinePencilaltIcon />,
    },
    {
      key: 'run',
      label: t('AIScheduledTasks.runNow'),
      itemIcon: <OutlineMessageCirclePlusIcon />,
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: t('YakitButton.delete'),
      type: 'danger',
      itemIcon: <OutlineTrashIcon />,
    },
  ]
}
const formatTime = (timestamp?: number) => {
  return timestamp && timestamp > 0 ? moment.unix(timestamp).format('HH:mm') : '-'
}

const formatScheduleRule = (item: AIReActSchedule, t: TFunction) => {
  const rrule = (item.Schedule?.RRule || '').toUpperCase()
  const startTime = formatTime(item.Schedule?.StartAt)
  if (rrule.includes('COUNT=1')) return t('AIScheduledTasks.frequencyOnce')
  if (rrule.includes('FREQ=MINUTELY')) {
    const matched = rrule.match(/(?:^|;)INTERVAL=(\d+)/)
    const interval = Math.max(1, Number(matched?.[1] || 1))
    return t('AIScheduledTasks.everyNMinutes', { n: interval })
  }
  if (rrule.includes('FREQ=HOURLY')) {
    const matched = rrule.match(/(?:^|;)BYMINUTE=(\d+)/)
    if (matched) {
      return t('AIScheduledTasks.everyHourAtMinute', { minute: matched[1].padStart(2, '0') })
    }
    return t('AIScheduledTasks.frequencyHourly')
  }
  if (rrule.includes('BYDAY=MO,TU,WE,TH,FR')) return t('AIScheduledTasks.frequencyWeekdaysAtTime', { time: startTime })
  if (rrule.includes('FREQ=WEEKLY')) {
    const matched = rrule.match(/(?:^|;)BYDAY=([A-Z,]+)/)
    const dayMap: Record<string, string> = {
      SU: t('AIScheduledTasks.sunday'),
      MO: t('AIScheduledTasks.monday'),
      TU: t('AIScheduledTasks.tuesday'),
      WE: t('AIScheduledTasks.wednesday'),
      TH: t('AIScheduledTasks.thursday'),
      FR: t('AIScheduledTasks.friday'),
      SA: t('AIScheduledTasks.saturday'),
    }
    // BYDAY 可能包含多天（如 MO,WE），逐个翻译后拼接展示
    const days = (matched?.[1] || '')
      .split(',')
      .filter(Boolean)
      .map((day) => dayMap[day] || day)
    return t('AIScheduledTasks.everyWeekOnAtTime', {
      day: days.length > 0 ? days.join('、') : '-',
      time: startTime,
    })
  }
  if (rrule.includes('FREQ=DAILY')) {
    const matched = rrule.match(/(?:^|;)INTERVAL=(\d+)/)
    const interval = Math.max(1, Number(matched?.[1] || 1))
    // INTERVAL>1 的「每 N 天」没有专门文案，与自定义规则一样回退展示原始规则
    if (interval === 1) return t('AIScheduledTasks.frequencyDailyAtTime', { time: startTime })
  }
  // 解析不到预设（自定义规则，如 FREQ=MONTHLY）时回退展示原始规则，避免被误标为「每天」
  const rawRule = (item.Schedule?.RRule || '').replace(/^RRULE:/i, '')
  return rawRule || t('AIScheduledTasks.frequencyDailyAtTime', { time: startTime })
}

const AIScheduledTasks: React.FC<AIScheduledTasksProps> = React.memo((props) => {
  const { visible } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const [queryType, setQueryType] = useState<ScheduleQueryType>('all')
  const [keyWord, setKeyWord] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [spinning, setSpinning] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(false)
  const [isRef, setIsRef] = useState<boolean>(false)
  const [recalculation, setRecalculation] = useState<boolean>(false)
  const [filterVisible, setFilterVisible] = useState<boolean>(false)
  const [selectedSchedule, setSelectedSchedule] = useState<AIReActSchedule | null>(null)
  const [response, setResponse] = useState<QueryAIReActSchedulesResponse>({
    Data: [],
    Pagination: genDefaultPagination(20),
    Total: 0,
  })

  const listRef = useRef<HTMLDivElement>(null)
  const [inViewPort = true] = useInViewport(listRef)

  useEffect(() => {
    if (inViewPort) getList()
  }, [inViewPort])

  // 侧栏收起是 width:0 折叠而非 display:none，useInViewport 感知不到，需父级传入 visible；
  // 首次挂载（undefined）不刷新，仅「不可见→可见」时回到第一页重新拉取
  const prevVisibleRef = useRef<boolean>()
  useEffect(() => {
    const prev = prevVisibleRef.current
    prevVisibleRef.current = visible
    if (visible && prev === false) getList(1)
  }, [visible])
  const getList = useMemoizedFn(async (page?: number) => {
    setLoading(true)
    const newQuery: QueryAIReActSchedulesRequest = {
      Pagination: {
        ...genDefaultPagination(20),
        Page: page || 1,
      },
      Filter: {
        Status: queryType === 'all' ? [] : [queryType],
        Keyword: keyWord,
      },
    }
    if (newQuery.Pagination.Page === 1) {
      setSpinning(true)
    }
    try {
      const res = await grpcQueryAIReActSchedules(newQuery)
      if (!res.Data) res.Data = []
      const newPage = +(res.Pagination?.Page || 1)
      const length = newPage === 1 ? res.Data.length : res.Data.length + response.Data.length
      setHasMore(length < +res.Total)
      const newRes: QueryAIReActSchedulesResponse = {
        Data: newPage === 1 ? res?.Data : [...response.Data, ...(res?.Data || [])],
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
      setSpinning(false)
    }, 300)
  })
  const onSearch = useDebounceFn(
    (value) => {
      setKeyWord(value)
      setTimeout(() => {
        getList()
      }, 200)
    },
    { wait: 500, leading: true },
  ).run
  const loadMoreData = useMemoizedFn(() => {
    getList(+(response.Pagination?.Page || 1) + 1)
  })
  const onQueryTypeChange = useMemoizedFn((key: string) => {
    setQueryType(key as ScheduleQueryType)
    setKeyWord('')
    setFilterVisible(false)
    setTimeout(() => {
      getList()
    }, 200)
  })
  const onSetData = useMemoizedFn((item: AIReActSchedule) => {
    setResponse((preV) => ({
      ...preV,
      Data: preV.Data.map((ele) => {
        if (ele.UUID === item.UUID) {
          return { ...item }
        }
        return { ...ele }
      }),
    }))
    setRecalculation((v) => !v)
    // 选中项与列表解耦后，单条更新（编辑保存、详情自身启停回写）需同步刷新打开中的详情
    setSelectedSchedule((preV) => (preV?.UUID === item.UUID ? { ...item } : preV))
  })
  const openForm = useMemoizedFn((editing?: AIReActSchedule) => {
    const m = showYakitModal({
      title: (modalT) => modalT(editing ? 'AIScheduledTasks.editTitle' : 'AIScheduledTasks.createTitle'),
      width: 600,
      footer: null,
      content: (
        <ScheduledTasksForm
          editing={editing}
          onClose={() => m.destroy()}
          onSuccess={() => {
            if (editing?.UUID) {
              // 编辑成功只拉取该任务最新数据，经 onSetData 原位更新列表行，
              // 并在 editing.UUID 与选中项一致时同步刷新打开中的详情；不整表刷新以保留分页
              grpcGetAIReActSchedule({ UUID: editing.UUID }, true)
                .then((latest) => {
                  if (latest?.UUID) onSetData(latest)
                })
                .catch(() => {})
            } else {
              getList(1)
            }
            m.destroy()
          }}
        />
      ),
    })
  })
  const onAdd = useMemoizedFn(() => openForm())

  // 立即运行定时任务：成功后等待后端 ai_session 推送（最多 2s），
  // 收到推送则跳转历史会话并选中对应 sessionId；超时（旧引擎/通知丢失）则兜底切换并刷新选中第一个会话。
  const runScheduleNow = useMemoizedFn((item: AIReActSchedule) => {
    return grpcRunAIReActScheduleNow({ UUID: item.UUID })
      .then(() => waitForAISessionPush(2000))
      .then((sessionId) => {
        yakitNotify('success', t('AIScheduledTasks.runStarted'))
        emiter.emit(
          'switchAIAgentTab',
          JSON.stringify({
            type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
            params: {
              active: AIAgentTabListEnum.Session,
              show: true,
            },
          }),
        )
        setTimeout(() => {
          emiter.emit(
            'sessionData',
            JSON.stringify({
              type: 'refresh',
              sessionId,
              selectFirst: !sessionId,
              selectSessionId: sessionId,
            }),
          )
        }, 200)
      })
      .catch(() => {})
  })

  const onDeleteAfter = useMemoizedFn(() => {
    // 删除逻辑已内聚在详情组件中，这里只需刷新列表
    getList(1)
  })
  return (
    <div className={styles['ai-schedule-list-wrapper']} ref={listRef}>
      {selectedSchedule && (
        <AIScheduledTasksDetail
          initialSchedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          onDataChange={onSetData}
          onEdit={openForm}
          onRunNow={runScheduleNow}
          onDeleteAfter={onDeleteAfter}
        />
      )}
      <div className={styles['ai-schedule-list-header']}>
        <div className={styles['ai-schedule-list-header-left']}>
          <span className={styles['ai-schedule-list-header-title']}>{t('AIScheduledTasks.title')}</span>
          <YakitRoundCornerTag>{response.Total}</YakitRoundCornerTag>
        </div>
        <div className={styles['ai-schedule-list-header-right']}>
          <Tooltip title={t('AIScheduledTasks.maxConcurrentRuns')}>
            <YakitButton type="text2" icon={<OutlineQuestionmarkcircleIcon />} className={styles['question-icon']} />
          </Tooltip>
          <Tooltip title={t('YakitButton.add')}>
            <YakitButton type="text2" icon={<OutlinePlusIcon />} onClick={onAdd} />
          </Tooltip>
          <Tooltip title={t('YakitButton.refresh')}>
            <YakitButton type="text2" icon={<OutlineRefreshIcon />} onClick={() => getList(1)} />
          </Tooltip>
        </div>
      </div>
      <div className={styles['ai-schedule-list-search']}>
        <YakitInput
          prefix={<OutlineSearchIcon className={styles['search-icon']} />}
          allowClear
          placeholder={t('YakitInput.searchKeyWordPlaceholder')}
          value={keyWord}
          onChange={(e) => onSearch(e.target.value)}
        />
        <YakitDropdownMenu
          menu={{
            data: scheduleQueryTypeOptions(t),
            selectedKeys: [queryType],
            onClick: ({ key }) => onQueryTypeChange(key),
          }}
          dropdown={{
            trigger: ['click'],
            placement: 'bottomRight',
            visible: filterVisible,
            onVisibleChange: setFilterVisible,
          }}
        >
          <YakitButton
            type={queryType !== 'all' ? 'outline1' : 'outline2'}
            icon={<OutlineFilterIcon />}
            isActive={filterVisible}
          />
        </YakitDropdownMenu>
      </div>
      <div className={styles['ai-schedule-list-body']}>
        <YakitSpin spinning={spinning}>
          {response.Total > 0 ? (
            <RollingLoadList<AIReActSchedule>
              data={response.Data}
              loadMoreData={loadMoreData}
              renderRow={(rowData: AIReActSchedule, index: number) => {
                return (
                  <React.Fragment key={rowData.UUID}>
                    <AIScheduledTasksListItem
                      item={rowData}
                      onSetData={onSetData}
                      onRefresh={getList}
                      onEdit={openForm}
                      onOpenDetail={(detail) => setSelectedSchedule(detail)}
                      onRunNow={runScheduleNow}
                    />
                  </React.Fragment>
                )
              }}
              classNameRow={styles['ai-schedule-list-item']}
              classNameList={styles['ai-schedule-list']}
              page={+(response.Pagination?.Page || 1)}
              hasMore={hasMore}
              loading={loading}
              defItemHeight={104}
              rowKey="UUID"
              isRef={isRef}
              recalculation={recalculation}
            />
          ) : queryType !== 'all' || keyWord.trim() !== '' ? (
            // 列表为空时区分「全库为空」与「筛选/搜索无结果」，后者展示清空筛选空态
            <div className={styles['ai-list-empty-wrapper']}>
              <YakitEmpty
                title={t('AIScheduledTasks.emptyFilteredTitle')}
                description={t('AIScheduledTasks.emptyFilteredDescription')}
              />
              <div className={styles['ai-list-btns-wrapper']}>
                <YakitButton
                  type="outline1"
                  onClick={() => {
                    setQueryType('all')
                    setKeyWord('')
                    setTimeout(() => {
                      getList(1)
                    }, 200)
                  }}
                >
                  {t('AIScheduledTasks.clearFilter')}
                </YakitButton>
              </div>
            </div>
          ) : (
            <div className={styles['ai-list-empty-wrapper']}>
              <YakitEmpty
                title={t('AIScheduledTasks.emptyTitle')}
                description={t('AIScheduledTasks.emptyDescription')}
              />
              <div className={styles['ai-list-btns-wrapper']}>
                <YakitButton type="outline1" icon={<OutlinePlussmIcon />} onClick={onAdd}>
                  {t('AIScheduledTasks.create')}
                </YakitButton>
              </div>
            </div>
          )}
        </YakitSpin>
      </div>
    </div>
  )
})
export default AIScheduledTasks

const AIScheduledTasksListItem: React.FC<AIScheduledTasksListItemProps> = React.memo((props) => {
  const { item, onSetData, onRefresh, onEdit, onOpenDetail, onRunNow } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [visible, setVisible] = useState<boolean>(false)
  const [toggling, setToggling] = useState<boolean>(false)
  const onToggleEnabled = useMemoizedFn(async (e) => {
    e.stopPropagation()
    if (toggling) return
    setToggling(true)
    const enable = item.Status !== 'active'
    try {
      await grpcSetAIReActScheduleEnabled({ UUID: item.UUID, Enabled: enable })
      onSetData({
        ...item,
        Status: enable ? 'active' : 'paused',
      })
      yakitNotify('success', t(enable ? 'AIScheduledTasks.resumedSuccess' : 'AIScheduledTasks.pausedSuccess'))
    } catch {
    } finally {
      setTimeout(() => {
        setToggling(false)
      }, 200)
    }
  })
  const menuSelect = useMemoizedFn((key: string) => {
    switch (key) {
      case 'edit':
        onEdit(item)
        break
      case 'run':
        onRun()
        break
      case 'delete':
        onRemove()
        break
      default:
        break
    }
    setVisible(false)
  })
  const onRun = useMemoizedFn(() => {
    onRunNow?.(item)
  })
  const onRemove = useMemoizedFn(() => {
    // 删除不可恢复，先弹二次确认
    const m = YakitModalConfirm({
      type: 'white',
      width: 420,
      bodyStyle: { padding: '0 24px' },
      title: (modalT) => modalT('AIScheduledTasks.deleteScheduleConfirmTitle'),
      content: (modalT) => modalT('AIScheduledTasks.deleteScheduleConfirmContent', { name: item.Name }),
      onOkText: (modalT) => modalT('AIScheduledTasks.deleteScheduleConfirmOK'),
      onCancelText: (modalT) => modalT('AIScheduledTasks.cancel'),
      okButtonProps: { colors: 'danger', size: 'large' },
      cancelButtonProps: { size: 'large' },
      onOk: () => {
        grpcDeleteAIReActSchedule({ UUID: item.UUID })
          .then(() => {
            onRefresh()
            yakitNotify('success', t('YakitNotification.deleted'))
          })
          .catch(() => {})
        m.destroy()
      },
    })
  })
  return (
    <div className={styles['ai-schedule-list-item-content']} onClick={() => onOpenDetail?.(item)}>
      <div className={styles['ai-schedule-list-item-heard']}>
        <div className={styles['ai-schedule-list-item-heard-name']}>
          <span className={styles['ai-schedule-list-item-heard-name-text']}>{item.Name}</span>
        </div>
        <div
          className={styles['ai-schedule-list-item-heard-extra']}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          {item.Status !== 'completed' && (
            <Tooltip title={t(item.Status === 'active' ? 'AIScheduledTasks.pause' : 'AIScheduledTasks.resume')}>
              <YakitButton
                type="text2"
                size="small"
                icon={item.Status === 'active' ? <OutlinePauseIcon /> : <OutlinePlayIcon />}
                loading={toggling}
                disabled={toggling}
                onClick={onToggleEnabled}
              />
            </Tooltip>
          )}
          <YakitDropdownMenu
            menu={{
              data: scheduleMenu(t),
              onClick: ({ key }) => menuSelect(key),
            }}
            dropdown={{
              trigger: ['click', 'contextMenu'],
              placement: 'bottomLeft',
              visible: visible,
              onVisibleChange: setVisible,
            }}
          >
            <YakitButton isActive={visible} type="text2" size="small" icon={<OutlineDotsverticalIcon />} />
          </YakitDropdownMenu>
        </div>
      </div>
      <div className={styles['ai-schedule-list-item-description']} title={item.Payload?.Prompt}>
        {item.Payload?.Prompt}
      </div>
      <div className={styles['ai-schedule-list-item-footer']}>
        <div className={styles['ai-schedule-list-item-footer-left']}>
          {item.Status === 'completed' ? (
            <YakitTag size="small" color={scheduleStatusColor.completed}>
              {t('AIScheduledTasks.completed')}
            </YakitTag>
          ) : (
            item.Status !== 'active' && (
              <>
                <span className={styles['ai-schedule-list-item-footer-status-icon']}>
                  {item.Status === 'active' ? <OutlinePlayIcon /> : <OutlinePauseIcon />}
                </span>
                <span className={styles['ai-schedule-list-item-footer-status']}>
                  {t(`AIScheduledTasks.${item.Status}`)}
                </span>
              </>
            )
          )}
          <YakitTag
            color="success"
            size="small"
            className={classNames({
              [styles['rule-no-active']]: item.Status !== 'active',
            })}
          >
            {formatScheduleRule(item, t)}
          </YakitTag>
        </div>
      </div>
    </div>
  )
})
