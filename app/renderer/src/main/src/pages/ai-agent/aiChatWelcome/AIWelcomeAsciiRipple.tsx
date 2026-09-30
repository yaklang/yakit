import { memo, useMemo, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useDocumentVisibility, useInViewport } from 'ahooks'
import AsciiRipple from '@/components/reactBits/AsciiRipple/AsciiRipple'
import type { AsciiRippleHandle } from '@/components/reactBits/AsciiRipple/AsciiRipple'
import { useTheme } from '@/hook/useTheme'
import { getAllYakitColorVars } from '@/utils/yakitColorVars'
import styles from './AIChatWelcome.module.scss'

export const AIWelcomeAsciiRipple = memo(({ targetRef }: { targetRef: RefObject<HTMLDivElement | null> }) => {
  const { theme } = useTheme()
  const colors = useMemo(() => {
    const colorList = getAllYakitColorVars(theme)
    return {
      textColor: theme === 'dark' ? colorList['--yakit-colors-Neutral-20'] : colorList['--yakit-colors-Neutral-30'],
      troughColor: colorList['--yakit-colors-Main-40'],
      rippleColor: colorList['--yakit-colors-Neutral-40'],
      textOpacity: theme === 'dark' ? 0.15 : 0.2,
    }
  }, [theme])
  const rippleRef = useRef<AsciiRippleHandle>(null)
  const [inViewport] = useInViewport(targetRef)
  const visibility = useDocumentVisibility()

  const active = visibility !== 'hidden' && inViewport !== false

  useEffect(() => {
    if (!active) rippleRef.current?.calm()
  }, [active])

  return (
    <div className={styles['welcome-ascii-ripple']} aria-hidden="true">
      <AsciiRipple ref={rippleRef} {...colors} interactionTargetRef={targetRef} interactive={active} resolution={2} />
    </div>
  )
})
