import type { AttachedResourceInfo } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIMentionCommandParams } from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '../defaultConstant'

export const getResourceInfoByMention = (mention: AIMentionCommandParams): AttachedResourceInfo | null => {
  switch (mention.mentionType) {
    case 'file':
    case 'folder':
      return {
        Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_FILE,
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_FILE_PATH,
        Value: mention.mentionName,
      }
    case 'forge':
      return {
        Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_AIFORGE,
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_NAME,
        Value: mention.mentionName,
      }
    case 'tool':
      return {
        Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_AITOOL,
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_NAME,
        Value: mention.mentionName,
      }
    case 'knowledgeBase':
      if (mention.mentionId === '@所有知识库') {
        return {
          Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_KNOWLEDGE_BASE,
          Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_SYSTEM_FLAG,
          Value: 'all_knowledge_base',
        }
      }
      return {
        Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_KNOWLEDGE_BASE,
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_NAME,
        Value: mention.mentionName,
      }
    case 'browser': {
      const [browserReference] = mention.mentionName.replace(/^@/, '').split(' · ', 1)
      return {
        Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_BROWSER,
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_BROWSER_DEVICE_ID,
        Value: JSON.stringify({
          deviceId: mention.mentionId,
          name: mention.mentionName,
          reference: /^[A-Z]{1,2}$/.test(browserReference) ? browserReference : mention.mentionId,
        }),
      }
    }
    default:
      return null
  }
}
