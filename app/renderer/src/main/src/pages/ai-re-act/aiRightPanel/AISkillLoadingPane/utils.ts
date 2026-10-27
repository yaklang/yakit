import { AISkillLoadStateEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import type { GetSkillListParams } from './type'

/** 筛选已加载技能，支持关键词搜索和 Token 排序 */
export const getSkillList = ({ skills, keyword = '', sortOrder }: GetSkillListParams) => {
  const query = keyword.trim().toLowerCase()
  const list = skills.filter(
    (skill) =>
      skill.skill_load_state === AISkillLoadStateEnum.Loaded &&
      (!query || skill.name.toLowerCase().includes(query) || skill.description.toLowerCase().includes(query)),
  )
  if (sortOrder) {
    list.sort((a, b) => ((a.token_count ?? 0) - (b.token_count ?? 0)) * (sortOrder === 'asc' ? 1 : -1))
  }
  return list
}
