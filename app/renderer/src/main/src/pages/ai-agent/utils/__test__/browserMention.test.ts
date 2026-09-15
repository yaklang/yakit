import { describe, expect, it } from 'vitest'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '../../defaultConstant'
import { getResourceInfoByMention } from '../mentionResources'

describe('browser instance mention', () => {
  it('keeps the browser device id in structured attached-resource data', () => {
    const result = getResourceInfoByMention({
      mentionId: 'device-1',
      mentionType: 'browser',
      mentionName: '@A',
    })

    expect(result).toEqual({
      Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_BROWSER,
      Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_BROWSER_DEVICE_ID,
      Value: JSON.stringify({ deviceId: 'device-1', name: '@A', reference: 'A' }),
    })
  })
})
