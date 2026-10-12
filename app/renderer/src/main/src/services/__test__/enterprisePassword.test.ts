import { beforeEach, describe, expect, it, vi } from 'vitest'
import { encryptEnterprisePasswords } from '../enterprisePassword'

const mocks = vi.hoisted(() => ({ request: vi.fn(), encryptSM2: vi.fn() }))
vi.mock('../fetch', () => ({ NetWorkApi: mocks.request }))
vi.mock('../electronBridge', () => ({ yakitCodec: { encryptSM2: mocks.encryptSM2 } }))

const publicKey = `04${'ab'.repeat(64)}`
const ciphertext = (byte: string) => `04${byte.repeat(104)}`

describe('enterprise password encryption', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.request.mockResolvedValue({ publicKey, cipherMode: 'C1C3C2' })
  })

  it('fetches one key and independently encrypts each plaintext, including equal passwords', async () => {
    mocks.encryptSM2
      .mockResolvedValueOnce({ Result: ciphertext('11') })
      .mockResolvedValueOnce({ Result: ciphertext('22') })
      .mockResolvedValueOnce({ Result: ciphertext('33') })
    const passwords = [' Old1!密码 ', 'New2!密码', 'New2!密码']

    const result = await encryptEnterprisePasswords(passwords)

    expect(mocks.request).toHaveBeenCalledExactlyOnceWith({ method: 'get', url: 'urm/sm2-public-key' })
    expect(mocks.encryptSM2).toHaveBeenCalledTimes(3)
    passwords.forEach((text, index) => {
      expect(mocks.encryptSM2).toHaveBeenNthCalledWith(index + 1, { text, publicKey })
    })
    expect(result).toEqual(['11'.repeat(104), '22'.repeat(104), '33'.repeat(104)])
    expect(passwords).toEqual([' Old1!密码 ', 'New2!密码', 'New2!密码'])
  })

  it('fetches a fresh key for each submission and removes only the point prefix', async () => {
    const nextKey = `04${'cd'.repeat(64)}`
    mocks.request.mockResolvedValueOnce({ publicKey, cipherMode: 'C1C3C2' })
    mocks.request.mockResolvedValueOnce({ publicKey: nextKey, cipherMode: 'C1C3C2' })
    mocks.encryptSM2.mockResolvedValue({ Result: ciphertext('04') })

    expect(await encryptEnterprisePasswords(['plain'])).toEqual(['04'.repeat(104)])
    await encryptEnterprisePasswords(['plain'])

    expect(mocks.request).toHaveBeenCalledTimes(2)
    expect(mocks.encryptSM2).toHaveBeenLastCalledWith({ text: 'plain', publicKey: nextKey })
  })

  it.each([
    {},
    { publicKey: '', cipherMode: 'C1C3C2' },
    { publicKey: 'not-a-key', cipherMode: 'C1C3C2' },
    { publicKey, cipherMode: 'C1C2C3' },
  ])('rejects invalid public key metadata before encrypting: %j', async (response) => {
    mocks.request.mockResolvedValue(response)
    await expect(encryptEnterprisePasswords(['plain'])).rejects.toThrow('Invalid SM2 public key response')
    expect(mocks.encryptSM2).not.toHaveBeenCalled()
  })

  it('propagates key request failures without encrypting', async () => {
    mocks.request.mockRejectedValue(new Error('offline'))
    await expect(encryptEnterprisePasswords(['plain'])).rejects.toThrow('offline')
    expect(mocks.encryptSM2).not.toHaveBeenCalled()
  })

  it('propagates encryption failures', async () => {
    mocks.encryptSM2.mockRejectedValue(new Error('encryption failed'))
    await expect(encryptEnterprisePasswords(['plain'])).rejects.toThrow('encryption failed')
  })

  it.each(['', 'plain', '04abcd', '11'.repeat(104)])('rejects invalid ciphertext: %s', async (Result) => {
    mocks.encryptSM2.mockResolvedValue({ Result })
    await expect(encryptEnterprisePasswords(['plain'])).rejects.toThrow('Invalid SM2 ciphertext')
  })
})
