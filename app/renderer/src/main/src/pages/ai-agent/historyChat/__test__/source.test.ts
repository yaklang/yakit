import { describe, expect, it } from 'vitest'
import type { AISession } from '../../type/aiChat'
import {
  filterHistorySessionsBySource,
  getHistorySessionIconMeta,
  getHistorySourceFilterCounts,
  getHistorySourceQuerySources,
  getSessionDisplayTitle,
} from '../source'

const session = (item: Partial<AISession>): AISession => item as AISession

describe('history session icon meta', () => {
  it('uses the local icon meta for non-IM sessions', () => {
    expect(
      getHistorySessionIconMeta(
        session({
          Source: 'ai',
          Title: 'Local session',
        }),
      ),
    ).toEqual({
      source: 'local',
      chatKind: 'local',
      label: '本地会话',
      isIM: false,
      isGroupLike: false,
    })
  })

  it('uses group icon meta for Feishu group sessions', () => {
    expect(
      getHistorySessionIconMeta(
        session({
          Source: 'im',
          Title: 'Feishu group',
          IMSourceMeta: {
            Platform: 'feishu',
            ChatType: 'group',
          },
        }),
      ),
    ).toMatchObject({
      source: 'feishu',
      chatKind: 'group',
      label: '飞书群聊',
      isIM: true,
      isGroupLike: true,
    })
  })

  it('uses private icon meta for Dingtalk private sessions', () => {
    expect(
      getHistorySessionIconMeta(
        session({
          Source: 'im',
          Title: 'Dingtalk DM',
          IMSourceMeta: {
            Platform: 'dingtalk',
            ChatType: 'private',
          },
        }),
      ),
    ).toMatchObject({
      source: 'dingtalk',
      chatKind: 'private',
      label: '钉钉私聊',
      isIM: true,
      isGroupLike: false,
    })
  })
})

describe('session display title', () => {
  it('uses the AI-generated title for IM private sessions', () => {
    expect(
      getSessionDisplayTitle(
        session({
          Source: 'im',
          Title: '调用 ostype',
          IMSourceMeta: {
            Platform: 'feishu',
            ChatType: 'private',
            ChatTitle: '私聊会话',
            SenderName: '高鹏',
          },
        }),
      ),
    ).toBe('调用 ostype')
  })

  it('uses the chat title for IM group sessions when available', () => {
    expect(
      getSessionDisplayTitle(
        session({
          Source: 'im',
          Title: '自动生成标题',
          IMSourceMeta: {
            Platform: 'dingtalk',
            ChatType: 'group',
            ChatTitle: '安全测试群',
          },
        }),
      ),
    ).toBe('安全测试群')
  })

  it('falls back to the AI-generated title for IM group sessions without a chat title', () => {
    expect(
      getSessionDisplayTitle(
        session({
          Source: 'im',
          Title: '分析群内任务',
          IMSourceMeta: {
            Platform: 'feishu',
            ChatType: 'group',
          },
        }),
      ),
    ).toBe('分析群内任务')
  })

  it('falls back to the AI-generated title for IM group sessions with a generic chat title', () => {
    expect(
      getSessionDisplayTitle(
        session({
          Source: 'im',
          Title: '分析群内任务',
          IMSourceMeta: {
            Platform: 'feishu',
            ChatType: 'group',
            ChatTitle: '群聊会话',
          },
        }),
      ),
    ).toBe('分析群内任务')
  })
})

describe('history source filters', () => {
  const sessions = [
    session({ SessionID: 'local-ai', Source: 'ai', Title: 'Local AI' }),
    session({ SessionID: 'local-legacy', Source: '', Title: 'Legacy AI' }),
    session({
      SessionID: 'feishu-private',
      Source: 'im',
      Title: 'Feishu DM',
      IMSourceMeta: { Platform: 'feishu', ChatType: 'private' },
    }),
    session({
      SessionID: 'dingtalk-group',
      Source: 'im',
      Title: 'Dingtalk Group',
      IMSourceMeta: { Platform: 'dingtalk', ChatType: 'group' },
    }),
  ]

  it('filters sessions by local and IM platform source', () => {
    expect(filterHistorySessionsBySource(sessions, 'local').map((item) => item.SessionID)).toEqual([
      'local-ai',
      'local-legacy',
    ])
    expect(filterHistorySessionsBySource(sessions, 'feishu').map((item) => item.SessionID)).toEqual(['feishu-private'])
    expect(filterHistorySessionsBySource(sessions, 'dingtalk').map((item) => item.SessionID)).toEqual([
      'dingtalk-group',
    ])
  })

  it('counts sessions by visible history source', () => {
    expect(getHistorySourceFilterCounts(sessions)).toEqual({
      local: 2,
      feishu: 1,
      dingtalk: 1,
    })
  })

  it('maps visible history source filters to grpc query sources', () => {
    expect(getHistorySourceQuerySources(['ai', 'im', ''], 'local')).toEqual(['ai', ''])
    expect(getHistorySourceQuerySources(['ai', 'im', ''], 'feishu')).toEqual(['im'])
    expect(getHistorySourceQuerySources(['ai'], 'feishu')).toEqual([])
  })
})
