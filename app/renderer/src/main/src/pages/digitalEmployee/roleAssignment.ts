import type { AIForge } from '@/pages/ai-agent/type/forge'
import { getDigitalEmployeeById } from './config'

export const DIGITAL_EMPLOYEE_ROLE_TAG_PREFIX = 'senso-role:'

export const createDigitalEmployeeRoleTag = (roleId: string) => {
  return `${DIGITAL_EMPLOYEE_ROLE_TAG_PREFIX}${roleId}`
}

export const isDigitalEmployeeRoleTag = (tag?: string) => {
  return !!tag?.trim().startsWith(DIGITAL_EMPLOYEE_ROLE_TAG_PREFIX)
}

export const getDigitalEmployeeRoleId = (forge?: Pick<AIForge, 'Tag'>) => {
  const marker = forge?.Tag?.find(isDigitalEmployeeRoleTag)
  const roleId = marker?.trim().slice(DIGITAL_EMPLOYEE_ROLE_TAG_PREFIX.length)
  return getDigitalEmployeeById(roleId) ? roleId : undefined
}

export const getVisibleAgentTags = (tags?: string[]) => {
  return (tags || []).filter((tag) => !!tag && !isDigitalEmployeeRoleTag(tag))
}

export const applyDigitalEmployeeRoleToTags = (tags: string[] | undefined, roleId?: string) => {
  const visibleTags = getVisibleAgentTags(tags)
  if (!roleId || !getDigitalEmployeeById(roleId)) return visibleTags
  return [...visibleTags, createDigitalEmployeeRoleTag(roleId)]
}
