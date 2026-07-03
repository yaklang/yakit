import React, { useEffect, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { Tooltip } from 'antd'
import { OutlineBotIcon, OutlinePlusIcon, OutlineXIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { YakitSideTab } from '@/components/yakitSideTab/YakitSideTab'
import { YakitTabsProps } from '@/components/yakitSideTab/YakitSideTabType'
import { useHistoryAIReActChat, useHistoryAIReActTaskDetails } from '@/components/historyAIReActChat'
import { AIInputFooterRightEnum } from '@/pages/ai-agent/template/type'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import classNames from 'classnames'
import styles from './IrifyAiCodeAuditSidePanelLayout.module.scss'
import { resolveIrifyAuditDefaultChatSeed } from './irifyAiCodeAuditConstants'
import emiter from '@/utils/eventBus/eventBus'
import { IrifyAiAuditStyleToggle } from './IrifyAiAuditStyleToggle'
import { IrifyAiCodeAuditStyle } from './irifyAiCodeAuditStyle'

const defaultAiTabs: YakitTabsProps[] = [
  {
    icon: <OutlineBotIcon />,
    label: 'HTTPHistory.AI',
    value: 'ai',
  },
]

type Placement = 'left' | 'right'

export interface IrifyAiCodeAuditSidePanelLayoutProps {
  children: React.ReactNode
  placement?: Placement
  rootClassName?: string
  sideTabs?: YakitTabsProps[]
  /** 当前审计风格（code / skill），驱动右下角风格切换的当前值 */
  auditStyle?: IrifyAiCodeAuditStyle
  /** 审计已开始后锁定，禁止切换风格 */
  auditStyleLocked?: boolean
  /** 切换风格回调（仅在未锁定时可调用） */
  onAuditStyleChange?: (style: IrifyAiCodeAuditStyle) => void
}

const IrifyAiCodeAuditSidePanelLayoutInner: React.FC<{
  placement: Placement
  rootClassName?: string
  children: React.ReactNode
  sideTabs: YakitTabsProps[]
  auditStyle?: IrifyAiCodeAuditStyle
  auditStyleLocked?: boolean
  onAuditStyleChange?: (style: IrifyAiCodeAuditStyle) => void
}> = ({ placement, children, rootClassName, sideTabs, auditStyle, auditStyleLocked, onAuditStyleChange }) => {
  const { t, i18n } = useI18nNamespaces(['history', 'irifyAiCodeAudit'])
  const { renderHistoryAIReActChat, setShowFreeChat, historyAIReActChatBridge, focusModeLoop } = useHistoryAIReActChat()
  const [activeKey, setActiveKey] = useState<string>('ai')
  const [openTabsFlag, setOpenTabsFlag] = useState<boolean>(true)

  useEffect(() => {
    setShowFreeChat(true)
  }, [setShowFreeChat])

  const onActiveKey = useMemoizedFn((key: string) => {
    if (key === 'ai') {
      setShowFreeChat(true)
    }
    setActiveKey(key)
  })

  const { detailsRightIcon } = useHistoryAIReActTaskDetails()

  const onSendCodeBlockFun = useMemoizedFn((res: string) => {
    const needOpenPanel = !openTabsFlag || activeKey !== 'ai'
    if (!openTabsFlag) {
      setOpenTabsFlag(true)
    }
    if (activeKey !== 'ai') {
      setActiveKey('ai')
    }
    setShowFreeChat(true)

    const forward = () => {
      emiter.emit('setAIInputByType', res)
    }
    if (needOpenPanel) {
      setTimeout(() => {
        forward()
      }, 200)
    } else {
      forward()
    }
  })

  useEffect(() => {
    emiter.on('onAiCodeAuditSendCodeBlock', onSendCodeBlockFun)
    return () => {
      emiter.off('onAiCodeAuditSendCodeBlock', onSendCodeBlockFun)
    }
  }, [onSendCodeBlockFun])

  const onProjectChangedFun = useMemoizedFn(() => {
    historyAIReActChatBridge.onNewChat()
  })

  useEffect(() => {
    emiter.on('onIrifyAiCodeAuditProjectChanged', onProjectChangedFun)
    return () => emiter.off('onIrifyAiCodeAuditProjectChanged', onProjectChangedFun)
  }, [onProjectChangedFun])

  const resizeBoxProps = useCreation(() => {
    if (placement === 'left') {
      return openTabsFlag
        ? { firstRatio: '20%', secondRatio: '80%' }
        : { firstRatio: '24px', secondRatio: 'calc(100% - 24px)' }
    }
    return openTabsFlag
      ? { firstRatio: '80%', secondRatio: '20%' }
      : { firstRatio: 'calc(100% - 24px)', secondRatio: '24px' }
  }, [openTabsFlag, placement])

  const aiChat =
    activeKey === 'ai' &&
    renderHistoryAIReActChat({
      className: styles.aiChatWrap,
      externalParameters: {
        defaultValue: resolveIrifyAuditDefaultChatSeed(auditStyle),
        isOpen: false,
        rightIcon: {
          history: true,
          dataDetails: { type: 'text2' },
          add: (
            <Tooltip title={t('newChat')}>
              <YakitButton
                type="text2"
                icon={<OutlinePlusIcon />}
                onClick={() => historyAIReActChatBridge.onNewChat()}
              />
            </Tooltip>
          ),
          close: <YakitButton type="text2" icon={<OutlineXIcon />} onClick={() => setOpenTabsFlag(false)} />,
          details: detailsRightIcon,
        },
        footerRightTypes: [
          {
            type: AIInputFooterRightEnum.AIFocusMode,
            component: (
              <IrifyAiAuditStyleToggle
                key="irify-audit-style-toggle"
                value={auditStyle ?? 'unset'}
                onChange={(style) => onAuditStyleChange?.(style)}
                locked={auditStyleLocked}
                className={styles.auditStyleToggle}
              />
            ),
            // props 不再使用（由 component 直接渲染），保留以满足类型结构
            props: {
              value: focusModeLoop,
              onChange: () => {},
              disabled: true,
            },
          },
        ],

        filterMentionType: ['focusMode'],
      },
    })

  const rail = (
    <div className={placement === 'left' ? styles.railLeft : styles.railRight}>
      <YakitSideTab
        key={i18n.language}
        t={t}
        type={placement === 'right' ? 'vertical-right' : undefined}
        yakitTabs={sideTabs}
        activeKey={activeKey}
        onActiveKey={onActiveKey}
        show={openTabsFlag}
        setShow={setOpenTabsFlag}
        className={styles.tabWrap}
      >
        <div className={styles.tabContent}>{aiChat}</div>
      </YakitSideTab>
    </div>
  )

  if (placement === 'left') {
    return (
      <div className={classNames(styles.layoutRoot, rootClassName)}>
        <YakitResizeBox
          isVer={false}
          freeze={openTabsFlag}
          isRecalculateWH={openTabsFlag}
          firstNode={() => rail}
          lineStyle={{ display: '' }}
          firstNodeStyle={{ minWidth: 0, flexShrink: 0 }}
          firstMinSize={openTabsFlag ? '325px' : '24px'}
          secondMinSize={720}
          secondNode={children}
          secondNodeStyle={{
            padding: undefined,
            display: '',
            minWidth: 0,
            overflow: 'hidden',
          }}
          {...resizeBoxProps}
        />
      </div>
    )
  }

  return (
    <div className={classNames(styles.layoutRoot, rootClassName)}>
      <YakitResizeBox
        isVer={false}
        freeze={openTabsFlag}
        isRecalculateWH={openTabsFlag}
        firstNode={children}
        lineStyle={{ display: '' }}
        firstNodeStyle={{ minWidth: 0, overflow: 'hidden' }}
        firstMinSize={openTabsFlag ? '480px' : '200px'}
        secondMinSize={openTabsFlag ? '340px' : '28px'}
        secondNode={() => rail}
        secondNodeStyle={{
          padding: undefined,
          display: '',
          minWidth: 0,
          overflow: 'hidden',
        }}
        {...resizeBoxProps}
      />
    </div>
  )
}

export const IrifyAiCodeAuditSidePanelLayout: React.FC<IrifyAiCodeAuditSidePanelLayoutProps> = ({
  children,
  placement = 'right',
  rootClassName,
  sideTabs = defaultAiTabs,
  auditStyle,
  auditStyleLocked,
  onAuditStyleChange,
}) => {
  return (
    <IrifyAiCodeAuditSidePanelLayoutInner
      placement={placement}
      rootClassName={rootClassName}
      sideTabs={sideTabs}
      auditStyle={auditStyle}
      auditStyleLocked={auditStyleLocked}
      onAuditStyleChange={onAuditStyleChange}
    >
      {children}
    </IrifyAiCodeAuditSidePanelLayoutInner>
  )
}
