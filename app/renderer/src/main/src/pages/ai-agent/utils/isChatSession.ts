import type { AISession } from '../type/aiChat'

/** 已绑定正式会话，草稿会话不参与会话同步。 */
export const isChatSession = (session?: AISession): session is AISession & { isDraftSession?: false } =>
  !!session?.SessionID && !session.isDraftSession
