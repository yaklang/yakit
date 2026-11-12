import { forwardRef, useImperativeHandle } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AIPressureDetailsEcharts } from '../AIEcharts'

const chart = vi.hoisted(() => ({ setOption: vi.fn(), resize: vi.fn() }))
vi.mock('echarts-for-react', () => ({
  default: forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({ getEchartsInstance: () => chart }))
    return <div />
  }),
}))
vi.mock('@/hook/useGetColorsByTheme', () => ({ default: () => ({}) }))
vi.mock('@/pages/ai-agent/utils', () => ({ formatNumberUnits: String }))
vi.mock('@/utils/timeUtil', () => ({ formatTimestamp: String }))
vi.mock('@/pages/ai-agent/defaultConstant', () => ({
  AIModelTypeEnum: { TierIntelligent: 'intelligent', TierLightweight: 'lightweight', TierVision: 'vision' },
}))
vi.mock('@/i18n/i18n', () => ({ default: { getFixedT: () => (key: string) => key } }))
afterEach(() => vi.useRealTimers())

it('阈值线随配置更新，始终落在纵轴范围内，历史曲线保持不变', () => {
  vi.useFakeTimers()
  const dataEcharts = {
    data: { intelligent: [{ modelName: 'main', value: 120 * 1024 }], lightweight: [], vision: [] },
    xData: { intelligent: [1], lightweight: [], vision: [] },
    maxValue: { intelligent: 120 * 1024, lightweight: 0, vision: 0 },
  }
  const view = render(<AIPressureDetailsEcharts dataEcharts={dataEcharts} threshold={100 * 1024} />)
  for (const threshold of [100, 500, 80]) {
    view.rerender(<AIPressureDetailsEcharts dataEcharts={dataEcharts} threshold={threshold * 1024} />)
    act(() => vi.advanceTimersByTime(500))
    const option = chart.setOption.mock.calls.at(-1)?.[0]
    expect(option.series[2].markLine.data[0].yAxis).toBe(threshold * 1024)
    const axisMax = option.yAxis.max({ min: 0, max: 120 * 1024 })
    expect(axisMax).toBeGreaterThan(threshold * 1024)
    expect(axisMax).toBeGreaterThan(120 * 1024)
    expect(option.series[0].data[0].value).toBe(120 * 1024)
  }
})
