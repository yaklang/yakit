import { describe, expect, it } from 'vitest'
import { toolMentionRow } from '../../components/aiChatMention/mentionListData'
import type { AITool } from '../../type/aiTool'
import { getResourceInfoByMention } from '../mentionResources'

describe('tool mentions', () => {
  it.each([
    ['zh', { Zh: '批量处置安全风险', En: 'Triage Cybersecurity Risks' }, '旧展示名', '批量处置安全风险'],
    ['zh-TW', { Zh: '批量处置安全风险', En: 'Triage Cybersecurity Risks' }, '', '批量处置安全风险'],
    ['en', { Zh: '批量处置安全风险', En: 'Triage Cybersecurity Risks' }, '旧展示名', 'Triage Cybersecurity Risks'],
    ['zh', { Zh: '', En: 'Triage Cybersecurity Risks' }, '旧展示名', 'Triage Cybersecurity Risks'],
    ['en', { Zh: '批量处置安全风险', En: '' }, '旧展示名', '批量处置安全风险'],
    ['zh', undefined, '旧展示名', '旧展示名'],
    ['en', undefined, '', 'query-tool'],
  ])(
    'uses the %s display label and sends the original tool name',
    (language, VerboseNameI18n, VerboseName, displayName) => {
      const tool: AITool = {
        ID: 1,
        Name: 'query-tool',
        VerboseName,
        VerboseNameI18n,
        Description: '',
        Content: '',
        ToolPath: '',
        Keywords: [],
        IsFavorite: false,
        UpdatedAt: 0,
        CreatedAt: 0,
        IsBuiltin: false,
        Author: '',
      }
      const row = toolMentionRow(tool, language)
      expect(row.name).toBe(displayName)
      expect(
        getResourceInfoByMention({
          mentionId: row.id,
          mentionType: 'tool',
          mentionName: row.name,
          name: row.originalName,
        }),
      ).toEqual({ Type: 'aitool', Key: 'name', Value: 'query-tool' })
    },
  )

  it('uses the saved mentionName for a tool mention without an original name', () => {
    expect(
      getResourceInfoByMention({
        mentionId: '1',
        mentionType: 'tool',
        mentionName: 'query-tool',
      }),
    ).toEqual({ Type: 'aitool', Key: 'name', Value: 'query-tool' })
  })
})
