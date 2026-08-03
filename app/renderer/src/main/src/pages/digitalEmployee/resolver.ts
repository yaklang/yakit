import { AIForge } from '@/pages/ai-agent/type/forge'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'
import { AIInputEvent, AIStartParams } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIMentionCommandParams } from '@/pages/ai-agent/components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import type { DigitalEmployeeDefinition } from './config'

export type DigitalEmployeeSkillSource = Pick<DigitalEmployeeDefinition, 'id' | 'forgeVerboseName'> & {
  forge?: Pick<AIForge, 'Id' | 'ForgeName' | 'ForgeVerboseName'>
}

export const normalizeForgeVerboseName = (value?: string) => {
  return (value || '').trim()
}

export const findForgeByVerboseName = (forges: AIForge[], forgeVerboseName: string) => {
  const target = normalizeForgeVerboseName(forgeVerboseName)
  if (!target) return undefined
  return forges.find((forge) => normalizeForgeVerboseName(forge.ForgeVerboseName) === target)
}

export const findForgeById = (forges: AIForge[], forgeId: number) => {
  return forges.find((forge) => forge.Id === forgeId)
}

export const applyForgeNameToStartParams = <T extends AIStartParams>(params: T, forgeName?: string): T => {
  if (!forgeName) return params
  return {
    ...params,
    ForgeName: forgeName,
  }
}

export const getDigitalEmployeeSkillName = (employee?: DigitalEmployeeSkillSource) => {
  return normalizeForgeVerboseName(employee?.forge?.ForgeVerboseName || employee?.forgeVerboseName)
}

/**
 * 将数字员工映射为原版输入框使用的 AI Forge mention。
 * 这样员工默认技能与用户通过 @ 选择的技能走同一条提取、展示和发送链路。
 */
export const getDigitalEmployeeDefaultMention = (
  employee?: DigitalEmployeeSkillSource,
): AIMentionCommandParams | undefined => {
  const skillName = getDigitalEmployeeSkillName(employee)
  if (!skillName) return undefined

  return {
    mentionId: String(employee?.forge?.Id || employee?.id || skillName),
    mentionType: 'forge',
    mentionName: skillName,
    lock: true,
  }
}

export const applyDigitalEmployeeSkillToInputEvent = <T extends AIInputEvent>(
  inputEvent: T,
  employee?: DigitalEmployeeSkillSource,
): T => {
  const skillName = getDigitalEmployeeSkillName(employee)
  if (!skillName) return inputEvent

  const attachedResourceInfo = inputEvent.AttachedResourceInfo || []
  const alreadyAttached = attachedResourceInfo.some(
    (resource) =>
      resource.Type === AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_AIFORGE &&
      resource.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_NAME &&
      normalizeForgeVerboseName(resource.Value) === skillName,
  )
  if (alreadyAttached) return inputEvent

  return {
    ...inputEvent,
    AttachedResourceInfo: [
      {
        Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_AIFORGE,
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_NAME,
        Value: skillName,
      },
      ...attachedResourceInfo,
    ],
  }
}
