import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { loadSync } from '@grpc/proto-loader'

describe('official Goal strategy wire format', () => {
  const definitions = loadSync(path.resolve(__dirname, '../../protos/grpc.proto'), { keepCase: true, longs: String })
  const method = definitions['ypb.Yak'].StartAIReAct
  it('uses official field numbers 5 and 6', () => {
    const fields = definitions['ypb.AIExecutionStrategy'].type.field
    expect(fields.find((field) => field.name === 'GoalDurationSeconds').number).toBe(5)
    expect(fields.find((field) => field.name === 'GoalAcceptanceCriteria').number).toBe(6)
  })
  it.each([600, -1])('preserves duration %s on a real serialized hotpatch', (seconds) => {
    const decoded = method.requestDeserialize(
      method.requestSerialize({
        IsConfigHotpatch: true,
        HotpatchType: 'ExecutionStrategy',
        Params: {
          ForgeName: 'employee-forge',
          Strategy: { EnableGoalMode: true, GoalDurationSeconds: seconds, GoalAcceptanceCriteria: 'evidence' },
        },
      }),
    )
    expect(decoded.Params.Strategy).toEqual({
      EnableGoalMode: true,
      GoalDurationSeconds: String(seconds),
      GoalAcceptanceCriteria: 'evidence',
    })
    expect(decoded.Params.ForgeName).toBe('employee-forge')
    expect(decoded.HotpatchType).toBe('ExecutionStrategy')
  })
})
