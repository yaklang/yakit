import React, { useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { LeftSideBarProps, LeftSideType } from './LeftSideBarType'
import { RunnerFileTree } from '../RunnerFileTree/RunnerFileTree'

import classNames from 'classnames'
import styles from './LeftSideBar.module.scss'
import { YakitSideTab } from '@/components/yakitSideTab/YakitSideTab'
import { YakRunnerIrifyAiCodeAuditTab } from '../YakRunnerIrifyAiCodeAudit'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export const LeftSideBar: React.FC<LeftSideBarProps> = (props) => {
  const { addFileTab, isUnShow, active, setActive, setIsUnShow } = props
  const { t, i18n } = useI18nNamespaces(['yakRunner'])

  // 控制初始渲染的变量，存在该变量里的类型则代表组件已经被渲染
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
      {/* 左侧边栏 */}
      <YakitSideTab
        key={i18n.language}
        yakitTabs={YakRunnerIrifyAiCodeAuditTab}
        activeKey={active}
        onActiveKey={onSetActive}
        show={!isUnShow}
        setShow={(v) => setIsUnShow(!v)}
        t={t}
      />

      {/* 侧边栏对应展示内容 */}
      <div className={styles['left-side-bar-content']}>
        {rendered.current.has('file-tree') && (
          <div
            className={classNames(styles['content-wrapper'], {
              [styles['hidden-content']]: active !== 'file-tree' || isUnShow,
            })}
          >
            <RunnerFileTree addFileTab={addFileTab} />
          </div>
        )}
      </div>
    </div>
  )
}
