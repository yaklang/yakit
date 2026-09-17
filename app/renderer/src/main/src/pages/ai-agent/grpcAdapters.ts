import type { GrpcOutput } from '@/services/ipc'
import { grpcPagingToUI, int64ToSafeNumber } from '@/utils/int64'
import type { ThirdPartyApplicationConfig } from '@/components/configNetwork/ConfigNetworkPage'
import { AISourceEnum, type AIStartParams, type AIReActSchedule } from '../ai-re-act/hooks/grpcApi'
import {
  AIModelPolicyEnum,
  AIMCPServerTypeEnum,
  AttachedResourceKeyEnum,
  AttachedResourceTypeEnum,
} from './defaultConstant'
import type { AIForge } from './type/forge'
import type { AITool } from './type/aiTool'
import type { AISession } from './type/aiChat'
import type { AIGlobalConfig, AIModelConfig } from './aiModelList/utils'
import type { LocalModelConfig } from './type/aiModel'
import type { MCPServer, MCPToolConfig, MCPToolCallHistorySummary } from './type/aiMCP'

function enumValue<T extends string>(value: string, values: readonly T[], field: string): T {
  const found = values.find((candidate) => candidate === value)
  if (found === undefined) throw new Error(`${field}: unsupported value ${value}`)
  return found
}

export function aiStartParamsForUI(
  value: NonNullable<GrpcOutput<'QueryAISession'>['Data'][number]['StartParams']>,
): AIStartParams {
  return {
    ...value,
    ReviewPolicy: enumValue(value.ReviewPolicy || 'manual', ['manual', 'yolo', 'ai'] as const, 'ReviewPolicy'),
    Source: Object.values(AISourceEnum).find((source) => source === value.Source) ?? AISourceEnum.other,
    Sequence: int64ToSafeNumber(value.Sequence),
    AICallAutoRetry: int64ToSafeNumber(value.AICallAutoRetry),
    AITransactionRetry: int64ToSafeNumber(value.AITransactionRetry),
    PlanUserInteractMaxCount: int64ToSafeNumber(value.PlanUserInteractMaxCount),
    ReActMaxIteration: int64ToSafeNumber(value.ReActMaxIteration),
    TimelineContentSizeLimit: int64ToSafeNumber(value.TimelineContentSizeLimit),
    UserInteractLimit: int64ToSafeNumber(value.UserInteractLimit),
    AICallTokenLimit: int64ToSafeNumber(value.AICallTokenLimit),
    PlanExecTaskConcurrency: int64ToSafeNumber(value.PlanExecTaskConcurrency),
    Strategy: value.Strategy
      ? {
          ...value.Strategy,
          GoalMinIterations: int64ToSafeNumber(value.Strategy.GoalMinIterations),
          MaxSubAgents: int64ToSafeNumber(value.Strategy.MaxSubAgents),
        }
      : undefined,
  }
}

export function aiScheduleForUI(value: GrpcOutput<'GetAIReActSchedule'>): AIReActSchedule {
  if (!value.Schedule || !value.Payload) throw new Error('Schedule response is missing Schedule or Payload')
  return {
    ...value,
    Payload: {
      ...value.Payload,
      StartParams: value.Payload.StartParams ? aiStartParamsForUI(value.Payload.StartParams) : {},
      AttachedResourceInfos: value.Payload.AttachedResourceInfos.map((item) => ({
        ...item,
        Key: enumValue(item.Key, Object.values(AttachedResourceKeyEnum), 'AttachedResource.Key'),
        Type: enumValue(item.Type, Object.values(AttachedResourceTypeEnum), 'AttachedResource.Type'),
      })),
    },
    Schedule: { ...value.Schedule, StartAt: int64ToSafeNumber(value.Schedule.StartAt) },
    NextRunAt: int64ToSafeNumber(value.NextRunAt),
    LastRunAt: int64ToSafeNumber(value.LastRunAt),
    MisfireGraceSeconds: int64ToSafeNumber(value.MisfireGraceSeconds),
    MaxRuntimeSeconds: int64ToSafeNumber(value.MaxRuntimeSeconds),
    CreatedAt: int64ToSafeNumber(value.CreatedAt),
    UpdatedAt: int64ToSafeNumber(value.UpdatedAt),
    LastStartedAt: int64ToSafeNumber(value.LastStartedAt),
    LastFinishedAt: int64ToSafeNumber(value.LastFinishedAt),
  }
}

