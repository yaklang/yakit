import { describe, expect, it } from 'vitest'
import { AIChatQSDataTypeEnum } from '../aiRender'
import { aiSingleItemDataHandlers } from '../grpcStreamHandler/aiSingleItem'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'

describe('browser handoff event', () => {
  it('persists only local-presentation metadata and updates the same card', () => {
    const request = makeHandlerRequest({
      res: makeGrpcJsonRes('browser_handoff', {
        handoffId: 'handoff-1',
        deviceId: 'device-a',
        reason: 'qr_code',
        state: 'waiting_for_user',
        tabId: 7,
        frameId: 0,
        title: 'Sign in',
        dataUrl: 'data:image/png;base64,must-not-be-persisted',
      }),
    })

    aiSingleItemDataHandlers.browser_handoff(request)
    const created = request.rawData.contents.get('handoff-1')
    expect(created?.type).toBe(AIChatQSDataTypeEnum.BROWSER_HANDOFF)
    expect(JSON.stringify(created)).not.toContain('data:image')

    aiSingleItemDataHandlers.browser_handoff({
      ...request,
      res: makeGrpcJsonRes('browser_handoff', {
        handoffId: 'handoff-1',
        deviceId: 'device-a',
        reason: 'qr_code',
        state: 'completed',
        tabId: 7,
        frameId: 0,
      }),
    })
    const completed = request.rawData.contents.get('handoff-1')
    expect(completed?.type === AIChatQSDataTypeEnum.BROWSER_HANDOFF && completed.data.state).toBe('completed')
    expect(completed?.stageSettled).toBe(true)
  })
})
