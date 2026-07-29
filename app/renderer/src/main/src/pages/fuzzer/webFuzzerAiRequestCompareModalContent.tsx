import { type FC } from 'react'

import { CodeComparison } from '@/pages/compare/DataCompare'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

import styles from './webFuzzerAiRequestCompareModalContent.module.scss'

export interface WebFuzzerAiRequestCompareModalContentProps {
  /** 当前页 Web Fuzzer 请求盒（与 `requestRef` / 会话一致） */
  currentRequest: string
  /** AI 卡片中的内容 */
  cardContent: string
  onCancel: () => void
  onApply: () => void
}

/**
 * Web Fuzzer AI 代码卡「对比」弹窗内容：Monaco 侧当前请求与卡片内容做 diff 对比。
 * 与 `webFuzzerAiRequestApplyBridge` 的读写注册配合使用。
 */
export const WebFuzzerAiRequestCompareModalContent: FC<WebFuzzerAiRequestCompareModalContentProps> = (props) => {
  const { currentRequest, cardContent, onCancel, onApply } = props
  const { t } = useI18nNamespaces(['webFuzzer', 'yakitUi'])

  return (
    <div className={styles['wrap']}>
      <div className={styles['top-bar']}>
        <div className={styles['title']}>{t('WebFuzzerAiRequestCompare.title')}</div>
        <div className={styles['actions']}>
          <YakitButton type="outline2" onClick={onCancel}>
            {t('YakitButton.cancel')}
          </YakitButton>
          <YakitButton onClick={onApply}>{t('YakitButton.apply')}</YakitButton>
        </div>
      </div>
      <div className={styles['compare-body']}>
        <div className={styles['content-title']}>
          <div className={styles['content-title-left']}>{t('WebFuzzerAiRequestCompare.leftTitle')}</div>
          <div className={styles['content-title-right']}>{t('WebFuzzerAiRequestCompare.rightTitle')}</div>
        </div>
        <div className={styles['code']}>
          <CodeComparison
            leftCode={currentRequest}
            rightCode={cardContent}
            readOnly={true}
            fontSize={12}
            originalEditable={false}
          />
        </div>
      </div>
    </div>
  )
}
