// @vitest-environment node
import { expect, it, vi } from 'vitest'
import fs from 'node:fs'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'

it('encrypts plaintext through SM2 C1C3C2 followed by hex encoding', async () => {
  const ipcRenderer = Object.assign(new EventEmitter(), {
    invoke: vi.fn().mockResolvedValue({ Result: 'ciphertext' }),
  })
  const process = Object.assign(new EventEmitter(), { argv: [] })
  const window = { addEventListener: vi.fn() }
  vm.runInNewContext(fs.readFileSync(new URL('../preload.js', import.meta.url), 'utf8'), {
    process,
    window,
    require: () => ({ ipcRenderer }),
  })
  process.emit('loaded')

  await expect(window.yakitBridge.codec.encryptSM2({ text: '密码 Aa1!', publicKey: '04abcd' })).resolves.toEqual({
    Result: 'ciphertext',
  })
  expect(ipcRenderer.invoke).toHaveBeenCalledExactlyOnceWith('NewCodec', {
    Text: '密码 Aa1!',
    WorkFlow: [
      {
        CodecType: 'SM2Encrypt',
        Params: [
          { Key: 'pubKey', Value: '04abcd' },
          { Key: 'encryptSchema', Value: 'C1C3C2' },
        ],
      },
      { CodecType: 'HexEncode', Params: [] },
    ],
  })
})
