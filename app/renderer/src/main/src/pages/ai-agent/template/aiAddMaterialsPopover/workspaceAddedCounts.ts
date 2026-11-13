import type { AIMentionCommandParams } from '../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import { parseResourceReferenceIds } from '../../components/aiMilkdownInput/aiMilkdownResourceReference/resourceReferenceIds'
import type { AIResourceIds } from '../type'

/** 欢迎页卡片与资料弹层共用的已添加数量。 */
export interface WorkspaceAddedCounts {
  risk: number
  traffic: number
  fileSystem: number
}

interface WorkspaceAddedCountInput {
  mentions: AIMentionCommandParams[]
  resourceIds: AIResourceIds
  selectedResourceIds: AIResourceIds
}

/** 统计当前会话已选的漏洞、流量和文件系统资料，口径与「其他已添加资料」一致。 */
export const getWorkspaceAddedCounts = ({
  mentions,
  resourceIds,
  selectedResourceIds,
}: WorkspaceAddedCountInput): WorkspaceAddedCounts => {
  const attachmentCount = mentions.filter(
    (item) => item.mentionType === 'file' && item.mentionSource === 'attachment',
  ).length
  const countMentions = (type: AIMentionCommandParams['mentionType']) =>
    mentions.filter((item) => item.mentionType === type).length
  return {
    risk: parseResourceReferenceIds([...resourceIds.risk, ...selectedResourceIds.risk]).length,
    traffic: parseResourceReferenceIds([...resourceIds.http, ...selectedResourceIds.http]).length,
    fileSystem: countMentions('file') + countMentions('folder') - attachmentCount,
  }
}
