import type { FC, RefObject } from 'react'
import { memo, useEffect, useRef } from 'react'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import CountUp from 'react-countup'
import { ChevronRightOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import emiter from '@/utils/eventBus/eventBus'
import { AIAgentTabListEnum, AITabsEnum, SwitchAIAgentTabEventEnum } from '../../defaultConstant'
import { useCustomFolder } from '../../components/aiFileSystemList/store/useCustomFolder'
import { useWelcomePanelStats } from '../hooks/useWelcomePanelStats'
import styles from './WelcomeTipsCards.module.scss'
import { ColorsRiskIcon, ColorsFlowIcon, ColorsFileSystemIcon } from '../icon'
import { TransparentButton } from '../TransparentButton'
import WelcomeSceneCards from '../WelcomeSceneCards/WelcomeSceneCards'

type WelcomeTipKey = 'risk' | 'traffic' | 'file-system'

interface WelcomeTipsCardsProps {
  compact?: boolean
  onEmptyChange?: (empty: boolean) => void
}

/** 同一数字只滚动一次。布局切换会卸掉 CountUp，再次挂载时直接显示终值。 */
const WelcomeCount: FC<{
  tipKey: WelcomeTipKey
  end: number
  playedCountRef: RefObject<Partial<Record<WelcomeTipKey, number>>>
}> = ({ tipKey, end, playedCountRef }) => {
  const animateRef = useRef<boolean | null>(null)
  if (animateRef.current === null) {
    animateRef.current = playedCountRef.current[tipKey] !== end
  }
  useEffect(() => {
    playedCountRef.current[tipKey] = end
  }, [playedCountRef, tipKey, end])

  const animate = animateRef.current
  return <CountUp start={animate ? 0 : end} end={end} duration={animate ? 1.2 : 0} separator="," />
}

const WelcomeTipsCards: FC<WelcomeTipsCardsProps> = memo(({ compact = false, onEmptyChange }) => {
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
  const containerRef = useRef<HTMLDivElement>(null)
  const playedCountRef = useRef<Partial<Record<WelcomeTipKey, number>>>({})
  const [inViewport = true] = useInViewport(containerRef)
  const { riskTotal, trafficTotal, riskCounts } = useWelcomePanelStats(inViewport)
  const customFolder = useCustomFolder()
  const isEmpty = trafficTotal !== undefined && riskCounts !== undefined && trafficTotal === 0 && riskTotal === 0
  useEffect(() => {
    onEmptyChange?.(isEmpty)
  }, [isEmpty, onEmptyChange])

  const welcomeTipsList = useCreation(
    () => [
      {
        key: 'risk' as const,
        title: t('AIChatWelcome.tipRiskTitle'),
        number: riskTotal,
        icon: <ColorsRiskIcon />,
        description: t('AIChatWelcome.tipViewFullData'),
        add: 0,
      },
      {
        key: 'traffic' as const,
        title: t('AIChatWelcome.tipTrafficTitle'),
        number: trafficTotal ?? 0,
        icon: <ColorsFlowIcon />,
        description: t('AIChatWelcome.tipViewFullData'),
        add: 0,
      },
      {
        key: 'file-system' as const,
        title: t('AIChatWelcome.tipFileSystemTitle'),
        number: customFolder?.length ?? 0,
        icon: <ColorsFileSystemIcon />,
        description: t('AIChatWelcome.tipOpenFileTree'),
        add: 0,
      },
    ],
    [riskTotal, trafficTotal, customFolder, i18nRefresh],
  )

  const handleTipClick = useMemoizedFn((key: WelcomeTipKey) => {
    switch (key) {
      case 'file-system':
        emiter.emit(
          'switchAIAgentTab',
          JSON.stringify({
            type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
            params: { active: AIAgentTabListEnum.File, show: true, toggle: true },
          }),
        )
        break
      case 'traffic':
        emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP }))
        break
      case 'risk':
        emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk }))
        break
      default:
        break
    }
  })

  if (isEmpty) {
    return (
      <div ref={containerRef}>
        <WelcomeSceneCards />
      </div>
    )
  }

  return (
    <div
      className={classNames(styles['welcome-tips-list'], {
        [styles['welcome-tips-list-compact']]: compact,
      })}
      ref={containerRef}
    >
      {welcomeTipsList.map((item) =>
        compact ? (
          <TransparentButton
            className={styles['welcome-tip-card-compact']}
            key={item.key}
            onClick={() => handleTipClick(item.key)}
          >
            <div className={styles['welcome-tip-compact-left']}>
              <div>{item.icon}</div>
              <div className={styles['welcome-tip-compact-copy']}>
                <span className={styles['welcome-tip-compact-title']} title={item.title}>
                  {item.title}
                </span>
                <div className={styles['welcome-tip-compact-add']}>
                  {t('AIChatWelcome.tipAdded')} &nbsp;<span>{item.add}</span>
                </div>
              </div>
            </div>
            <div className={styles['welcome-tip-compact-right']}>
              <div className={styles['welcome-tip-number']}>
                <WelcomeCount tipKey={item.key} end={item.number} playedCountRef={playedCountRef} />
              </div>
              <ChevronRightOutlined className={styles['welcome-tip-footer-icon']} color="currentColor" />
            </div>
          </TransparentButton>
        ) : (
          <div className={styles['welcome-tip-card']} key={item.key}>
            <div className={styles['welcome-tip-main']}>
              <div className={styles['welcome-tip-header']}>
                <div className={styles['welcome-tip-title']}>
                  {item.icon}
                  <span
                    className={classNames(styles['welcome-tip-title-text'], 'yakit-content-single-ellipsis')}
                    title={item.title}
                  >
                    {item.title}
                  </span>
                </div>
                <div className={styles['welcome-tip-number']}>
                  <WelcomeCount tipKey={item.key} end={item.number} playedCountRef={playedCountRef} />
                </div>
              </div>
              <div className={styles['welcome-tip-add']}>
                {t('AIChatWelcome.tipAdded')} &nbsp;<span>{item.add}</span>
              </div>
            </div>

            <TransparentButton className={styles['welcome-tip-footer']} onClick={() => handleTipClick(item.key)}>
              <span>{item.description}</span>
              <ChevronRightOutlined className={styles['welcome-tip-footer-icon']} color="currentColor" />
            </TransparentButton>
          </div>
        ),
      )}
    </div>
  )
})

export default WelcomeTipsCards
