import { NetWorkApi } from './fetch'
import { yakitCodec } from './electronBridge'
import type { API } from './swagger/resposeType'

export const encryptEnterprisePasswords = async (passwords: string[]): Promise<string[]> => {
  const { publicKey, cipherMode } = await NetWorkApi<undefined, API.Sm2PublicKeyResponse>({
    method: 'get',
    url: 'urm/sm2-public-key',
  })
  if (!publicKey || !/^04[\da-f]{128}$/i.test(publicKey) || cipherMode !== 'C1C3C2') {
    throw new Error('Invalid SM2 public key response')
  }

  return Promise.all(
    passwords.map(async (text) => {
      const { Result } = await yakitCodec.encryptSM2({ text, publicKey })
      if (!/^04(?:[\da-f]{2}){96,}$/i.test(Result)) {
        throw new Error('Invalid SM2 ciphertext')
      }
      // 引擎密文带未压缩点前缀 04，接口使用 sm-crypto mode 1 的 C1C3C2 格式。
      return Result.slice(2)
    }),
  )
}
