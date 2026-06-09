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
import styles from './YakRunnerAiSidePanelLayout.module.scss'

const defaultAiTabs: YakitTabsProps[] = [
  {
    icon: <OutlineBotIcon />,
    label: 'HTTPHistory.AI',
    value: 'ai',
  },
]

export interface YakRunnerAiSidePanelLayoutProps {
  children: React.ReactNode
  rootClassName?: string
}

export const YakRunnerAiSidePanelLayout: React.FC<YakRunnerAiSidePanelLayoutProps> = ({ children, rootClassName }) => {
  const { t, i18n } = useI18nNamespaces(['history', 'yakRunner'])
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

  const resizeBoxProps = useCreation(() => {
    return openTabsFlag
      ? { firstRatio: '72%', secondRatio: '28%' }
      : { firstRatio: 'calc(100% - 24px)', secondRatio: '24px' }
  }, [openTabsFlag])

  const aiChat =
    activeKey === 'ai' &&
    renderHistoryAIReActChat({
      className: styles.aiChatWrap,
      externalParameters: {
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
    <div className={styles.railRight}>
      <YakitSideTab
        key={i18n.language}
        t={t}
        type="vertical-right"
        yakitTabs={defaultAiTabs}
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
        secondNodeStyle={{ minWidth: 0, overflow: 'hidden' }}
        {...resizeBoxProps}
      />
    </div>
  )
}
