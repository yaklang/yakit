import { type FC, memo, useMemo } from 'react'
import type { AIChildWindowConcurrentStreamCardHeardProps } from './type'
import styles from './AIChildWindowConcurrentStreamCardHeard.module.scss'
import { OutlineRefreshIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { getAIStatusPresentation } from '@/pages/ai-agent/utils/AIStatusUtils'
import { Tooltip } from 'antd'
import ModalInfo from '../../../ModelInfo'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const AIChildWindowConcurrentStreamCardHeard: FC<AIChildWindowConcurrentStreamCardHeardProps> = memo((props) => {
  const { rowData, onRefresh } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const presentation = useMemo(() => getAIStatusPresentation(rowData?.data?.status), [rowData?.data?.status])
  const titleText = useMemo(() => {
    return rowData?.data?.taskName || ''
  }, [rowData?.data?.taskName])
  const modalInfo = useMemo(() => {
    if (!rowData) return undefined
    return { time: rowData.Timestamp, title: rowData.AIModelName, icon: rowData.AIService }
  }, [rowData?.Timestamp, rowData?.AIModelName, rowData?.AIService])
  return (
    <div>
      <div className={styles['chat-card-title']}>
        <div className={styles['chat-card-title-left']}>
          {presentation.icon && <div className={styles['chat-card-title-icon']}>{presentation.icon}</div>}
          <div className={styles['chat-card-title-text']}>{titleText}</div>
          <div className={styles['chat-card-title-extra']}>{modalInfo && <ModalInfo {...modalInfo} />}</div>
        </div>
        <div className={styles['chat-card-title-more']}>
          <Tooltip title={t('ConcurrentStreamCard.refresh')}>
            <YakitButton
              size="middle"
              type="text"
              icon={<OutlineRefreshIcon />}
              onClick={onRefresh}
              className={styles['expand-btn']}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  )
})

export default AIChildWindowConcurrentStreamCardHeard
