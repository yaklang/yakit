import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WelcomeSceneCards from '../WelcomeSceneCards'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('../../store/welcomeAnimationStore', () => ({
  useWelcomeAnimationDisabled: () => false,
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/reactBits/ModalCards/ModalCards', () => ({
  default: ({
    cards,
  }: {
    cards: Array<{ id: string; title: string; footer?: ReactNode; steps?: unknown[]; expandTrigger?: string }>
  }) => (
    <div data-testid="modal-cards">
      {cards.map((card) => (
        <div
          key={card.id}
          data-testid={`scene-card-${card.id}`}
          data-steps={card.steps?.length ?? 0}
          data-expand={card.expandTrigger || 'card'}
        >
          <span>{card.title}</span>
          {card.footer}
        </div>
      ))}
    </div>
  ),
}))
vi.mock('../assets/guide/guideImages', () => ({
  pentestGuideImages: { step1: ['p1'], step2: ['p2'], step3: ['p3'] },
  trafficGuideImages: { step1: ['t1'], step2: ['t2'], step3: ['t3'], step4: ['t4'] },
  idorGuideImages: {
    step1: ['i1a', 'i1b'],
    step2: ['i2a', 'i2b'],
    step3a: ['i3a'],
    step3b: ['i3b'],
    step4a: ['i4a'],
    step4b: ['i4b'],
  },
}))
vi.mock('../WelcomeSceneCards.module.scss', () => ({
  default: {
    'welcome-scene': 'welcome-scene',
    subtitle: 'subtitle',
    'scene-list': 'scene-list',
  },
}))

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('WelcomeSceneCards', () => {
  it('渲染三个场景卡并带上手册步骤', () => {
    render(<WelcomeSceneCards />)
    expect(screen.getByText('AIChatWelcome.WelcomeSceneSubTitle')).toBeInTheDocument()
    expect(screen.getByText('AIChatWelcome.scenePentestTitle')).toBeInTheDocument()
    expect(screen.getByText('AIChatWelcome.sceneTrafficTitle')).toBeInTheDocument()
    expect(screen.getByText('AIChatWelcome.sceneIdorTitle')).toBeInTheDocument()
    expect(screen.getByTestId('scene-card-pentest').getAttribute('data-steps')).toBe('3')
    expect(screen.getByTestId('scene-card-traffic').getAttribute('data-steps')).toBe('4')
    expect(screen.getByTestId('scene-card-idor').getAttribute('data-steps')).toBe('4')
    expect(screen.getByTestId('scene-card-idor').getAttribute('data-expand')).toBe('footer')
    expect(screen.getByRole('button', { name: 'AIChatWelcome.sceneReadDocs' })).toBeInTheDocument()
  })
})
