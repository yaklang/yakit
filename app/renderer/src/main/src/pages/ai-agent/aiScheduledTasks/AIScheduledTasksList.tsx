import React, { useMemo, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import moment from 'moment'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import LoadingOutlined from '@ant-design/icons/lib/icons/LoadingOutlined'
import { Virtuoso } from 'react-virtuoso'
import {
  MessageCirclePlusOutlined,
  PencilOutlined,
  PlusSmOutlined,
  TimerOutlined,
  TrashOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import YakitCollapse from '@/components/yakitUI/YakitCollapse/YakitCollapse'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitRoundCornerTag } from '@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import type { AIScheduledTasksListItemProps, AIScheduledTasksListProps } from './type'
import { grpcDeleteAIReActSchedule, grpcSetAIReActScheduleEnabled } from './utils'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { formatScheduleRule } from './scheduleDisplay'
import AIScheduledTasksDetail from './aiScheduledTasksDetail/AIScheduledTasksDetail'
import styles from './AIScheduledTasksList.module.scss'

const scheduleGroups = [
  { status: 'active', label: 'AIScheduledTasks.runningGroup' },
  { status: 'paused', label: 'AIScheduledTasks.disabledGroup' },
  { status: 'completed', label: 'AIScheduledTasks.completed' },
] as const

const AIScheduledTasksList: React.FC<AIScheduledTasksListProps> = React.memo((props) => {
  const { data, loading, filtered, onClearFilter, onAdd, ...itemActions } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null)
  const groups = useMemo(
    () =>
      scheduleGroups.map((group) => ({
        ...group,
        items: data.filter((item) => item.Status === group.status),
      })),
    [data],
  )

  return (
    <div className={styles['ai-schedule-list-body']}>
      <YakitSpin spinning={loading}>
        {data.length > 0 ? (
          <div className={styles['ai-schedule-list']} ref={setScrollParent}>
            {groups
              .filter((group) => group.items.length > 0)
              .map((group) => {
                const expanded = !collapsed.includes(group.status)
                return (
                  <section key={group.status} aria-label={t(group.label)} className={styles['schedule-group']}>
                    <YakitCollapse
                      bordered={false}
                      className={styles['schedule-group-collapse']}
                      activeKey={expanded ? [group.status] : []}
                      onChange={(keys) =>
                        setCollapsed((previous) =>
                          keys.includes(group.status)
                            ? previous.filter((status) => status !== group.status)
                            : [...previous, group.status],
                        )
                      }
                      items={[
                        {
                          key: group.status,
                          label: (
                            <div className={styles['schedule-group-header']}>
                              <span>{t(group.label)}</span>
                              <YakitRoundCornerTag wrapperClassName={styles['schedule-count']}>
                                {group.items.length}
                              </YakitRoundCornerTag>
                            </div>
                          ),
                          children: scrollParent && expanded && (
                            <Virtuoso
                              customScrollParent={scrollParent}
                              data={group.items}
                              computeItemKey={(_index, item) => item.UUID}
                              defaultItemHeight={104}
                              overscan={200}
                              itemContent={(index, item) => (
                                <div
                                  className={index < group.items.length - 1 ? styles['schedule-group-item'] : undefined}
                                >
                                  <AIScheduledTasksListItem item={item} {...itemActions} />
                                </div>
                              )}
                            />
                          ),
                        },
                      ]}
                    />
                  </section>
                )
              })}
          </div>
        ) : (
          !loading && (
            <div className={styles['ai-list-empty-wrapper']}>
              <YakitEmpty
                title={t(filtered ? 'AIScheduledTasks.emptyFilteredTitle' : 'AIScheduledTasks.emptyTitle')}
                description={t(
                  filtered ? 'AIScheduledTasks.emptyFilteredDescription' : 'AIScheduledTasks.emptyDescription',
                )}
              />
              <YakitButton
                type="outline1"
                icon={filtered ? undefined : <PlusSmOutlined />}
                onClick={filtered ? onClearFilter : onAdd}
              >
                {t(filtered ? 'AIScheduledTasks.clearFilter' : 'AIScheduledTasks.create')}
              </YakitButton>
            </div>
          )
        )}
      </YakitSpin>
    </div>
  )
})
export default AIScheduledTasksList

