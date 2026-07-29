import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { IconSolidAIIcon } from '@/assets/icon/colors'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './IrifyAiCodeAuditSelectionMenu.module.scss'

export interface IrifyAiCodeAuditSelectionMenuProps {
  close: () => void
  onSend: () => void
}

export const IrifyAiCodeAuditSelectionMenu: React.FC<IrifyAiCodeAuditSelectionMenuProps> = (props) => {
  const { close, onSend } = props
  const { t } = useI18nNamespaces(['yakRunner'])
  const [boxHidden, setBoxHidden] = useState<boolean>(true)
  const closeTimeoutIdRef = useRef<ReturnType<typeof setTimeout>>()

  const closeTimeoutFun = useMemoizedFn(() => {
    return setTimeout(() => {
      close()
    }, 5 * 1000)
  })

  useEffect(() => {
    closeTimeoutIdRef.current = closeTimeoutFun()
    const showTimeoutId = setTimeout(() => {
      setBoxHidden(false)
    }, 300)
    return () => {
      closeTimeoutIdRef.current && clearTimeout(closeTimeoutIdRef.current)
      clearTimeout(showTimeoutId)
    }
  }, [])

  const handleSend = useMemoizedFn(() => {
    closeTimeoutIdRef.current && clearTimeout(closeTimeoutIdRef.current)
    onSend()
    close()
  })

  return (
    <div
      className={classNames(styles['selection-menu'], {
        [styles['box-hidden']]: boxHidden,
      })}
      onMouseEnter={() => {
        closeTimeoutIdRef.current && clearTimeout(closeTimeoutIdRef.current)
      }}
      onMouseLeave={() => {
        closeTimeoutIdRef.current = closeTimeoutFun()
      }}
    >
      <div className={styles['selection-menu-simple']}>
        <div className={styles['show-box']}>
          <div className={styles['send-ai-box']} onClick={handleSend}>
            <IconSolidAIIcon className={styles['icon']} />
            <div className={styles['content']}>{t('RunnerTabs.sendAIActions')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
