import { expect, it } from 'vitest'
import { aiPerfDataHandlers } from '../grpcStreamHandler/aiPerf'
import { StringToUint8Array } from '@/utils/str'

it('routes actual model breakdown to the target session and clears it for legacy payloads', () => {
  const target: any = { aiPerfData: { consumption: {} } }
  const other = { aiPerfData: { consumption: { input_consumption: 999 } } }
  const breakdown = {
    intelligent: [
      {
        provider_type: 'p',
        model_name: 'm',
        thinking_level: 'max',
        input_consumption: 20,
        output_consumption: 5,
        cache_hit_token: 2,
      },
    ],
  }
  const send = (data: any) =>
    aiPerfDataHandlers.consumption({
      rawData: target,
      res: { Type: 'consumption', Content: StringToUint8Array(JSON.stringify(data)) },
    } as any)
  send({
    input_consumption: 20,
    output_consumption: 5,
    cache_hit_token: 2,
    effective_single_model_mode: true,
    tier_model_consumption: breakdown,
  })
  expect(target.aiPerfData.consumption.tier_model_consumption).toEqual(breakdown)
  expect(target.aiPerfData.consumption.effective_single_model_mode).toBe(true)
  expect(other.aiPerfData.consumption.input_consumption).toBe(999)
  send({ input_consumption: 1, output_consumption: 0, cache_hit_token: 0 })
  expect(target.aiPerfData.consumption.tier_model_consumption).toBeUndefined()
})
