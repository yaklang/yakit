import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openExternalWebsite } from '@/utils/openWebsite'
import {
  BrowserInstancesGuideEmpty,
  BrowserInstancesGuideManual,
} from '../BrowserInstancesGuideEmpty/BrowserInstancesGuideEmpty'

vi.mock('@/i18n/i18n', () => ({
  default: {
    t: (key: string) => key,
    getFixedT: () => (key: string) => key,
  },
}))
vi.mock('@/utils/openWebsite', () => ({
  openExternalWebsite: vi.fn(),
}))
vi.mock('../BrowserInstancesGuideEmpty/assets/guideImages', () => ({
  ytrayGuidePreview: 'ytray-guide-preview.webp',
  GUIDE_PLATFORM_IMAGES: {
    macos: {
      step1: 'ytray-guide-step1.webp',
      step2: 'ytray-guide-step2-browsers-macos.webp',
      step3a: 'ytray-guide-step3-new-instance-macos.webp',
      step3b: 'ytray-guide-step3-load-plugin-macos.webp',
      step4a: 'ytray-guide-step4-extension-pair-macos.webp',
      step4b: 'ytray-guide-step4-approve.webp',
    },
    windows: {
      step1: 'ytray-guide-step1.webp',
      step2: 'ytray-guide-step2-browsers-windows.webp',
      step3a: 'ytray-guide-step3-new-instance-windows.webp',
      step3b: 'ytray-guide-step3-load-plugin-windows.webp',
      step4a: 'ytray-guide-step4-extension-pair-windows.webp',
      step4b: 'ytray-guide-step4-approve.webp',
    },
  },
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    onClick,
    'aria-label': ariaLabel,
  }: React.PropsWithChildren<{
    onClick?: () => void
    type?: string
    icon?: React.ReactNode
    className?: string
    'aria-label'?: string
  }>) => (
    <button type="button" aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({
    children,
    open,
    title,
    footer,
  }: React.PropsWithChildren<{
    open?: boolean
    title?: React.ReactNode
    footer?: React.ReactNode
    footerStyle?: React.CSSProperties
    onCancel?: () => void
    width?: number
    type?: string
    centered?: boolean
    closable?: boolean
    destroyOnHidden?: boolean
    wrapClassName?: string
  }>) => {
    if (!open) return null
    return (
      <div role="dialog">
        <div>{title}</div>
        {children}
        {footer}
      </div>
    )
  },
}))
vi.mock('@/components/yakitUI/YakitRadioButtons/YakitRadioButtons', () => ({
  YakitRadioButtons: ({
    value,
    onChange,
    options,
  }: {
    value?: string
    onChange?: (event: { target: { value: string } }) => void
    options?: Array<{ value: string; label: React.ReactNode }>
    size?: string
    buttonStyle?: string
  }) => (
    <div role="radiogroup">
      {options?.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange?.({ target: { value: option.value } })}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('@yakit-libs/yakit-ui-icons/colorful', () => ({
  MacOperatingSystemColorful: () => <span>mac-icon</span>,
  WindowsOperatingSystemColorful: () => <span>win-icon</span>,
}))

const GuideHarness: React.FC = () => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <BrowserInstancesGuideEmpty onOpenManual={() => setOpen(true)} />
      <BrowserInstancesGuideManual open={open} onClose={() => setOpen(false)} />
    </>
  )
}

describe('BrowserInstancesGuideEmpty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens manual modal with YakitRadioButtons platforms and keeps download link external', () => {
    render(<GuideHarness />)
    fireEvent.click(screen.getByRole('link', { name: 'https://yaklang.io/ytray/' }))
    expect(openExternalWebsite).toHaveBeenCalledWith('https://yaklang.io/ytray/')

    fireEvent.click(screen.getByText('aiAgent:BrowserInstances.guideViewManual'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /MacOS/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Windows/ })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Linux/ })).not.toBeInTheDocument()

    expect(screen.getByText('aiAgent:BrowserInstances.guideStep1Title')).toBeInTheDocument()
    expect(screen.getByText('aiAgent:BrowserInstances.guideStep2Title')).toBeInTheDocument()
    expect(screen.getByText('aiAgent:BrowserInstances.guideStep3Title')).toBeInTheDocument()
    expect(screen.getByText('aiAgent:BrowserInstances.guideStep4Title')).toBeInTheDocument()
    expect(screen.getByText('aiAgent:BrowserInstances.guideStep4Desc1')).toBeInTheDocument()
    expect(screen.getByText('aiAgent:BrowserInstances.guideStep4Desc2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Chrome for Testing' }))
    expect(openExternalWebsite).toHaveBeenCalledWith('https://googlechromelabs.github.io/chrome-for-testing/')

    expect(screen.getByAltText('aiAgent:BrowserInstances.guideStep1Desc')).toHaveAttribute(
      'src',
      'ytray-guide-step1.webp',
    )
    expect(screen.getByAltText('aiAgent:BrowserInstances.guideStep4Desc2')).toHaveAttribute(
      'src',
      'ytray-guide-step4-approve.webp',
    )

    fireEvent.click(screen.getByRole('radio', { name: /Windows/ }))
    expect(screen.getByRole('radio', { name: /Windows/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByAltText('aiAgent:BrowserInstances.guideStep1Desc')).toHaveAttribute(
      'src',
      'ytray-guide-step1.webp',
    )
    expect(screen.getByAltText('aiAgent:BrowserInstances.guideStep2Desc')).toHaveAttribute(
      'src',
      'ytray-guide-step2-browsers-windows.webp',
    )
    expect(screen.getByAltText('aiAgent:BrowserInstances.guideStep4Desc2')).toHaveAttribute(
      'src',
      'ytray-guide-step4-approve.webp',
    )

    fireEvent.click(screen.getByRole('radio', { name: /MacOS/ }))
    expect(screen.getByAltText('aiAgent:BrowserInstances.guideStep2Desc')).toHaveAttribute(
      'src',
      'ytray-guide-step2-browsers-macos.webp',
    )

    fireEvent.click(screen.getByText('aiAgent:BrowserInstances.guideGotIt'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(openExternalWebsite).toHaveBeenCalledTimes(2)
  })
})
