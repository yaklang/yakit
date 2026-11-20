import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { AIChatQSData, AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import styles from './AINodeItem.module.scss'

export const AIImageModelRead = ({
  item,
}: {
  item: Extract<AIChatQSData, { type: AIChatQSDataTypeEnum.IMAGE_MODEL_READ }>
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { route, model, imageCount } = item.data
  return (
    <div className={styles.imageModelRead}>
      {t(route === 'native' ? 'ModelVision.nativeTrace' : 'ModelVision.visionTrace', { model, count: imageCount })}
    </div>
  )
}
