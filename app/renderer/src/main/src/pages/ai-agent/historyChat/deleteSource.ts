import { AISourceEnum } from '@/pages/ai-re-act/hooks/grpcApi'

/**
 * deleteSessions 的本地「来源」枚举。
 *
 * 与 AISourceEnum 的关系：复用其全部取值，并在此基础上为 IM 会话增加「平台区分型」来源：
 * - lark = 'im-Lark'（飞书）
 * - dingTalk = 'im-DingTalk'（钉钉）
 *
 * 该区分型来源仅用于本地 sessionOwnerMap 索引与 deleteSessionsParams.source，
 * 使「按 IM 平台删除」时本地能精确命中对应平台正在运行的会话；
 * gRPC 层 Source 恒为 'im'、平台由 DeleteAISessionFilter.Platform 携带，后端契约不受影响。
 */
export enum DeleteSessionsAISourceEnum {
  aiAgent = AISourceEnum.aiAgent,
  history = AISourceEnum.history,
  knowledgeBase = AISourceEnum.knowledgeBase,
  webFuzzer = AISourceEnum.webFuzzer,
  flow = AISourceEnum.flow,
  irify = AISourceEnum.irify,
  yakRunner = AISourceEnum.yakRunner,
  browserExtension = AISourceEnum.browserExtension,
  im = AISourceEnum.im,
  other = AISourceEnum.other,
  lark = 'im-Lark', //飞书
  dingTalk = 'im-DingTalk', //钉钉
}

export type DeleteSessionsAISourceType = `${DeleteSessionsAISourceEnum}`
