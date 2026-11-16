import type { AIStartParams } from '@/pages/ai-re-act/hooks/grpcApi'

/** Session mode is fixed at startup; unspecified mode uses the security agent. */
export const getAgentMode = (params?: Pick<AIStartParams, 'AgentMode'>): string => params?.AgentMode || 'security'

export const isCodingAgent = (params?: Pick<AIStartParams, 'AgentMode'>) => getAgentMode(params) === 'coding'
