import type React from 'react'
import { useMemo, useState } from 'react'
import { CursorClickOutlined, XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { MacOperatingSystemColorful, WindowsOperatingSystemColorful } from '@yakit-libs/yakit-ui-icons/colorful'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import i18n from '@/i18n/i18n'
import { openExternalWebsite } from '@/utils/openWebsite'
import { GUIDE_PLATFORM_IMAGES, ytrayGuidePreview, type GuidePlatform } from './assets/guideImages'
import styles from './BrowserInstancesGuideEmpty.module.scss'

const YTRAY_HOME = 'https://yaklang.io/ytray/'
const CHROME_FOR_TESTING = 'https://googlechromelabs.github.io/chrome-for-testing/'

type GuideStepBlock = {
  titleKey: string
  items: Array<{
    subtitleKey: string
    link?: { href: string; label: string }
    imageKeys: string[]
  }>
}

const GUIDE_STEPS: GuideStepBlock[] = [
  {
    titleKey: 'aiAgent:BrowserInstances.guideStep1Title',
    items: [
      {
        subtitleKey: 'aiAgent:BrowserInstances.guideStep1Desc',
        link: { href: YTRAY_HOME, label: YTRAY_HOME },
        imageKeys: ['step1'],
      },
    ],
  },
  {
    titleKey: 'aiAgent:BrowserInstances.guideStep2Title',
    items: [
      {
        subtitleKey: 'aiAgent:BrowserInstances.guideStep2Desc',
        link: { href: CHROME_FOR_TESTING, label: 'Chrome for Testing' },
        imageKeys: ['step2'],
      },
    ],
  },
  {
    titleKey: 'aiAgent:BrowserInstances.guideStep3Title',
    items: [
      {
        subtitleKey: 'aiAgent:BrowserInstances.guideStep3Desc',
        imageKeys: ['step3a', 'step3b'],
      },
    ],
  },
  {
    titleKey: 'aiAgent:BrowserInstances.guideStep4Title',
    items: [
      {
        subtitleKey: 'aiAgent:BrowserInstances.guideStep4Desc1',
        imageKeys: ['step4a'],
      },
      {
        subtitleKey: 'aiAgent:BrowserInstances.guideStep4Desc2',
        imageKeys: ['step4b'],
      },
    ],
  },
]

const detectGuidePlatform = (): GuidePlatform => {
  if (/Win/i.test(navigator.userAgent)) return 'windows'
  return 'macos'
}

const openExternalLink = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault()
  openExternalWebsite(href)
}

const PlatformLabel: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <span className={styles['guide-empty-platform-label']}>
    {icon}
    {text}
  </span>
)

type BrowserInstancesGuideManualProps = {
  open: boolean
  onClose: () => void
}

export const BrowserInstancesGuideManual: React.FC<BrowserInstancesGuideManualProps> = ({ open, onClose }) => {
  const [platform, setPlatform] = useState<GuidePlatform>(detectGuidePlatform)
  const platformOptions = useMemo(
    () => [
      {
        value: 'macos',
        label: <PlatformLabel icon={<MacOperatingSystemColorful size={14} />} text="MacOS" />,
      },
      {
        value: 'windows',
        label: <PlatformLabel icon={<WindowsOperatingSystemColorful size={14} />} text="Windows" />,
      },
    ],
    [],
  )
  const images = GUIDE_PLATFORM_IMAGES[platform]

  return (
    <YakitModal
      type="white"
      wrapClassName={styles['guide-empty-modal-wrap']}
      title={
        <div className={styles['guide-empty-modal-header']}>
          <span className={styles['guide-empty-modal-title']}>{i18n.t('aiAgent:BrowserInstances.guideTitle')}</span>
          <div className={styles['guide-empty-modal-platforms']}>
            <YakitRadioButtons
              buttonStyle="solid"
              value={platform}
              onChange={(event) => setPlatform(event.target.value as GuidePlatform)}
              options={platformOptions}
            />
          </div>
          <YakitButton
            type="text2"
            icon={<XOutlined color="currentColor" />}
            aria-label={i18n.t('aiAgent:BrowserInstances.guideCloseManual')}
            onClick={onClose}
          />
        </div>
      }
      centered
      open={open}
      onCancel={onClose}
      footerStyle={{ justifyContent: 'center' }}
      footer={
        <YakitButton type="primary" onClick={onClose}>
          {i18n.t('aiAgent:BrowserInstances.guideGotIt')}
        </YakitButton>
      }
      width={760}
      closable={false}
      destroyOnHidden
    >
      <div className={styles['guide-empty-modal']}>
        {GUIDE_STEPS.map((step) => (
          <section key={step.titleKey} className={styles['guide-empty-step']}>
            <div className={styles['guide-empty-step-title']}>{i18n.t(step.titleKey)}</div>
            {step.items.map((item) => (
              <div key={item.subtitleKey} className={styles['guide-empty-step-item']}>
                <div className={styles['guide-empty-step-subtitle']}>
                  <span>{i18n.t(item.subtitleKey)}</span>
                  {item.link && (
                    <a
                      href={item.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={openExternalLink(item.link.href)}
                    >
                      {item.link.label}
                    </a>
                  )}
                </div>
                <div
                  className={
                    item.imageKeys.length > 1
                      ? styles['guide-empty-step-images-multi']
                      : styles['guide-empty-step-images']
                  }
                >
                  {item.imageKeys.map((imageKey) => (
                    <img key={imageKey} src={images[imageKey]} alt={i18n.t(item.subtitleKey)} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </YakitModal>
  )
}

type BrowserInstancesGuideEmptyProps = {
  onOpenManual: () => void
}

export const BrowserInstancesGuideEmpty: React.FC<BrowserInstancesGuideEmptyProps> = ({ onOpenManual }) => {
  return (
    <div className={styles['guide-empty']}>
      <div className={styles['guide-empty-header']}>
        <div className={styles['guide-empty-header-title']}>{i18n.t('aiAgent:BrowserInstances.guideTitle')}</div>
        <div className={styles['guide-empty-header-subtitle']}>
          <span>{i18n.t('aiAgent:BrowserInstances.guideInstallPrefix')}</span>
          <a href={YTRAY_HOME} target="_blank" rel="noopener noreferrer" onClick={openExternalLink(YTRAY_HOME)}>
            {YTRAY_HOME}
          </a>
        </div>
      </div>
      <img
        className={styles['guide-empty-preview']}
        src={ytrayGuidePreview}
        alt={i18n.t('aiAgent:BrowserInstances.guidePreviewHeadline')}
      />
      <YakitButton
        type="text"
        icon={<CursorClickOutlined color="currentColor" />}
        className={styles['guide-empty-link']}
        onClick={onOpenManual}
      >
        {i18n.t('aiAgent:BrowserInstances.guideViewManual')}
      </YakitButton>
    </div>
  )
}
