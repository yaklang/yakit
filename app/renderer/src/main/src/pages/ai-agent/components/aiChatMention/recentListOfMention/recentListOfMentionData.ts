import { genDefaultPagination } from '@/pages/invoker/schema'
import { JSONParseLog } from '@/utils/tool'
import { fetchIsFolderByPath } from '../../../aiChatWelcome/utils'
import { grpcQueryAITool } from '../../../aiToolList/utils'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '../../../defaultConstant'
import { grpcGetAISessionCurrentResources, grpcQueryAIForge, grpcQueryKnowledgeBase } from '../../../grpc'
import type { AIDraftMaterials } from '../../../type/aiChat'
import type { AISessionTaskResourceInfo } from '../../../type/sessionResources'

export const createEmptyRecentMentionResources = (): AIDraftMaterials => ({
  attachments: [],
  skills: [],
  knowledgeBases: [],
  tools: [],
  files: [],
  browsers: [],
  scenarios: [],
})

export const parseRecentMentionResources = (resources: AISessionTaskResourceInfo[]) => {
  const valuesOf = (type: AttachedResourceTypeEnum, key = AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_NAME) => [
    ...new Set(
      resources
        .filter((item) => item.Type === type && item.Key === key)
        .map((item) => item.Value)
        .filter(Boolean),
    ),
  ]
  const browserIDs = resources
    .filter(
      (item) =>
        item.Type === AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_BROWSER &&
        item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_BROWSER_DEVICE_ID,
    )
    .map((item) => JSONParseLog(item.Value, { throwOnError: false })?.deviceId as string | undefined)
    .filter((id): id is string => Boolean(id))

  return {
    filePaths: valuesOf(
      AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_FILE,
      AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_FILE_PATH,
    ),
    forgeNames: valuesOf(AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_AIFORGE),
    toolNames: valuesOf(AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_AITOOL),
    knowledgeBaseNames: valuesOf(AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_KNOWLEDGE_BASE),
    browserIDs,
  }
}

export const loadRecentMentionResources = async (
  sessionID: string,
): Promise<AIDraftMaterials & { browserIDs: string[] }> => {
  const resources = createEmptyRecentMentionResources()
  if (!sessionID) return { ...resources, browserIDs: [] }

  const response = await grpcGetAISessionCurrentResources({ SessionID: sessionID }, true)
  const references = parseRecentMentionResources(response.SessionResources ?? [])
  const pagination = genDefaultPagination(-1)
  const results = await Promise.allSettled([
    Promise.all(
      references.filePaths.map(async (path) => ({ path, isFolder: (await fetchIsFolderByPath(path)) ?? false })),
    ).then((files) => {
      resources.files = files
    }),
    references.forgeNames.length
      ? grpcQueryAIForge({ Pagination: pagination, Filter: { ForgeNames: references.forgeNames } }, true).then(
          (result) => {
            resources.skills = result.Data ?? []
          },
        )
      : Promise.resolve(),
    references.toolNames.length
      ? grpcQueryAITool({ Pagination: pagination, Filter: { ToolNames: references.toolNames } }, true).then(
          (result) => {
            resources.tools = result.Data ?? []
          },
        )
      : Promise.resolve(),
    references.knowledgeBaseNames.length
      ? grpcQueryKnowledgeBase(
          {
            Pagination: pagination,
            Filter: { Names: references.knowledgeBaseNames },
          },
          true,
        ).then((result) => {
          resources.knowledgeBases = result.Data ?? []
        })
      : Promise.resolve(),
  ])
  const failure = results.find((result) => result.status === 'rejected')
  if (failure?.status === 'rejected') throw failure.reason

  return { ...resources, browserIDs: references.browserIDs }
}
