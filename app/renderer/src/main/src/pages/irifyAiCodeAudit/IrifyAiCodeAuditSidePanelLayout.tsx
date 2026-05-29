import React, { useEffect, useState } from 'react'
import { useCreation, useMemoizedFn } from 'ahooks'
import { Tooltip } from 'antd'
import { OutlineBotIcon, OutlinePlusIcon, OutlineXIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { YakitSideTab } from '@/components/yakitSideTab/YakitSideTab'
import { YakitTabsProps } from '@/components/yakitSideTab/YakitSideTabType'
import { useHistoryAIReActChat } from '@/components/historyAIReActChat'
import { AIInputFooterRightEnum } from '@/pages/ai-agent/template/type'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import classNames from 'classnames'
import styles from './IrifyAiCodeAuditSidePanelLayout.module.scss'
import { IRIFY_CODE_AUDIT_DEFAULT_CHAT_SEED } from './irifyAiCodeAuditConstants'

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
}

const IrifyAiCodeAuditSidePanelLayoutInner: React.FC<{
  placement: Placement
  rootClassName?: string
  children: React.ReactNode
  sideTabs: YakitTabsProps[]
}> = ({ placement, children, rootClassName, sideTabs }) => {
  const { t, i18n } = useI18nNamespaces(['history', 'irifyAiCodeAudit'])
  const { renderHistoryAIReActChat, setShowFreeChat, historyAIReActChatBridge, focusModeLoop } = useHistoryAIReActChat()
  console.log(focusModeLoop, 'focusModeLoop')

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
        defaultValue: IRIFY_CODE_AUDIT_DEFAULT_CHAT_SEED,
        isOpen: false,
        rightIcon: (
          <>
            <Tooltip title={t('newChat')}>
              <YakitButton
                type="text2"
                icon={<OutlinePlusIcon />}
                onClick={() => {
                  const { activeID, events, onStop, onChatFromHistory, setActiveChat } = historyAIReActChatBridge
                  if (activeID) {
                    onStop()
                    events.onReset()
                    onChatFromHistory(activeID)
                    setActiveChat(undefined)
                  }
                }}
              />
            </Tooltip>
            <YakitButton type="text2" icon={<OutlineXIcon />} onClick={() => setOpenTabsFlag(false)} />
          </>
        ),
        footerRightTypes: [
          {
            type: AIInputFooterRightEnum.AIFocusMode,
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
}) => {
  return (
    <IrifyAiCodeAuditSidePanelLayoutInner placement={placement} rootClassName={rootClassName} sideTabs={sideTabs}>
      {children}
    </IrifyAiCodeAuditSidePanelLayoutInner>
  )
}
