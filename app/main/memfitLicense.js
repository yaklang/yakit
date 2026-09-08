const LICENSE_ACTIVATION_KEY = 'LICENSE_ACTIVATION'
const LICENSE_COMPANY_VERSION = 'EnpriTrace'

// 临时用于 AI SenSo 后端联调；恢复授权时改为 true，并重新构建客户端。
// 两个渲染器通过只读 IPC 读取同一策略；不伪造授权结果或修改引擎授权缓存。
const MEMFIT_LICENSE_REQUIRED = false
const isMemfitLicenseRequired = () => MEMFIT_LICENSE_REQUIRED

const invokeClient = (getClient, method, params) => {
  return new Promise((resolve, reject) => {
    const client = getClient()
    const fn = client?.[method]
    if (typeof fn !== 'function') {
      reject(new Error(`license engine method is unavailable: ${method}`))
      return
    }

    fn.call(client, params, (error, data) => {
      if (error) {
        reject(error)
        return
      }
      resolve(data)
    })
  })
}

const normalizeCachedLicense = (value) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const parsed = JSON.parse(trimmed)
    return typeof parsed === 'string' ? parsed.trim() : ''
  } catch (error) {
    // Older or externally provisioned engines may store the activation code as a raw string.
    return trimmed
  }
}

const getMemfitLicenseRequest = async (getClient) => {
  const response = await invokeClient(getClient, 'GetLicense', {})
  return `${response?.License || ''}`.trim()
}

const checkMemfitLicense = async (getClient, licenseActivation) => {
  const normalized = `${licenseActivation || ''}`.trim()
  if (!normalized) throw new Error('license activation code is required')

  await invokeClient(getClient, 'CheckLicense', {
    LicenseActivation: normalized,
    CompanyVersion: LICENSE_COMPANY_VERSION,
  })
  return normalized
}

const cacheMemfitLicense = async (getClient, licenseActivation) => {
  await invokeClient(getClient, 'SetKey', {
    Key: LICENSE_ACTIVATION_KEY,
    Value: JSON.stringify(licenseActivation),
  })
}

const activateMemfitLicense = async (getClient, licenseActivation) => {
  const normalized = await checkMemfitLicense(getClient, licenseActivation)
  await cacheMemfitLicense(getClient, normalized)
  return true
}

const getCachedMemfitLicense = async (getClient) => {
  const response = await invokeClient(getClient, 'GetKey', { Key: LICENSE_ACTIVATION_KEY })
  return normalizeCachedLicense(response?.Value)
}

const verifyCachedMemfitLicense = async (getClient) => {
  const licenseActivation = await getCachedMemfitLicense(getClient)
  if (!licenseActivation) return false
  await checkMemfitLicense(getClient, licenseActivation)
  return true
}

module.exports = {
  isMemfitLicenseRequired,
  LICENSE_ACTIVATION_KEY,
  activateMemfitLicense,
  getMemfitLicenseRequest,
  normalizeCachedLicense,
  verifyCachedMemfitLicense,
}
