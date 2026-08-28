import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { OutlineSearchIcon } from '@/assets/icon/outline'
import type { AISession } from '../../type/aiChat'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { getSessionDisplayTitle } from '../../historyChat/source'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import styles from './SessionSearchCommand.module.scss'

interface SessionSearchCommandProps {
  sessions: AISession[]
  onSelect: (session: AISession) => void
  onClose: () => void
}

export const SessionSearchCommand: React.FC<SessionSearchCommandProps> = memo(({ sessions, onSelect, onClose }) => {
  const { t } = useI18nNamespaces(['yakitUi'])
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const currentSessionId = useCurrentSessionId()

  const filteredSessions = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return sessions
    return sessions.filter((item) => getSessionDisplayTitle(item).toLowerCase().includes(keyword))
  }, [search, sessions])

  useEffect(() => {
    setActiveIndex(0)
  }, [search])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleKeyDown = useMemoizedFn((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, Math.max(filteredSessions.length - 1, 0)))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = filteredSessions[activeIndex]
      if (item) onSelect(item)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  })

  return (
    <div className={styles['session-command']}>
      <div className={styles['command-input']}>
        <YakitInput
          size="small"
          bordered={false}
          autoFocus
          prefix={<OutlineSearchIcon className={styles['search-icon']} />}
          placeholder={t('YakitInput.searchKeyWordPlaceholder')}
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div ref={listRef} className={styles['command-list']}>
        {filteredSessions.length === 0 ? (
          <div className={styles['command-empty']}>{t('YakitEmpty.searchEmpty')}</div>
        ) : (
          filteredSessions.map((item, index) => {
            const title = getSessionDisplayTitle(item)
            return (
              <div
                key={item.SessionID}
                data-index={index}
                className={classNames(styles['command-item'], {
                  [styles['command-item-active']]: index === activeIndex,
                  [styles['command-item-current']]: item.SessionID === currentSessionId,
                })}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => onSelect(item)}
                title={title}
              >
                <span className={classNames(styles['command-item-title'], 'yakit-content-single-ellipsis')}>
                  {title}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
})
