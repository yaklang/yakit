import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('@/pages/ai-agent/utils', () => ({ formatNumberUnits: (n: number) => n }))
vi.mock('../../../aiModelList/aiModelSelect/AIModelSelect', () => ({ getIconByAI: () => null }))
vi.mock('../../../defaultConstant', () => ({
  AIModelTypeEnum: { TierIntelligent: 'intelligent', TierLightweight: 'lightweight', TierVision: 'vision' },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (k: string) => k }) }))
vi.mock('antd', () => ({
  Tooltip: ({ children }: any) => children,
  Select: ({ options, onChange, value, ...p }: any) => (
    <select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o: any) => (
        <option value={o.value} key={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))
import AITokens from '../AITokens'
import { isConsumptionPerfChanged } from '../utils'
afterEach(cleanup)
const actual = [
  {
    provider_type: 'openai',
    model_name: 'actual-model',
    thinking_level: 'high',
    input_consumption: 123,
    output_consumption: 45,
    cache_hit_token: 77,
  },
  {
    provider_type: 'other',
    model_name: 'fallback-model',
    thinking_level: 'low',
    input_consumption: 8,
    output_consumption: 9,
    cache_hit_token: 0,
  },
]
it('shows the actual model and thinking level rather than the configured default, and switches counters', () => {
  render(
    <AITokens
      modelType="main"
      aiModel={{ ModelName: 'configured' } as any}
      token={[900, 900, 900, 0]}
      modelConsumption={actual}
    />,
  )
  expect(screen.getByText('123')).toBeInTheDocument()
  expect(screen.queryByText('configured')).toBeNull()
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: JSON.stringify(['other', 'fallback-model', 'low']) },
  })
  expect(screen.getByText('8')).toBeInTheDocument()
  expect(screen.queryByText('123')).toBeNull()
})
it('retains legacy counters when omitted and avoids attributing an empty actual-model tier to a configured model', () => {
  const h = render(<AITokens modelType="main" token={[321, 12, 3, 0]} aiModel={{ ModelName: 'configured' } as any} />)
  expect(screen.getByText('321')).toBeInTheDocument()
  h.rerender(
    <AITokens
      modelType="main"
      token={[321, 12, 3, 0]}
      aiModel={{ ModelName: 'configured' } as any}
      modelConsumption={[]}
    />,
  )
  expect(screen.queryByText('configured')).toBeNull()
  expect(screen.getByText('AIContextToken.noCallRecords')).toBeInTheDocument()
})
it('refreshes when model distribution changes while aggregate totals stay equal', () => {
  const before: any = {
    input_consumption: 100,
    output_consumption: 10,
    cache_hit_token: 0,
    tier_consumption: {},
    tier_model_consumption: { intelligent: actual },
  }
  const after = { ...before, tier_model_consumption: { intelligent: [{ ...actual[0], thinking_level: 'max' }] } }
  expect(isConsumptionPerfChanged(before, after)).toBe(true)
  expect(isConsumptionPerfChanged(before, JSON.parse(JSON.stringify(before)))).toBe(false)
})
