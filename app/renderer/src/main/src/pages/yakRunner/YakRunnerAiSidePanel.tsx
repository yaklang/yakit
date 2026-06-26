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
import styles from './YakRunnerAiSidePanel.module.scss'
import emiter from '@/utils/eventBus/eventBus'

const defaultAiTabs: YakitTabsProps[] = [
  {
    icon: <OutlineBotIcon />,
    label: 'HTTPHistory.AI',
    value: 'ai',
  },
]

export interface YakRunnerAiSidePanelProps {
  children: React.ReactNode
  rootClassName?: string
}

/** Yak Runner 右侧 AI 侧栏：消费 `useHistoryAIReActChat` */
export const YakRunnerAiSidePanel: React.FC<YakRunnerAiSidePanelProps> = ({ children, rootClassName }) => {
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
    emiter.on('onYakRunnerSendCodeBlock', onSendCodeBlockFun)
    return () => {
      emiter.off('onYakRunnerSendCodeBlock', onSendCodeBlockFun)
    }
  }, [onSendCodeBlockFun])

  const resizeBoxProps = useCreation(() => {
    return openTabsFlag
      ? { firstRatio: '80%', secondRatio: '20%' }
      : { firstRatio: 'calc(100% - 24px)', secondRatio: '24px' }
  }, [openTabsFlag])

  const aiChat =
    activeKey === 'ai' &&
    renderHistoryAIReActChat({
      className: styles.aiChatWrap,
      externalParameters: {
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
