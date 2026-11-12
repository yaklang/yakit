import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ModelContextControl, { ContextUsageRing, contextUsagePercent, formatContextTokens } from '../ModelContextControl'
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, args?: Record<string, string>) =>
      key === 'AIContextToken.contextAdjustmentReason' ? `${args?.previous} → ${args?.threshold}` : key,
  }),
}))
const context = {
  provider: 'openai',
  model: 'model',
  context_tokens: 500 * 1000,
  threshold_tokens: 100 * 1000,
  prompt_tokens: 91 * 1000,
  source: 'manual' as const,
  pending: false,
  too_small: false,
}
afterEach(() => vi.unstubAllGlobals())
const preparePointer = () => {
  vi.stubGlobal('PointerEvent', MouseEvent)
  const slider = screen.getByRole('slider')
  slider.setPointerCapture = vi.fn()
  slider.releasePointerCapture = vi.fn()
  vi.spyOn(slider.parentElement!, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 200,
    height: 28,
  } as DOMRect)
  return slider
}
describe('model context slider', () => {
  it.each([undefined, 100000, 102400])('keeps the global 100K floor with reported minimum %s', (minimum) => {
    const onChange = vi.fn(() => true)
    render(
      <ModelContextControl
        context={{ ...context, threshold_tokens: 102400, minimum_threshold_tokens: minimum }}
        onChange={onChange}
      />,
    )
    const slider = preparePointer()
    const input = screen.getByRole('spinbutton')
    expect(screen.getByText('100K', { exact: true })).toBeInTheDocument()
    expect(slider).toHaveAttribute('aria-valuemin', '100000')
    expect(input).toHaveAttribute('min', '100')
    expect(input).toHaveValue(102.4)
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith(100000)
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenLastCalledWith(100000)
    fireEvent.pointerDown(slider, { button: 0, clientX: 10 })
    fireEvent.pointerMove(slider, { clientX: -200 })
    fireEvent.pointerUp(slider)
    expect(onChange).toHaveBeenLastCalledWith(100000)
  })

  it.each([512000, 102400, 104857, 1024000])('preserves the exact saved %i tokens until an explicit edit', (tokens) => {
    const onChange = vi.fn(() => true)
    render(<ModelContextControl context={{ ...context, threshold_tokens: tokens }} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(tokens / 1000)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(tokens))
    fireEvent.focus(input)
    fireEvent.blur(input)
    fireEvent.change(input, { target: { value: String(tokens / 1000) } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'AIContextToken.resetContextThreshold' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(500000)
  })

  it('accepts fractional K input without rounding away integer tokens', () => {
    const onChange = vi.fn(() => true)
    render(<ModelContextControl context={context} onChange={onChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '100.001' } })
    fireEvent.blur(screen.getByRole('spinbutton'))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(100001)
  })

  it('warns at 750,001 tokens but not at 750,000 tokens', () => {
    const view = render(<ModelContextControl context={{ ...context, threshold_tokens: 750000 }} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    view.rerender(<ModelContextControl context={{ ...context, threshold_tokens: 750001 }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('AIContextToken.contextTooLarge')
  })

  it('explains auto-adjust from the help icon without changing its default enabled state', async () => {
    const onAutoAdjustChange = vi.fn(() => true)
    render(<ModelContextControl context={context} onChange={() => true} onAutoAdjustChange={onAutoAdjustChange} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'AIContextToken.autoAdjustHelpLabel' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('AIContextToken.autoAdjustHelp')
    expect(screen.getByRole('switch')).toBeChecked()
    expect(onAutoAdjustChange).not.toHaveBeenCalled()
  })

  it('keeps the auto-adjust switch visible alongside a large-context warning', () => {
    const onAutoAdjustChange = vi.fn(() => true)
    const view = render(
      <ModelContextControl
        context={{ ...context, threshold_tokens: 999 * 1000 }}
        onChange={() => true}
        onAutoAdjustChange={onAutoAdjustChange}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('AIContextToken.contextTooLarge')
    expect(screen.getByRole('switch', { name: 'AIContextToken.autoAdjust' })).toBeChecked()
    fireEvent.click(screen.getByRole('switch'))
    expect(onAutoAdjustChange).toHaveBeenCalledExactlyOnceWith(false)
    view.rerender(
      <ModelContextControl
        context={{ ...context, threshold_tokens: 999 * 1000, disable_auto_adjust: true }}
        onChange={() => true}
        onAutoAdjustChange={onAutoAdjustChange}
      />,
    )
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(screen.getByRole('spinbutton')).toHaveValue(999)
  })

  it.each([true, false])(
    'keeps an automatic adjustment explainable after success or a restored model setting: history=%s',
    async (hasHistory) => {
      render(
        <ModelContextControl
          context={{
            ...context,
            source: 'learned',
            threshold_tokens: 200 * 1000,
            change: hasHistory
              ? {
                  id: 'recovered',
                  reason: 'confirmed',
                  previous_threshold_tokens: 500 * 1000,
                  threshold_tokens: 200 * 1000,
                }
              : undefined,
          }}
          onChange={() => true}
        />,
      )
      const badge = screen.getByText('AIContextToken.contextAdjusted')
      expect(screen.getByText('model')).toBeInTheDocument()
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String(200 * 1000))
      fireEvent.focus(badge)
      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        hasHistory ? '500K → 200K' : 'AIContextToken.contextAdjustmentSaved',
      )
    },
  )

  it.each([100, 80])('does not change a %iK threshold when the handle is clicked without dragging', (threshold) => {
    const onChange = vi.fn(() => true)
    render(<ModelContextControl context={{ ...context, threshold_tokens: threshold * 1000 }} onChange={onChange} />)
    const slider = preparePointer()
    fireEvent.pointerDown(slider, { button: 0, clientX: 46, clientY: 126 })
    fireEvent.pointerUp(slider)
    expect(onChange).not.toHaveBeenCalled()
  })
  it('uses the compression threshold as the usage denominator, not the model capacity', () => {
    expect(contextUsagePercent(context)).toBe(91)
    const view = render(<ContextUsageRing context={context} />)
    expect(view.container.querySelector('[pathLength="100"]')).toHaveAttribute('stroke-dasharray', '91 100')
    view.rerender(<ContextUsageRing context={{ ...context, prompt_tokens: 120 * 1000 }} />)
    expect(contextUsagePercent({ ...context, prompt_tokens: 120 * 1000 })).toBe(120)
    expect(view.container.querySelector('[pathLength="100"]')).toHaveAttribute('stroke-dasharray', '100 100')
  })
  it('previews a horizontal handle drag without jumping and submits only on release', () => {
    const onChange = vi.fn(() => true)
    render(<ModelContextControl context={context} onChange={onChange} />)
    const slider = preparePointer()
    fireEvent.pointerDown(slider, { button: 0, clientX: 7, clientY: 14 })
    fireEvent.pointerMove(slider, { clientX: 107, clientY: 14 })
    expect(slider).toHaveAttribute('aria-valuenow', String(550 * 1000))
    expect(slider).toHaveAttribute('aria-orientation', 'horizontal')
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.pointerUp(slider)
    expect(onChange).toHaveBeenCalledExactlyOnceWith(550 * 1000)
  })
  it('keeps drag geometry stable when the surrounding layout changes', () => {
    const onChange = vi.fn(() => true)
    render(<ModelContextControl context={context} onChange={onChange} />)
    const slider = preparePointer()
    fireEvent.pointerDown(slider, { button: 0, clientX: 7, clientY: 14 })
    fireEvent.pointerMove(slider, { clientX: 167, clientY: 14 })
    expect(screen.getByRole('alert')).toHaveTextContent('AIContextToken.contextTooLarge')
    vi.mocked(slider.parentElement!.getBoundingClientRect).mockReturnValue({
      left: 20,
      top: 50,
      width: 180,
      height: 28,
    } as DOMRect)
    fireEvent.pointerMove(slider, { clientX: 167, clientY: 14 })
    fireEvent.pointerUp(slider)
    expect(onChange).toHaveBeenCalledExactlyOnceWith(820 * 1000)
  })
  it('cancels an unfinished drag when the server calibrates the threshold', () => {
    const onChange = vi.fn(() => true)
    const view = render(<ModelContextControl context={context} onChange={onChange} />)
    const slider = preparePointer()
    fireEvent.pointerDown(slider, { button: 0, clientX: 7, clientY: 14 })
    fireEvent.pointerMove(slider, { clientX: 107, clientY: 14 })
    view.rerender(
      <ModelContextControl
        context={{
          ...context,
          threshold_tokens: 80 * 1000,
          too_small: true,
          change: {
            id: 'overflow',
            reason: 'overflow',
            previous_threshold_tokens: context.threshold_tokens,
            threshold_tokens: 80 * 1000,
          },
        }}
        onChange={onChange}
      />,
    )
    fireEvent.pointerUp(slider)
    expect(onChange).not.toHaveBeenCalled()
    expect(slider).toHaveAttribute('aria-valuenow', String(80 * 1000))
    expect(screen.getByRole('alert')).toHaveTextContent('AIContextToken.contextTooSmall')
  })
  it('keeps a new drag in progress when an acknowledgement confirms the already displayed threshold', () => {
    const onChange = vi.fn(() => true)
    const view = render(<ModelContextControl context={context} onChange={onChange} />)
    const slider = preparePointer()
    fireEvent.pointerDown(slider, { button: 0, clientX: 7 })
    fireEvent.pointerMove(slider, { clientX: 107 })
    view.rerender(
      <ModelContextControl
        context={{
          ...context,
          change: {
            id: 'manual-ack',
            reason: 'manual',
            previous_threshold_tokens: 200 * 1000,
            threshold_tokens: context.threshold_tokens,
          },
        }}
        onChange={onChange}
      />,
    )
    expect(slider).toHaveAttribute('aria-valuenow', String(550 * 1000))
    fireEvent.pointerMove(slider, { clientX: 127 })
    fireEvent.pointerUp(slider)
    expect(onChange).toHaveBeenCalledExactlyOnceWith(640 * 1000)
  })
  it('cancels pointer gestures without saving', () => {
    const onChange = vi.fn(() => true)
    render(<ModelContextControl context={context} onChange={onChange} />)
    const slider = preparePointer()
    fireEvent.pointerDown(slider, { button: 0, clientX: 7, clientY: 14 })
    fireEvent.pointerMove(slider, { clientX: 107, clientY: 14 })
    fireEvent.pointerCancel(slider)
    expect(onChange).not.toHaveBeenCalled()
    expect(slider).toHaveAttribute('aria-valuenow', String(100 * 1000))
  })
  it('enforces the manual floor for keyboard and numeric input, including learned small models', () => {
    const onChange = vi.fn(() => true)
    render(
      <ModelContextControl
        context={{ ...context, threshold_tokens: 51 * 1000, context_tokens: 64 * 1000, too_small: true }}
        onChange={onChange}
      />,
    )
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowDown' })
    expect(onChange).toHaveBeenLastCalledWith(100 * 1000)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '20' } })
    fireEvent.blur(screen.getByRole('spinbutton'))
    expect(onChange).toHaveBeenLastCalledWith(100 * 1000)
    expect(screen.getByRole('alert')).toHaveTextContent('AIContextToken.contextTooSmall')
  })
  it.each(['Enter', 'blur'])('bounds numeric input to the displayed slider maximum on %s', (commitWith) => {
    const onChange = vi.fn(() => true)
    render(<ModelContextControl context={context} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '1200' } })
    expect(screen.getByRole('alert')).toHaveTextContent('AIContextToken.contextTooLarge')
    expect(onChange).not.toHaveBeenCalled()
    if (commitWith === 'Enter') fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledExactlyOnceWith(1000 * 1000)
    expect(input).toHaveAttribute('max', '1000')
  })
  it('formats the million scale and warns only above 750K', () => {
    expect(formatContextTokens(999999)).toBe('1M')
    expect(formatContextTokens(1000 * 1000)).toBe('1M')
    expect(formatContextTokens(512000)).toBe('512K')
    expect(formatContextTokens(1200 * 1000)).toBe('1.2M')
    expect(formatContextTokens(750 * 1000)).toBe('750K')
    render(<ModelContextControl context={context} onChange={() => true} />)
    for (const value of ['500', '750']) {
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value } })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    }
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '751' } })
    expect(screen.getByRole('alert')).toHaveTextContent('AIContextToken.contextTooLarge')
  })
  it('restores the model threshold to 500K and clears an unfinished input', () => {
    const onChange = vi.fn(() => true)
    render(<ModelContextControl context={{ ...context, threshold_tokens: 798 * 1000 }} onChange={onChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '900' } })
    fireEvent.click(screen.getByRole('button', { name: 'AIContextToken.resetContextThreshold' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(500 * 1000)
  })
  it('Escape cancels input and read-only controls cannot be edited', () => {
    const onChange = vi.fn(() => true)
    const view = render(<ModelContextControl context={context} onChange={onChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '300' } })
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Escape' })
    fireEvent.blur(screen.getByRole('spinbutton'))
    expect(onChange).not.toHaveBeenCalled()
    view.rerender(<ModelContextControl context={context} />)
    expect(screen.getByRole('slider')).toBeDisabled()
    expect(screen.getByRole('spinbutton')).toBeDisabled()
  })
})
