import { describe, expect, it } from 'vitest'
import { pluginConvertUIToLocal } from '../convert'
import { DefaultYakitPluginInfo } from '../../defaultconstants'
import type { YakScript } from '@/pages/invoker/schema'

describe('local plugin persistence identifiers', () => {
  it('keeps the original database ID when saving an edited plugin', () => {
    const original = { Id: '9007199254740993' } as YakScript
    const request = pluginConvertUIToLocal({ ...DefaultYakitPluginInfo, ScriptName: 'edited' }, original)
    expect(request.Id).toBe('9007199254740993')
    expect(request.ScriptName).toBe('edited')
  })
  it('omits an unset ID so creation is distinct from updating a saved record', () => {
    const request = pluginConvertUIToLocal(DefaultYakitPluginInfo, { Id: '0' } as YakScript)
    expect(request.Id).toBeUndefined()
  })
})