export function aiForgeForUI(value: GrpcOutput<'GetAIForge'>): AIForge {
  return {
    ...value,
    ForgeType: enumValue(value.ForgeType, ['yak', 'config', 'skillmd'] as const, 'ForgeType'),
    CreatedAt: int64ToSafeNumber(value.CreatedAt),
    UpdatedAt: int64ToSafeNumber(value.UpdatedAt),
  }
}

export function aiToolForUI(value: GrpcOutput<'GetAIToolList'>['Tools'][number]): AITool {
  return { ...value, CreatedAt: int64ToSafeNumber(value.CreatedAt), UpdatedAt: int64ToSafeNumber(value.UpdatedAt) }
}

export function aiSessionForUI(value: GrpcOutput<'QueryAISession'>['Data'][number]): AISession {
  return {
    ...value,
    question: '',
    CreatedAt: int64ToSafeNumber(value.CreatedAt),
    UpdatedAt: int64ToSafeNumber(value.UpdatedAt),
    LastUsedAt: int64ToSafeNumber(value.LastUsedAt),
    Source: Object.values(AISourceEnum).find((source) => source === value.Source) ?? AISourceEnum.other,
    StartParams: value.StartParams ? aiStartParamsForUI(value.StartParams) : undefined,
    IMSourceMeta: value.IMSourceMeta ?? undefined,
  }
}

export function thirdPartyConfigForUI(
  value: NonNullable<GrpcOutput<'QueryAIProvider'>['Providers'][number]['Config']>,
): ThirdPartyApplicationConfig {
  return {
    ...value,
    MaxTokens: value.MaxTokens === undefined ? undefined : int64ToSafeNumber(value.MaxTokens),
    TopK: value.TopK === undefined ? undefined : int64ToSafeNumber(value.TopK),
  }
}

export function aiModelForUI(value: GrpcOutput<'GetAIGlobalConfig'>['IntelligentModels'][number]): AIModelConfig {
  if (!value.Provider) throw new Error(`AI model ${value.ModelName} is missing its provider`)
  return { ...value, Provider: thirdPartyConfigForUI(value.Provider) }
}

export function aiGlobalConfigForUI(value: GrpcOutput<'GetAIGlobalConfig'>): AIGlobalConfig {
  return {
    ...value,
    RoutingPolicy: enumValue(
      value.RoutingPolicy || AIModelPolicyEnum.PolicyAuto,
      Object.values(AIModelPolicyEnum),
      'RoutingPolicy',
    ),
    IntelligentModels: value.IntelligentModels.map(aiModelForUI),
    LightweightModels: value.LightweightModels.map(aiModelForUI),
    VisionModels: value.VisionModels.map(aiModelForUI),
  }
}

export function localModelForUI(value: GrpcOutput<'GetSupportedLocalModels'>['Models'][number]): LocalModelConfig {
  return {
    ...value,
    Status: value.Status
      ? {
          ...value.Status,
          Status: enumValue(
            value.Status.Status,
            ['stopped', 'starting', 'running', 'stopping', 'error'] as const,
            'LocalModelStatus',
          ),
        }
      : null,
  }
}

export function mcpServerForUI(value: GrpcOutput<'GetAllMCPServers'>['MCPServers'][number]): MCPServer {
  return { ...value, Type: enumValue(value.Type, Object.values(AIMCPServerTypeEnum), 'MCPServer.Type') }
}

export function mcpToolForUI(value: GrpcOutput<'GetMCPToolList'>['Tools'][number]): MCPToolConfig {
  return {
    ...value,
    Source: enumValue(value.Source, ['builtin', 'aitool', 'bridge'] as const, 'MCPTool.Source'),
    DescriptionI18n: value.DescriptionI18n ?? undefined,
  }
}

export function mcpHistoryForUI(
  value: GrpcOutput<'QueryMCPToolCallHistory'>['Histories'][number],
): MCPToolCallHistorySummary {
  return {
    ...value,
    DurationMillis: int64ToSafeNumber(value.DurationMillis),
    CreatedAt: int64ToSafeNumber(value.CreatedAt),
  }
}

export { grpcPagingToUI, int64ToSafeNumber }
