import { memo, useState } from 'react'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { HorizontalScrollCard } from '@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard'
import { useStore } from 'zustand'
import classNames from 'classnames'
import styles from './AIHorizontalScrollCard.module.scss'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { MessageCirclePlusOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { ChatAlt2Solid } from '@yakit-libs/yakit-ui-icons/solid'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { ExpandAndRetract } from '@/pages/plugins/operator/expandAndRetract/ExpandAndRetract'
import AIContextToken from '../AIContextToken/AIContextToken'
import useAIAgentStore from '../../useContext/useStore'
import { useMemoizedFn } from 'ahooks'
import ContextDetailPopover from '../AIContextToken/ContextDetailPopover'
import { onNewChat } from '../../historyChat/HistoryChat'
import { Tooltip } from 'antd'

export const AIHorizontalScrollCard = memo(() => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const [isExpand, setIsExpand] = useState<boolean>(true)

  const { activeChat } = useAIAgentStore()

  const store = useCurrentStore()
  const yakExecResultCard = useStore(store, (state) => state.card)

  const onExpand = useMemoizedFn((e) => {
    e.stopPropagation()
    setIsExpand(!isExpand)
  })

  return (
    <ExpandAndRetract
      isExpand={isExpand}
      onExpand={onExpand}
      className={classNames(styles['expand-retract-wrapper'], {
        [styles['expand-retract-wrapper-collapsed']]: !yakExecResultCard.length,
      })}
      animationWrapperClassName={classNames(styles['expand-retract-animation-wrapper'], {
        [styles['expand-retract-animation-wrapper-hidden']]: !yakExecResultCard.length,
      })}
      expandText={t('YakitButton.expand')}
      retractText={t('YakitButton.collapse')}
    >
      <div className={classNames(styles['expand-retract-content'])}>
        <div className={styles['header']}>
          <div className={styles['title']}>
            <ChatAlt2Solid className={styles['chat-alt-icon']} color="currentColor" />
            <div className={styles['chat-title']}>{activeChat?.Title || t('AIChatContent.newChatTitle')}</div>
          </div>
          <div className={styles['extra']}>
            <AIContextToken />
            <ContextDetailPopover />
            <Tooltip title={t('AIChatContent.newChat')}>
              <YakitButton type="text2" icon={<MessageCirclePlusOutlined color="currentColor" />} onClick={onNewChat} />
            </Tooltip>
          </div>
        </div>
        {yakExecResultCard.length > 0 ? (
          <HorizontalScrollCard
            hiddenHeard={true}
            data={yakExecResultCard}
            className={classNames(styles['card-list-wrapper'], {
              [styles['card-list-wrapper-hidden']]: !isExpand,
            })}
            itemProps={{ size: 'small' }}
          />
        ) : null}
      </div>
    </ExpandAndRetract>
  )
})
