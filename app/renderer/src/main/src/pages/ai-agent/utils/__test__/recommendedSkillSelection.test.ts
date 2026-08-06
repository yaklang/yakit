import { describe, expect, it } from 'vitest'
import { restoreRecommendedSkillSelection, serializeRecommendedSkillSelection } from '../recommendedSkillSelection'
import type { AIReActRecommendedSkill } from '@/pages/ai-re-act/hooks/grpcApi'

const skills: AIReActRecommendedSkill[] = [
  {
    Name: 'security-engineering',
    Type: 'skill',
    DisplayNameZhCN: '安全领域',
    Description: 'general security',
  },
  {
    Name: 'pentest-task-design',
    Type: 'skill',
    DisplayNameZhCN: '渗透测试',
    Description: 'pentest',
  },
]

describe('recommended Skill selection cache', () => {
  it('首次新建会话默认选择后端推荐列表第一项', () => {
    // 没有历史选择时，预期默认启用通用安全场景。
    expect(restoreRecommendedSkillSelection(skills, '')).toEqual([skills[0]])
  })

  it('下次新建会话恢复用户上次选择', () => {
    // 用户上次选择渗透测试，预期重新进入欢迎页后仍选择渗透测试。
    const cached = JSON.stringify([{ Type: 'skill', Name: 'pentest-task-design' }])
    expect(restoreRecommendedSkillSelection(skills, cached)).toEqual([skills[1]])
  })

  it('支持记忆多选和显式不选择任何 Skill', () => {
    // 多选逐项恢复；空数组表示用户主动取消全部选择，不应回退默认项。
    expect(restoreRecommendedSkillSelection(skills, serializeRecommendedSkillSelection(skills))).toEqual(skills)
    expect(restoreRecommendedSkillSelection(skills, '[]')).toEqual([])
  })

  it('缓存项已不再推荐时回退第一项', () => {
    // 后端推荐列表升级后旧名称可能消失，预期安全回退而不是发送无效能力。
    const cached = JSON.stringify([{ Type: 'skill', Name: 'removed-skill' }])
    expect(restoreRecommendedSkillSelection(skills, cached)).toEqual([skills[0]])
  })
})
