import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { ChevronDoubleLeftOutlined, ChevronDoubleRightOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { AIMentionTabsEnum } from '../../../defaultConstant'
import type { YakitSideTabProps } from '@/components/yakitSideTab/YakitSideTabType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './AIChatMentionTabs.module.scss'

export interface AIChatMentionTabsProps {
  tabs: YakitSideTabProps['yakitTabs']
  activeKey: AIMentionTabsEnum
  tabCounts: Partial<Record<AIMentionTabsEnum, number>>
  onChange: (key: AIMentionTabsEnum) => void
}

/** @ 弹层顶部分类 Tab：窄宽自动滚入选中项，溢出时双箭头滚动 */
export const AIChatMentionTabs: React.FC<AIChatMentionTabsProps> = React.memo((props) => {
  const { tabs, activeKey, tabCounts, onChange } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  const tabsRef = useRef<HTMLDivElement>(null)
  const [tabScroll, setTabScroll] = useState({ left: 0, right: 0 })

  const updateTabScroll = useMemoizedFn(() => {
    const el = tabsRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setTabScroll({
      left: scrollLeft,
      right: Math.max(0, scrollWidth - clientWidth - scrollLeft),
    })
  })

  /** 仅在切换选中时滚入可视区；手动点箭头滚动时不要回拉 */
  const scrollActiveTabIntoView = useMemoizedFn(() => {
    const container = tabsRef.current
    if (!container) return
    const active = container.querySelector('[data-mention-tab-active="true"]') as HTMLElement | null
    if (!active) return
    const cRect = container.getBoundingClientRect()
    const aRect = active.getBoundingClientRect()
    const pad = 8
    if (aRect.left < cRect.left) {
      container.scrollLeft -= cRect.left - aRect.left + pad
    } else if (aRect.right > cRect.right) {
      container.scrollLeft += aRect.right - cRect.right + pad
    }
    updateTabScroll()
  })

  useEffect(() => {
    scrollActiveTabIntoView()
  }, [activeKey])

  useEffect(() => {
    const el = tabsRef.current
    if (!el || typeof ResizeObserver === 'undefined') {
      updateTabScroll()
      return
    }
    const ro = new ResizeObserver(() => {
      // 只刷新箭头显隐，不强制回滚到选中 tab（否则点箭头会抖回原点）
      updateTabScroll()
    })
    ro.observe(el)
    updateTabScroll()
    return () => ro.disconnect()
  }, [tabs.length])

  useEffect(() => {
    requestAnimationFrame(() => {
      updateTabScroll()
    })
  }, [tabCounts, tabs])

  const onScrollTabs = useMemoizedFn(() => {
    updateTabScroll()
  })
  const onScrollTabsLeft = useMemoizedFn((e: React.MouseEvent) => {
    e.stopPropagation()
    tabsRef.current?.scrollBy({ left: -140 })
  })
  const onScrollTabsRight = useMemoizedFn((e: React.MouseEvent) => {
    e.stopPropagation()
    tabsRef.current?.scrollBy({ left: 140 })
  })

  const showTabScrollLeft = tabScroll.left > 2
  const showTabScrollRight = tabScroll.right > 2

  return (
    <div className={styles['mention-header']}>
      <div className={styles['mention-tabs-wrap']}>
        {showTabScrollLeft ? (
          <button
            type="button"
            className={styles['mention-tabs-arrow']}
            onClick={onScrollTabsLeft}
            aria-label="scroll-tabs-left"
          >
            <ChevronDoubleLeftOutlined color="currentColor" />
          </button>
        ) : null}
        <div className={styles['mention-tabs']} ref={tabsRef} onScroll={onScrollTabs}>
          {tabs.map((tab) => {
            const isActive = tab.value === activeKey
            // 「全部」聚合不准（各分区分页/过滤口径不一致），不展示角标
            const count = tab.value === AIMentionTabsEnum.All ? undefined : tabCounts[tab.value as AIMentionTabsEnum]
            return (
              <button
                key={tab.value}
                type="button"
                data-mention-tab-active={isActive ? 'true' : undefined}
                className={classNames(styles['mention-tab'], {
                  [styles['mention-tab-active']]: isActive,
                })}
                onClick={() => onChange(tab.value as AIMentionTabsEnum)}
              >
                {tab.icon ? <span className={styles['mention-tab-icon']}>{tab.icon}</span> : null}
                <span className={styles['mention-tab-label']}>{t(tab.label as string)}</span>
                {count != null && count > 0 ? <span className={styles['mention-tab-count']}>{count}</span> : null}
              </button>
            )
          })}
        </div>
        {showTabScrollRight ? (
          <button
            type="button"
            className={styles['mention-tabs-arrow']}
            onClick={onScrollTabsRight}
            aria-label="scroll-tabs-right"
          >
            <ChevronDoubleRightOutlined color="currentColor" />
          </button>
        ) : null}
      </div>
    </div>
  )
})
