import type { FC } from 'react'
import { memo } from 'react'
import { BookOpenOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useCreation } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import ModalCards from '@/components/reactBits/ModalCards/ModalCards'
import type { CardData } from '@/components/reactBits/ModalCards/ModalCards'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useWelcomeAnimationDisabled } from '../../store/welcomeAnimationStore'
import { pentestGuideImages, trafficGuideImages, idorGuideImages } from './assets/guide/guideImages'
import styles from './WelcomeSceneCards.module.scss'

const WelcomeSceneCards: FC = memo(() => {
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
  const animationDisabled = useWelcomeAnimationDisabled()

  const cards = useCreation<CardData[]>(
    () => [
      {
        id: 'pentest',
        imageUrl: pentestGuideImages.step1[0],
        title: t('AIChatWelcome.scenePentestTitle'),
        description: t('AIChatWelcome.scenePentestDesc'),
        confirmLabel: t('BrowserInstances.guideGotIt'),
        steps: [
          {
            title: t('AIChatWelcome.scenePentestStep1Title'),
            items: [{ images: [...pentestGuideImages.step1] }],
          },
          {
            title: t('AIChatWelcome.scenePentestStep2Title'),
            items: [{ images: [...pentestGuideImages.step2] }],
          },
          {
            title: t('AIChatWelcome.scenePentestStep3Title'),
            items: [{ images: [...pentestGuideImages.step3] }],
          },
        ],
      },
      {
        id: 'traffic',
        imageUrl: trafficGuideImages.step1[0],
        title: t('AIChatWelcome.sceneTrafficTitle'),
        description: t('AIChatWelcome.sceneTrafficDesc'),
        confirmLabel: t('BrowserInstances.guideGotIt'),
        steps: [
          {
            title: t('AIChatWelcome.sceneTrafficStep1Title'),
            items: [{ images: [...trafficGuideImages.step1] }],
          },
          {
            title: t('AIChatWelcome.sceneTrafficStep2Title'),
            items: [{ images: [...trafficGuideImages.step2] }],
          },
          {
            title: t('AIChatWelcome.sceneTrafficStep3Title'),
            items: [{ images: [...trafficGuideImages.step3] }],
          },
          {
            title: t('AIChatWelcome.sceneTrafficStep4Title'),
            items: [{ images: [...trafficGuideImages.step4] }],
          },
        ],
      },
      {
        id: 'idor',
        imageUrl: idorGuideImages.step1[0],
        title: t('AIChatWelcome.sceneIdorTitle'),
        description: t('AIChatWelcome.sceneIdorDesc'),
        variant: 'banner',
        expandTrigger: 'footer',
        confirmLabel: t('BrowserInstances.guideGotIt'),
        footer: (
          <YakitButton type="outline2" radius icon={<BookOpenOutlined color="currentColor" />}>
            {t('AIChatWelcome.sceneReadDocs')}
          </YakitButton>
        ),
        steps: [
          {
            title: t('AIChatWelcome.sceneIdorStep1Title'),
            items: [{ images: [...idorGuideImages.step1] }],
          },
          {
            title: t('AIChatWelcome.sceneIdorStep2Title'),
            items: [{ images: [...idorGuideImages.step2] }],
          },
          {
            title: t('AIChatWelcome.sceneIdorStep3Title'),
            items: [
              {
                description: t('AIChatWelcome.sceneIdorStep3Desc1'),
                images: [...idorGuideImages.step3a],
              },
              {
                description: t('AIChatWelcome.sceneIdorStep3Desc2'),
                images: [...idorGuideImages.step3b],
              },
            ],
          },
          {
            title: t('AIChatWelcome.sceneIdorStep4Title'),
            items: [
              {
                description: t('AIChatWelcome.sceneIdorStep4Desc1'),
                images: [...idorGuideImages.step4a],
              },
              {
                description: t('AIChatWelcome.sceneIdorStep4Desc2'),
                images: [...idorGuideImages.step4b],
              },
            ],
          },
        ],
      },
    ],
    [i18nRefresh],
  )

  return (
    <div className={styles['welcome-scene']} data-testid="welcome-scene-cards">
      <div className={styles['subtitle']}>{t('AIChatWelcome.WelcomeSceneSubTitle')}</div>
      <ModalCards
        cards={cards}
        className={styles['scene-list']}
        animationSpeed={animationDisabled ? 'none' : 'normal'}
        ariaLabel={t('AIChatWelcome.WelcomeSceneSubTitle')}
        prevLabel={t('AIChatWelcome.scenePrev')}
        nextLabel={t('AIChatWelcome.sceneNext')}
        closeLabel={t('AIChatWelcome.sceneClose')}
      />
    </div>
  )
})

export default WelcomeSceneCards
