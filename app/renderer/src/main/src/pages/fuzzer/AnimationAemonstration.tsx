import { useEffect, useState, type CSSProperties } from 'react'
import type { FC } from 'react'
import styles from './AnimationAemonstration.module.scss'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import sequencemp4 from '@/assets/sequence.mp4'

// 爆破动画演示（MP4 动态 import，避免打进主 chunk）
interface BlastingAnimationAemonstrationProps {
  animationType?: string
  videoStyle?: CSSProperties
}
export const BlastingAnimationAemonstration: FC<BlastingAnimationAemonstrationProps> = ({
  animationType,
  videoStyle,
}) => {
  const { t } = useI18nNamespaces(['webFuzzer'])
  const [currentAnimationType, setCurrentAnimationType] = useState<string>(animationType || 'id')

  const [animationResources, setAnimationResources] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      let mod: { default: string }
      if (currentAnimationType === 'pwd') {
        mod = await import('@/assets/blasting-pwd.mp4')
      } else if (currentAnimationType === 'count') {
        mod = await import('@/assets/blasting-count.mp4')
      } else {
        mod = await import('@/assets/blasting-id.mp4')
      }
      if (!cancelled) setAnimationResources(mod.default)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentAnimationType])

  return (
    <div className={styles['blasting-animation-aemonstration']}>
      {!animationType && (
        <YakitRadioButtons
          size="large"
          buttonStyle="solid"
          value={currentAnimationType}
          options={[
            {
              value: 'id',
              label: t('BlastingAnimationAemonstration.bruteForceId'),
            },
            {
              value: 'pwd',
              label: t('BlastingAnimationAemonstration.bruteForcePassword'),
            },
            {
              value: 'count',
              label: t('BlastingAnimationAemonstration.bruteForceAccount'),
            },
          ]}
          onChange={(e) => setCurrentAnimationType((e.target as HTMLInputElement).value)}
        />
      )}

      <div className={styles['animation-cont-wrap']}>
        {animationResources ? <video src={animationResources} autoPlay loop style={videoStyle}></video> : null}
      </div>
    </div>
  )
}

// 序列动画演示
export const SequenceAnimationAemonstration: FC = () => {
  return (
    <div className={styles['sequence-animation-aemonstration']}>
      <div className={styles['animation-cont-wrap']}>
        <video src={sequencemp4} autoPlay loop></video>
      </div>
    </div>
  )
}
