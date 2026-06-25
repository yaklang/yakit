import { HotPatchTempItem } from '../fuzzer/HTTPFuzzerHotPatch'

interface HotPatchTemplateTeam {
  tags: string
  node: HotPatchTempItem[]
}

export const formatTemplateTeams = (list: HotPatchTempItem[]): HotPatchTemplateTeam[] => {
  const taggedTeams: HotPatchTemplateTeam[] = []
  const emptyTagNodes: HotPatchTempItem[] = []
  const tagIndexMap = new Map<string, number>()

  list.forEach((item) => {
    const tags = item.Tags?.trim() || ''
    if (!tags) {
      emptyTagNodes.push(item)
      return
    }
    const index = tagIndexMap.get(tags)
    if (index === undefined) {
      tagIndexMap.set(tags, taggedTeams.length)
      taggedTeams.push({ tags, node: [item] })
      return
    }
    taggedTeams[index].node.push(item)
  })

  emptyTagNodes.forEach((item) => {
    taggedTeams.push({ tags: '', node: [item] })
  })

  return taggedTeams
}