const AIScheduledTasksListItem: React.FC<AIScheduledTasksListItemProps> = React.memo((props) => {
  const { item, onSetData, onRefresh, onEdit, onRunNow } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [detailOpen, setDetailOpen] = useState(false)
  const [toggling, setToggling] = useState<boolean>(false)
  const onToggleEnabled = useMemoizedFn(async () => {
    if (toggling || item.Status === 'completed') return
    setToggling(true)
    const enable = item.Status !== 'active'
    try {
      const latest = await grpcSetAIReActScheduleEnabled({ UUID: item.UUID, Enabled: enable })
      onSetData(latest)
      yakitNotify('success', t(enable ? 'AIScheduledTasks.resumedSuccess' : 'AIScheduledTasks.pausedSuccess'))
    } catch {
    } finally {
      setToggling(false)
    }
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
  const inactive = item.Status === 'paused'
  const scheduleRule = formatScheduleRule(item, t)
  const nextRun = item.NextRunAt && item.NextRunAt > 0 ? moment.unix(item.NextRunAt).format('YYYY-MM-DD HH:mm') : '-'

  return (
    <YakitPopover
      trigger="click"
      placement="right"
      open={detailOpen}
      onOpenChange={setDetailOpen}
      destroyOnHidden
      classNames={{ root: styles['detail-popover'] }}
      content={
        <div onClick={(event) => event.stopPropagation()}>
          {detailOpen && (
            <AIScheduledTasksDetail
              initialSchedule={item}
              onClose={() => setDetailOpen(false)}
              onDataChange={onSetData}
              onEdit={onEdit}
              onRunNow={onRunNow}
              onDeleteAfter={onRefresh}
            />
          )}
        </div>
      }
    >
      <div
        className={classNames(styles['schedule-card'], { [styles['schedule-card-inactive']]: inactive })}
        aria-label={item.Name}
      >
        <span
          className={classNames(styles['schedule-status-dot'], {
            [styles['schedule-status-dot-inactive']]: item.Status !== 'active',
          })}
          aria-hidden
        />
        <div className={styles['schedule-card-content']}>
          <div className={styles['schedule-card-header']}>
            <span className={styles['schedule-card-name']} title={item.Name}>
              {item.Name}
            </span>
            <div className={styles['schedule-card-controls']} onClick={(event) => event.stopPropagation()}>
              <div className={styles['schedule-card-actions']}>
                <Tooltip title={t('YakitButton.edit')}>
                  <YakitButton
                    type="text2"
                    icon={<PencilOutlined />}
                    aria-label={t('YakitButton.edit')}
                    onClick={() => onEdit(item)}
                  />
                </Tooltip>
                <Tooltip title={t('AIScheduledTasks.runNow')}>
                  <YakitButton
                    type="text2"
                    icon={<MessageCirclePlusOutlined />}
                    aria-label={t('AIScheduledTasks.runNow')}
                    onClick={() => onRunNow?.(item)}
                  />
                </Tooltip>
                <Tooltip title={t('YakitButton.delete')}>
                  <YakitButton
                    type="text2"
                    icon={<TrashOutlined />}
                    aria-label={t('YakitButton.delete')}
                    onClick={onRemove}
                  />
                </Tooltip>
              </div>
              {item.Status !== 'completed' && (
                <Tooltip title={t(inactive ? 'AIScheduledTasks.resume' : 'AIScheduledTasks.pause')}>
                  <span className={styles['schedule-switch-slot']}>
                    {toggling ? (
                      <LoadingOutlined spin role="status" aria-label={t('YakitSpin.loading')} />
                    ) : (
                      <YakitSwitch
                        checked={!inactive}
                        aria-label={t(inactive ? 'AIScheduledTasks.resume' : 'AIScheduledTasks.pause')}
                        wrapperClassName={styles['schedule-switch']}
                        onChange={onToggleEnabled}
                      />
                    )}
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
          <div className={styles['schedule-card-description']} title={item.Payload?.Prompt}>
            {item.Payload?.Prompt}
          </div>
          <div className={styles['schedule-card-footer']}>
            <Tooltip title={scheduleRule === undefined ? item.Schedule?.RRule : undefined}>
              <YakitTag
                className={styles['schedule-rule']}
                color={inactive ? undefined : 'success'}
                size="small"
                fullRadius
                border={false}
              >
                <TimerOutlined size={12} />
                {scheduleRule ?? t('AIScheduledTasks.frequencyOptions.custom')}
              </YakitTag>
            </Tooltip>
            {item.Status !== 'completed' && (
              <span
                className={styles['schedule-next-run']}
                title={t('AIScheduledTasks.nextExecution', { time: nextRun })}
              >
                {t('AIScheduledTasks.nextExecution', { time: nextRun })}
              </span>
            )}
          </div>
        </div>
      </div>
    </YakitPopover>
  )
})
