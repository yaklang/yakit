import React, { useEffect, useRef, useState } from 'react'
import { Tabs, Tooltip } from 'antd'
import { YakitAlert } from '@/components/yakitUI/YakitAlert/YakitAlert'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitSegmented } from '@/components/yakitUI/YakitSegmented/YakitSegmented'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { NodeProps } from './ComponentCard'
import styles from './interactive.module.scss'

export function InformationAlert({ node }: NodeProps) {
  return (
    <YakitAlert
      className={styles.informationAlert}
      type={node.props.severity}
      message={node.props.title}
      description={node.props.description}
      showIcon
      closable={false}
    />
  )
}

export function ViewTabs({ node, childNodes, state, change, ready, instanceId }: NodeProps) {
  const { t } = useI18nNamespaces(['aiAgent'])
  const items: { id: string; label: string; content: string }[] = node.props.items
  const initial = useRef(node.props.defaultTab || items[0].id)
  const selected = state?.view?.activeTab || initial.current
  const active = items.some((item) => item.id === selected) ? selected : items[0].id
  const select = (id: string) =>
    change({ ...state, value: state?.value || {}, view: { ...state?.view, activeTab: id } })
  const content = (id: string) =>
    childNodes?.[id] || (
      <p role="status" className={styles.secondary}>
        {t(ready ? 'InteractiveUI.tabUnavailable' : 'InteractiveUI.tabPending')}
      </p>
    )
  const segmented = node.props.variant === 'segmented'
  return (
    <div className={styles.viewTabs}>
      {node.props.title && <h4>{node.props.title}</h4>}
      {segmented ? (
        <>
          <YakitSegmented
            aria-label={node.props.title || t('InteractiveUI.views')}
            value={active}
            options={items.map((item) => ({ value: item.id, label: item.label }))}
            onChange={(value) => select(String(value))}
          />
          {items.map((item) => (
            <div
              key={item.id}
              role="region"
              aria-label={item.label}
              hidden={item.id !== active}
              className={styles.tabContent}
            >
              {content(item.content)}
            </div>
          ))}
        </>
      ) : (
        <Tabs
          id={`memfit-tabs-${encodeURIComponent(instanceId)}`}
          size="small"
          activeKey={active}
          onChange={select}
          destroyOnHidden={false}
          items={items.map((item) => ({
            key: item.id,
            label: item.label,
            children: content(item.content),
            forceRender: true,
          }))}
        />
      )}
    </div>
  )
}

export function InformationHint({ node, instanceId }: NodeProps) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const popover = node.component === 'Popover'
  const contentId = `memfit-hint-${encodeURIComponent(instanceId)}`
  useEffect(() => {
    if (!open) return
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      // Restore focus without retriggering a focus-based tooltip.
      if (popover) trigger.current?.focus()
    }
    const scroll = () => setOpen(false)
    document.addEventListener('keydown', keydown)
    window.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('keydown', keydown)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [open, popover])
  const button = (
    <button
      ref={trigger}
      type="button"
      className={styles.hintTrigger}
      aria-expanded={popover ? open : undefined}
      aria-controls={popover && open ? contentId : undefined}
      aria-describedby={!popover && open ? contentId : undefined}
    >
      {node.props.label}
    </button>
  )
  if (popover)
    return (
      <YakitPopover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement={node.props.placement}
        autoAdjustOverflow
        content={
          <div
            id={contentId}
            role="region"
            aria-label={node.props.title || node.props.label}
            className={styles.hintContent}
          >
            {node.props.title && <strong>{node.props.title}</strong>}
            <div>{node.props.content}</div>
          </div>
        }
      >
        {button}
      </YakitPopover>
    )
  return (
    <Tooltip
      id={contentId}
      open={open}
      onOpenChange={setOpen}
      trigger={['hover', 'focus', 'click']}
      placement={node.props.placement}
      autoAdjustOverflow
      title={<span className={styles.hintContent}>{node.props.content}</span>}
    >
      {button}
    </Tooltip>
  )
}
