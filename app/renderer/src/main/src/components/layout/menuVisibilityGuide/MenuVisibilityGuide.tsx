import { useEffect, useMemo, useState, type FC } from 'react'
import { Tour, type TourProps } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { LocalGVS } from '@/enums/localGlobal'
import { getLocalValue, setLocalValue } from '@/utils/kv'
import { isIRify, isMemfit, isYakit } from '@/utils/envfile'
import menuGuideStep1IRify from './image/menu-guide-step-1-irify.gif'
import menuGuideStep1Memfit from './image/menu-guide-step-1-memfit.gif'
import menuGuideStep1Yakit from './image/menu-guide-step-1-yakit.gif'
import menuGuideStep2IRify from './image/menu-guide-step-2-irify.gif'
import menuGuideStep2Memfit from './image/menu-guide-step-2-memfit.gif'
import menuGuideStep2Yakit from './image/menu-guide-step-2-yakit.gif'
import styles from './menuVisibilityGuide.module.scss'

export const MENU_VISIBILITY_GUIDE_HEADER_TARGET = 'menu-visibility-guide-header'
export const MENU_VISIBILITY_GUIDE_TAB_ADD_TARGET = 'menu-visibility-guide-tab-add'

const MENU_GUIDE_STEP_IMAGES = {
  irify: { 1: menuGuideStep1IRify, 2: menuGuideStep2IRify },
  memfit: { 1: menuGuideStep1Memfit, 2: menuGuideStep2Memfit },
  yakit: { 1: menuGuideStep1Yakit, 2: menuGuideStep2Yakit },
}

const getMenuGuideStepImage = (step: 1 | 2) => {
  if (isMemfit()) return MENU_GUIDE_STEP_IMAGES.memfit[step]
  if (isIRify()) return MENU_GUIDE_STEP_IMAGES.irify[step]
  if (isYakit()) return MENU_GUIDE_STEP_IMAGES.yakit[step]
  return ''
}

const waitForSelector = (selector: string, timeout = 8000) =>
  new Promise<Element | null>((resolve) => {
    const found = document.querySelector(selector)
    if (found) {
      resolve(found)
      return
    }
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) {
        observer.disconnect()
        resolve(el)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    window.setTimeout(() => {
      observer.disconnect()
      resolve(document.querySelector(selector))
    }, timeout)
  })

export const MenuVisibilityGuide: FC = () => {
  const { t } = useI18nNamespaces(['layout', 'yakitUi'])
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(0)

  const markSeen = useMemoizedFn(() => {
    setOpen(false)
    setLocalValue(LocalGVS.MenuVisibilityGuideSeen, true)
  })

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      try {
        const seen = await getLocalValue(LocalGVS.MenuVisibilityGuideSeen)
        if (cancelled || seen === true || seen === 'true') return
        await waitForSelector(`.${MENU_VISIBILITY_GUIDE_HEADER_TARGET}`)
        await waitForSelector(`.${MENU_VISIBILITY_GUIDE_TAB_ADD_TARGET}`)
        if (!cancelled) setOpen(true)
      } catch {
        if (!cancelled) setOpen(true)
      }
    }
    start()
    return () => {
      cancelled = true
    }
  }, [])

  const step1Image = getMenuGuideStepImage(1)
  const step2Image = getMenuGuideStepImage(2)
  const renderStepImage = (src: string) => (src ? <img className={styles.stepImage} src={src} alt="" /> : null)
  const steps = useMemo<TourProps['steps']>(
    () => [
      {
        title: t('UILayout.menuGuideStep1Title'),
        description: (
          <div className={styles.stepBody}>
            <div>{t('UILayout.menuGuideStep1Desc')}</div>
            {renderStepImage(step1Image)}
          </div>
        ),
        target: () => document.querySelector(`.${MENU_VISIBILITY_GUIDE_HEADER_TARGET}`) as HTMLElement,
        placement: 'bottomLeft',
        nextButtonProps: { children: t('YakitButton.next') },
      },
      {
        title: t('UILayout.menuGuideStep2Title'),
        description: (
          <div className={styles.stepBody}>
            <div>{t('UILayout.menuGuideStep2Desc')}</div>
            {renderStepImage(step2Image)}
          </div>
        ),
        target: () => document.querySelector(`.${MENU_VISIBILITY_GUIDE_TAB_ADD_TARGET}`) as HTMLElement,
        placement: 'bottomRight',
        prevButtonProps: { children: t('YakitButton.prev') },
        nextButtonProps: { children: t('UILayout.menuGuideStart') },
      },
    ],
    [step1Image, step2Image, t],
  )

  return (
    <Tour
      open={open}
      current={current}
      onChange={setCurrent}
      onClose={markSeen}
      disabledInteraction
      zIndex={10000}
      gap={{ offset: 4 }}
      indicatorsRender={(cur, total) => <span>{`${cur + 1}/${total}`}</span>}
      steps={steps}
    />
  )
}
