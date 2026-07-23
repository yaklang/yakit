import { AIAgentSetting } from '../aiAgentType'
import isNil from 'lodash/isNil'
import { AIAgentSettingDefault, AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '../defaultConstant'
import { AIAgentGrpcApi, AIInputEvent, AttachedResourceInfo } from '../../ai-re-act/hooks/grpcApi'
import { HandleStartParams } from '../aiAgentChat/type'
import { AIMentionCommandParams } from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import { omit } from 'lodash'
import { randomString } from '@/utils/randomUtil'
import { isIRify } from '@/utils/envfile'

export const getPlanTaskLevel = (task: AIAgentGrpcApi.PlanTask) => task.level ?? 1

export const findPlanTaskSubtreeEnd = (list: AIAgentGrpcApi.PlanTask[], start: number) => {
  const level = getPlanTaskLevel(list[start])
  let end = start
  for (let i = start + 1; i < list.length; i++) {
    if (getPlanTaskLevel(list[i]) <= level) break
    end = i
  }
  return end
}

/**
 * @name 将一维tree转换成树结构
 */
/**
 * 将扁平数组转换为树形结构
 * @param {AIAgentGrpcApi.PlanTask[]} items 扁平数据数组
 * @returns {AIAgentGrpcApi.PlanTask[]} 树形结构数组
 */
export const reviewListToTrees = (items: AIAgentGrpcApi.PlanTask[]): AIAgentGrpcApi.PlanTask[] => {
  const map: Record<string, AIAgentGrpcApi.PlanTask> = {}
  const tree: AIAgentGrpcApi.PlanTask[] = []
  const stack: { task_id: string; level: number }[] = []

  items.forEach((item) => {
    if (item.isUserAdd && !item.name && !item.goal && !item.tools.length) return
    const level = getPlanTaskLevel(item)
    const node: AIAgentGrpcApi.PlanTask = { ...item, subtasks: [] }
    map[item.task_id] = node

    while (stack.length && stack[stack.length - 1].level >= level) {
      stack.pop()
    }
    if (stack.length === 0) {
      tree.push(node)
    } else {
      map[stack[stack.length - 1].task_id].subtasks!.push(node)
    }
    stack.push({ task_id: item.task_id, level })
  })

  return tree
}

// #region chat相关工具
/** @name 将Token转换为K/M等带单位字符 */
export const formatNumberUnits = (num: number) => {
  if (num >= 1048576) {
    return (num / 1048576).toFixed(1) + 'M'
  } else if (num >= 1024) {
    return (num / 1024).toFixed(1) + 'K'
  } else {
    return num.toString()
  }
}

/** @name 将全局配置信息转换为可以请求的数据结构 */
export const formatAIAgentSetting = (setting: AIAgentSetting): AIAgentSetting => {
  /**
   * AIService/AIModelName/TimelineItemLimit 已经废弃
   */
  let data: AIAgentSetting = { ...setting }
  data = omit(data, ['AIService', 'AIModelName', 'TimelineItemLimit'])
  try {
    data.EnableSystemFileSystemOperator =
      setting.EnableSystemFileSystemOperator ?? AIAgentSettingDefault.EnableSystemFileSystemOperator

    data.UseDefaultAIConfig = setting.UseDefaultAIConfig ?? AIAgentSettingDefault.UseDefaultAIConfig

    data.ForgeName = '' //不传
    data.ForgeParams = undefined //不传

    data.DisallowRequireForUserPrompt =
      setting.DisallowRequireForUserPrompt ?? AIAgentSettingDefault.DisallowRequireForUserPrompt

    data.ReviewPolicy = setting.ReviewPolicy || AIAgentSettingDefault.ReviewPolicy

    data.AIReviewRiskControlScore = setting.AIReviewRiskControlScore ?? AIAgentSettingDefault.AIReviewRiskControlScore

    data.DisableToolUse = setting.DisableToolUse ?? AIAgentSettingDefault.DisableToolUse

    data.AICallAutoRetry = setting.AICallAutoRetry ?? AIAgentSettingDefault.AICallAutoRetry

    data.AITransactionRetry = setting.AITransactionRetry ?? AIAgentSettingDefault.AITransactionRetry

    data.EnableAISearchTool = setting.EnableAISearchTool ?? AIAgentSettingDefault.EnableAISearchTool
    data.EnableAISearchInternet = setting.EnableAISearchInternet ?? AIAgentSettingDefault.EnableAISearchInternet
    data.EnableQwenNoThinkMode = setting.EnableQwenNoThinkMode ?? AIAgentSettingDefault.EnableQwenNoThinkMode
    data.AllowPlanUserInteract = setting.AllowPlanUserInteract ?? AIAgentSettingDefault.AllowPlanUserInteract

    data.SyncPerceptionTrigger = setting.SyncPerceptionTrigger ?? AIAgentSettingDefault.SyncPerceptionTrigger
    data.EnablePlan = setting.EnablePlan ?? AIAgentSettingDefault.EnablePlan
    data.PlanExecTaskConcurrency = setting.PlanExecTaskConcurrency ?? AIAgentSettingDefault.PlanExecTaskConcurrency
    data.Strategy = {
      EnableMultiAgent: setting.Strategy?.EnableMultiAgent ?? AIAgentSettingDefault.Strategy?.EnableMultiAgent,
      EnableGoalMode: setting.Strategy?.EnableGoalMode ?? AIAgentSettingDefault.Strategy?.EnableGoalMode,
      GoalMinIterations: setting.Strategy?.GoalMinIterations ?? AIAgentSettingDefault.Strategy?.GoalMinIterations,
    }

    if (setting?.AllowPlanUserInteract) {
      if (!isNil(setting?.PlanUserInteractMaxCount)) {
        data.PlanUserInteractMaxCount = setting.PlanUserInteractMaxCount || 3
      } else {
        data.PlanUserInteractMaxCount = 3
      }
    }
    if (!isNil(setting?.ReActMaxIteration)) {
      data.ReActMaxIteration = setting.ReActMaxIteration || AIAgentSettingDefault.ReActMaxIteration
    }
    // TimelineContentSizeLimit 单位是KB，但传到后端需要转换为字节
    data.TimelineContentSizeLimit =
      ((setting.TimelineContentSizeLimit ?? AIAgentSettingDefault.TimelineContentSizeLimit) as number) * 1024

    // AICallTokenLimit 单位是KB，但传到后端需要转换为字节
    data.AICallTokenLimit = ((setting.AICallTokenLimit ?? AIAgentSettingDefault.AICallTokenLimit) as number) * 1024
    if (!isNil(setting?.UserInteractLimit)) {
      data.UserInteractLimit = setting.UserInteractLimit || AIAgentSettingDefault.UserInteractLimit
    }
    if (!isNil(setting?.TimelineSessionID)) {
      data.TimelineSessionID = setting.TimelineSessionID || AIAgentSettingDefault.TimelineSessionID
    }
    data.DisableToolIntervalReview =
      setting.DisableToolIntervalReview ?? AIAgentSettingDefault.DisableToolIntervalReview
  } catch (error) {}
  return { ...data }
}

const getResourceInfoByMention = (mention: AIMentionCommandParams): AttachedResourceInfo | null => {
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
      } else {
        return {
          Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_KNOWLEDGE_BASE,
          Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_NAME,
          Value: mention.mentionName,
        }
      }

    default:
      return null
  }
}
/** @name 将前端的结构转化为符合定义的结构 */
export const getAIReActRequestParams = (value: HandleStartParams) => {
  const { extraValue, mentionList = [], imageList = [], httpFlowList = [], codeBlockList = [], showQS } = value
  let extra: HandleStartParams['extraValue'] = {}
  let attachedResourceInfo: AIInputEvent['AttachedResourceInfo'] = []
  for (let item of mentionList) {
    const addItem = getResourceInfoByMention(item)
    if (addItem) {
      attachedResourceInfo = [...attachedResourceInfo, addItem] // 不需要去重，按显示顺序给后端
    }
  }

  for (let item of imageList) {
    const addImageItem = {
      Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_FILE,
      Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_FILE_PATH,
      Value: item,
    }
    if (addImageItem) {
      attachedResourceInfo = [...attachedResourceInfo, addImageItem]
    }
  }

  const httpFlowIdSet = new Set<string>()
  for (let item of httpFlowList) {
    const ids = (item.flowIds || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
    ids.forEach((id) => httpFlowIdSet.add(id))
  }
  attachedResourceInfo = [
    ...attachedResourceInfo,
    {
      Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_HTTP_FLOW,
      Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_HTTP_FLOW_ID,
      Value: [...httpFlowIdSet],
    },
  ]

  for (let item of codeBlockList) {
    const content = {
      path: item.path,
      startLine: item.range?.startLineNumber,
      endLine: item.range?.endLineNumber,
      language: item.language,
      content: item.content,
    }
    const addItem: AttachedResourceInfo[] = isIRify()
      ? [
          {
            Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
            Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
            Value: JSON.stringify(content),
          },
        ]
      : [
          {
            Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_File,
            Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_Directory_ID,
            Value: item.rootPath,
          },
          {
            Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_File,
            Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_File_ID,
            Value: item.path,
          },
          {
            Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
            Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
            Value: JSON.stringify(content),
          },
        ]
    attachedResourceInfo = [...attachedResourceInfo, ...addItem]
  }

  if (!!showQS) {
    extra.showQS = showQS
  }
  extra = Object.assign(extraValue || {}, extra)
  return {
    extra,
    attachedResourceInfo,
  }
}
// #endregion

/** 生成对话得 SessionId */
export const createActiveChatSessionId = () => {
  return randomString(40)
}
