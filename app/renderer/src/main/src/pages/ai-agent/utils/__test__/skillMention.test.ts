import { describe, expect, it } from 'vitest'
import { skillMentionRow } from '../../components/aiChatMention/mentionListData'
import { getResourceInfoByMention } from '../mentionResources'

describe('skill mentions', () => {
  it.each([
    ['审计技能', '审计技能'],
    ['', 'review-skill'],
  ])('sends the original skill name with display alias %j', (verboseName, displayName) => {
    const row = skillMentionRow({
      Id: 1,
      ForgeType: 'skillmd',
      ForgeName: 'review-skill',
      ForgeVerboseName: verboseName,
    })
    expect(row.name).toBe(displayName)
    expect(
      getResourceInfoByMention({
        mentionId: row.id,
        mentionType: 'forge',
        mentionName: row.name,
        name: row.originalName,
      }),
    ).toEqual({ Type: 'aiforge', Key: 'name', Value: 'review-skill' })
  })

  it('keeps older skill mentions that only saved mentionName usable', () => {
    expect(
      getResourceInfoByMention({
        mentionId: '1',
        mentionType: 'forge',
        mentionName: 'review-skill',
      }),
    ).toEqual({ Type: 'aiforge', Key: 'name', Value: 'review-skill' })
  })
})
