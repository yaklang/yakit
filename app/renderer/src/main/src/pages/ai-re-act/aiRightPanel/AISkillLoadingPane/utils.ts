import type { GetSkillListParams } from './type'

export const getSkillList = ({ skills, loadState, keyword = '', sortOrder }: GetSkillListParams) => {
  const query = keyword.trim().toLowerCase()
  const list = skills.filter(
    (skill) =>
      skill.skill_load_state === loadState &&
      (!query || skill.name.toLowerCase().includes(query) || skill.description.toLowerCase().includes(query)),
  )
  if (loadState === 'loaded' && sortOrder) {
    list.sort((a, b) => ((a.token_count ?? 0) - (b.token_count ?? 0)) * (sortOrder === 'asc' ? 1 : -1))
  }
  return list
}
