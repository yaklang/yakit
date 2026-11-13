import type { ReactNode } from 'react'
import classNames from 'classnames'
import { ChevronRightOutlined, QuestionMarkCircleOutlined, RefreshOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIChatQSData, AIChatQSDataTypeEnum } from '../../hooks/aiRender'
import type { QuestionRequest } from '../../interactive-ui/types'
import styles from './QuestionQueue.module.scss'
import { Tooltip } from 'antd'

export type QuestionQueueItem = Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.UI_QUESTION }>

function BlockingQuestionIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M7.5 8V1M9.5 3L7.5 1L5.5 3M11.5 8C12.2625 8.45747 12.8936 9.10463 13.3317 9.87845C13.7698 10.6523 14.0001 11.5264 14 12.4156V15M5 5.5H4C3.86739 5.5 3.74021 5.55268 3.64645 5.64645C3.55268 5.74022 3.5 5.86739 3.5 6V12.5M10.0588 15L8.6675 12.875C8.50435 12.5881 8.46133 12.2482 8.54781 11.9297C8.6343 11.6111 8.84327 11.3397 9.12913 11.1747C9.41499 11.0096 9.75453 10.9643 10.0736 11.0487C10.3928 11.1331 10.6656 11.3402 10.8325 11.625L11.5 12.6444V6C11.5 5.86739 11.4473 5.74022 11.3536 5.64645C11.2598 5.55268 11.1326 5.5 11 5.5H10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function queueTitle(request: QuestionRequest) {
  if (request.form) return request.form.title || ''
  return (request.questions || [])
    .map((question) => question.title)
    .filter(Boolean)
    .join(' / ')
}

export function QuestionQueue({
  items,
  currentId,
  onSelect,
  onRefresh,
  children,
}: {
  items: QuestionQueueItem[]
  currentId: string
  onSelect?: (id: string) => void
  onRefresh?: () => void
  children: ReactNode
}) {
  const { t } = useI18nNamespaces(['aiAgent'])
  if (!items.length && !onRefresh) return <>{children}</>
  return (
    <YakitPopover
      trigger={['hover', 'click']}
      placement="bottomRight"
      mouseEnterDelay={0.1}
      mouseLeaveDelay={0.2}
      classNames={{ root: styles.popover }}
      content={
        <div className={styles.panel} onMouseDown={(event) => event.stopPropagation()}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>
              {t('InteractiveUI.questionQueue')}
              <YakitTag size="small" fullRadius>
                {items.length}
              </YakitTag>
            </span>
            {onRefresh && (
              <YakitButton
                type="text2"
                icon={<RefreshOutlined color="currentColor" />}
                iconPosition="end"
                className={styles.refreshButton}
                onClick={onRefresh}
              >
                {t('InteractiveUI.queueRefresh')}
              </YakitButton>
            )}
          </div>
          <div className={styles.list}>
            {items.map((entry) => {
              const { request } = entry.data
              const current = entry.id === currentId
              const blocking = request.mode === 'blocking'
              const kind = request.form ? t('InteractiveUI.queueForm') : t('InteractiveUI.queueChoice')
              const mode = blocking ? t('InteractiveUI.queueBlocking') : t('InteractiveUI.queueAsync')
              const title = queueTitle(request)
              return (
                <div
                  key={entry.id}
                  role="button"
                  tabIndex={0}
                  className={classNames(styles.item, {
                    [styles.current]: current,
                    [styles.blocking]: blocking && !current,
                  })}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (!current) onSelect?.(entry.id)
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    if (!current) onSelect?.(entry.id)
                  }}
                >
                  <span className={styles.body}>
                    <span className={styles.headline}>
                      <span className={classNames(styles.icon, { [styles.blockingIcon]: blocking })}>
                        {blocking ? <BlockingQuestionIcon /> : <QuestionMarkCircleOutlined color="currentColor" />}
                      </span>
                      <span className={styles.title} title={title}>
                        {title}
                      </span>
                    </span>
                    <span className={styles.meta}>
                      {mode}·{kind}
                    </span>
                  </span>

                  <div className={styles.pin}>
                    <YakitTag size="small" color={current ? 'main' : 'white'} fullRadius className={styles.pinTag}>
                      {current ? t('InteractiveUI.queueCurrent') : t('InteractiveUI.queuePending')}
                    </YakitTag>
                    {!current && (
                      <Tooltip title={t('InteractiveUI.queueAnswerNow')}>
                        <span className={styles.pinIcon} aria-label={t('InteractiveUI.queueAnswerNow')}>
                          <ChevronRightOutlined color="currentColor" />
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      }
    >
      <span className={styles.trigger}>{children}</span>
    </YakitPopover>
  )
}
