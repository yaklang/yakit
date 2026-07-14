import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PluginExecutionHistoryItem,
  queryPluginExecutionHistory,
  savePluginExecutionHistory,
} from '../pluginExecutionHistory'

const mockGetRemoteValue = vi.fn()
const mockSetRemoteValue = vi.fn()
const mockEmit = vi.fn()

vi.mock('@/utils/kv', () => ({
  getRemoteValue: (...args: unknown[]) => mockGetRemoteValue(...args),
  setRemoteValue: (...args: unknown[]) => mockSetRemoteValue(...args),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: {
    emit: (...args: unknown[]) => mockEmit(...args),
  },
}))

const createHistoryItem = (pluginId: number, executedAt = pluginId): PluginExecutionHistoryItem => ({
  id: `history-${pluginId}-${executedAt}`,
  pluginId,
  pluginName: `plugin-${pluginId}`,
  pluginType: 'yak',
  source: 'plugin-op',
  executedAt,
  resultRecorded: true,
  resultStatus: 'finished',
  execParams: [{ Key: 'target', Value: `https://example.com/${pluginId}` }],
  formValue: { target: `https://example.com/${pluginId}` },
  extraParamsValue: {} as PluginExecutionHistoryItem['extraParamsValue'],
})

describe('plugin execution history', () => {
  let storedValue = ''

  beforeEach(() => {
    storedValue = ''
    mockGetRemoteValue.mockReset().mockImplementation(async () => storedValue)
    mockSetRemoteValue.mockReset().mockImplementation(async (_key: string, value: string) => {
      storedValue = value
    })
    mockEmit.mockReset()
  })

  it('deduplicates a plugin and keeps its latest execution first', async () => {
    await savePluginExecutionHistory(createHistoryItem(1, 1))
    await savePluginExecutionHistory(createHistoryItem(2, 2))
    await savePluginExecutionHistory(createHistoryItem(1, 3))

    const history = await queryPluginExecutionHistory()

    expect(history.map((item) => item.pluginId)).toEqual([1, 2])
    expect(history[0].executedAt).toBe(3)
  })

  it('keeps at most ten recent plugins', async () => {
    for (let pluginId = 1; pluginId <= 12; pluginId += 1) {
      await savePluginExecutionHistory(createHistoryItem(pluginId))
    }

    const history = await queryPluginExecutionHistory()

    expect(history).toHaveLength(10)
    expect(history.map((item) => item.pluginId)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3])
  })

  it('restores binary form and HTTP request values', async () => {
    const item = createHistoryItem(1)
    item.formValue = { packet: new Uint8Array([1, 2, 3]) }
    item.extraParamsValue = {
      RawHTTPRequest: Buffer.from('GET / HTTP/1.1'),
    } as PluginExecutionHistoryItem['extraParamsValue']

    await savePluginExecutionHistory(item)
    const [restored] = await queryPluginExecutionHistory()

    expect(restored.formValue.packet).toBeInstanceOf(Uint8Array)
    expect(Array.from(restored.formValue.packet as Uint8Array)).toEqual([1, 2, 3])
    expect(restored.extraParamsValue.RawHTTPRequest).toBeInstanceOf(Uint8Array)
    expect(Buffer.from(restored.extraParamsValue.RawHTTPRequest).toString()).toBe('GET / HTTP/1.1')
  })

  it('restores the runtime id and custom table result snapshot', async () => {
    const item = createHistoryItem(1)
    item.runtimeId = 'runtime-1'
    item.resultStatus = 'stopped'
    item.streamInfo = {
      progressState: [{ id: 'main', progress: 1 }],
      cardState: [],
      tabsState: [{ tabName: '结果', type: 'table' }],
      tabsInfoState: {
        结果: {
          name: '结果',
          columns: [{ title: '目标', dataKey: 'target' }],
          data: [{ uuid: 'row-1', target: 'https://example.com' }],
        },
      },
      riskState: [],
      logState: [],
      rulesState: [],
    }

    await savePluginExecutionHistory(item)
    const [restored] = await queryPluginExecutionHistory()

    expect(restored.runtimeId).toBe('runtime-1')
    expect(restored.resultStatus).toBe('stopped')
    expect(restored.streamInfo?.tabsInfoState['结果'].data).toEqual([{ uuid: 'row-1', target: 'https://example.com' }])
  })
})
