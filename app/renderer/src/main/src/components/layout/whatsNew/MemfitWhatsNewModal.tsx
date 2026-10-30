import { useEffect, useState, type FC } from 'react'
import { useMemoizedFn } from 'ahooks'
import { grpcFetchLocalYakitVersion } from '@/apiUtils/grpc'
import { LocalGVS } from '@/enums/localGlobal'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { GuideFooter } from '@/pages/KnowledgeBase/compoment/GuideFooter'
import { getLocalValue, setLocalValue } from '@/utils/kv'
import { isMemfit } from '@/utils/envfile'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { MEMFIT_WHATS_NEW, shouldShowMemfitWhatsNew } from './memfitWhatsNewConfig'
import emiter from '@/utils/eventBus/eventBus'
import styles from './MemfitWhatsNewModal.module.scss'

export const MemfitWhatsNewModal: FC = () => {
  const { t } = useI18nNamespaces(['yakitUi'])
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(1)
  const [currentVersion, setCurrentVersion] = useState('')

  const openModal = useMemoizedFn(async () => {
    if (!MEMFIT_WHATS_NEW.items.length) return
    try {
      const version = currentVersion || (await grpcFetchLocalYakitVersion(true))
      setCurrentVersion(version)
      setStep(1)
      setVisible(true)
    } catch {
      setStep(1)
      setVisible(true)
    }
  })

  useEffect(() => {
    if (!isMemfit()) return
    let cancelled = false
    grpcFetchLocalYakitVersion(true)
      .then(async (version) => {
        if (cancelled) return
        const ackVersion = await getLocalValue(LocalGVS.WhatsNewAckVersion)
        if (cancelled) return
        const show = shouldShowMemfitWhatsNew({
          isMemfit: true,
          enabled: MEMFIT_WHATS_NEW.enabled,
          targetVersion: MEMFIT_WHATS_NEW.targetVersion,
          currentVersion: version,
          ackVersion,
          items: MEMFIT_WHATS_NEW.items,
        })
        if (!show) return
        setCurrentVersion(version)
        setStep(1)
        setVisible(true)
      })
      .catch(() => {})
    emiter.on('openMemfitWhatsNew', openModal)
    return () => {
      cancelled = true
      emiter.off('openMemfitWhatsNew', openModal)
    }
  }, [])

  const handleGotIt = useMemoizedFn(() => {
    setLocalValue(LocalGVS.WhatsNewAckVersion, MEMFIT_WHATS_NEW.targetVersion)
    setVisible(false)
  })

  if (!isMemfit()) return null

  return (
    <YakitModal
      hiddenHeader
      footer={null}
      open={visible}
      centered
      maskClosable={false}
      destroyOnClose
      width={900}
      bodyStyle={{ padding: 12 }}
    >
      <GuideFooter
        className={styles.content}
        step={step}
        onPrev={() => setStep((s) => s - 1)}
        onNext={() => setStep((s) => s + 1)}
        onFinish={handleGotIt}
        finishText={t('YakitButton.iKnow')}
        stopList={MEMFIT_WHATS_NEW.items}
      />
    </YakitModal>
  )
}
