import type { AIStartParams } from '@/pages/ai-re-act/hooks/grpcApi'

/** Explicit AgentMode wins; the boolean is only for sessions saved by older builds. */
export const getAgentMode = (params?: Pick<AIStartParams, 'AgentMode' | 'CodingMode'>): string =>
  params?.AgentMode || (params?.CodingMode ? 'coding' : 'security')

export const isCodingAgent = (params?: Pick<AIStartParams, 'AgentMode' | 'CodingMode'>) =>
  getAgentMode(params) === 'coding'
