import type React from 'react'
import { useEffect } from 'react'
import { useMemoizedFn } from 'ahooks'
import { Tooltip } from 'antd'
import { PlusOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useHistoryAIReActChat } from '@/components/historyAIReActChat'
import { AIInputFooterRightEnum } from '@/pages/ai-agent/template/type'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import classNames from 'classnames'
import styles from './AuditCodeRuleGenChat.module.scss'
import emiter from '@/utils/eventBus/eventBus'
import { takePendingAuditCodeRuleGenSendCodeBlock } from './auditCodeRuleGenAiBridge'

export interface AuditCodeRuleGenChatProps {
  className?: string
}

/**
 * 代码审计左侧「规则生成」对话：固定 write_syntaxflow_rule，专注模式不可切换。
 * 必须在 HistoryAIReActChatProvider 内使用。
 */
export const AuditCodeRuleGenChat: React.FC<AuditCodeRuleGenChatProps> = ({ className }) => {
  const { t } = useI18nNamespaces(['history', 'yakRunner'])
  const { renderHistoryAIReActChat, setShowFreeChat, historyAIReActChatBridge, focusModeLoop } = useHistoryAIReActChat()

  useEffect(() => {
    setShowFreeChat(true)
  }, [setShowFreeChat])

  const onSendCodeBlockFun = useMemoizedFn((res: string) => {
    takePendingAuditCodeRuleGenSendCodeBlock()
    setShowFreeChat(true)
    emiter.emit('setAIInputByType', res)
  })

  useEffect(() => {
    const pending = takePendingAuditCodeRuleGenSendCodeBlock()
    if (pending) onSendCodeBlockFun(pending)
    emiter.on('onAuditCodeRuleGenSendCodeBlock', onSendCodeBlockFun)
    return () => {
      emiter.off('onAuditCodeRuleGenSendCodeBlock', onSendCodeBlockFun)
    }
  }, [onSendCodeBlockFun])

  return (
    <div className={classNames(styles.ruleGenChat, className)}>
      {renderHistoryAIReActChat({
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
                  icon={<PlusOutlined color="currentColor" />}
                  onClick={() => historyAIReActChatBridge.onNewChat()}
                />
              </Tooltip>
            ),
            taskDetails: true,
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
      })}
    </div>
  )
}
