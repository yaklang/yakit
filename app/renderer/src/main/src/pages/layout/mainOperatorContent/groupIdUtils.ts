import { randomString } from '@/utils/randomUtil'

/**
 * 生成组id
 * @returns {string} 生成的组id
 */
export const generateGroupId = (gIndex?: number) => {
  const time = (new Date().getTime() + (gIndex || 0)).toString()
  const groupId = `[${randomString(6)}]-${time}-group`
  return groupId
}