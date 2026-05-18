import React, { useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { LeftSideBarProps, LeftSideType } from '@/pages/yakRunner/LeftSideBar/LeftSideBarType'
import { IrifyAiCodeAuditFileTree } from './IrifyAiCodeAuditFileTree'
import { YakHelpDoc } from '@/pages/yakRunner/YakHelpDoc/YakHelpDoc'
import classNames from 'classnames'
import styles from '@/pages/yakRunner/LeftSideBar/LeftSideBar.module.scss'
import { YakitSideTab } from '@/components/yakitSideTab/YakitSideTab'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitTabsProps } from '@/components/yakitSideTab/YakitSideTabType'

export const IrifyLeftSideBar: React.FC<LeftSideBarProps & { fileTreeOnlyTabs: YakitTabsProps[] }> = (props) => {
  const { addFileTab, isUnShow, active, setActive, setIsUnShow, fileTreeOnlyTabs } = props
  const { t, i18n } = useI18nNamespaces(['yakRunner'])

  const rendered = useRef<Set<string>>(new Set(['file-tree']))

  const onSetActive = useMemoizedFn((type: string) => {
    if (!rendered.current.has(type as string)) {
      rendered.current.add(type as string)
    }
    setActive(type as LeftSideType)
  })

  return (
    <div
      className={classNames(styles['left-side-bar'], {
        [styles['folded']]: !active,
      })}
    >
      <YakitSideTab
        key={i18n.language}
        yakitTabs={fileTreeOnlyTabs}
        activeKey={active}
        onActiveKey={onSetActive}
        show={!isUnShow}
        setShow={(v) => setIsUnShow(!v)}
        t={t}
      />

      <div className={styles['left-side-bar-content']}>
        {rendered.current.has('file-tree') && (
          <div
            className={classNames(styles['content-wrapper'], {
              [styles['hidden-content']]: active !== 'file-tree' || isUnShow,
            })}
          >
            <IrifyAiCodeAuditFileTree addFileTab={addFileTab} />
          </div>
        )}
        {rendered.current.has('help-doc') && (
          <div
            className={classNames(styles['content-wrapper'], {
              [styles['hidden-content']]: active !== 'help-doc' || isUnShow,
            })}
          >
            <YakHelpDoc />
          </div>
        )}
      </div>
    </div>
  )
}
