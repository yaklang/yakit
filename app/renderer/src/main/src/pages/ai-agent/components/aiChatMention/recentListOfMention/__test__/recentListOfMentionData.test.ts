import { beforeEach, describe, expect, it, vi } from 'vitest'
import { grpcGetAISessionCurrentResources, grpcQueryAIForge, grpcQueryKnowledgeBase } from '../../../../grpc'
import { grpcQueryAITool } from '../../../../aiToolList/utils'
import { fetchIsFolderByPath } from '../../../../aiChatWelcome/utils'
import type { AISessionTaskResourceInfo, GetAISessionCurrentResourcesResponse } from '../../../../type/sessionResources'
import {
  createEmptyRecentMentionResources,
  loadRecentMentionResources,
  parseRecentMentionResources,
} from '../recentListOfMentionData'

vi.mock('../../../../grpc', () => ({
  grpcGetAISessionCurrentResources: vi.fn(),
  grpcQueryAIForge: vi.fn(),
  grpcQueryKnowledgeBase: vi.fn(),
}))
vi.mock('../../../../aiToolList/utils', () => ({ grpcQueryAITool: vi.fn() }))
vi.mock('../../../../aiChatWelcome/utils', () => ({ fetchIsFolderByPath: vi.fn() }))
vi.mock('../../../../defaultConstant', () => ({
  AttachedResourceTypeEnum: {
    CONTEXT_PROVIDER_TYPE_AIFORGE: 'aiforge',
    CONTEXT_PROVIDER_TYPE_AITOOL: 'aitool',
    CONTEXT_PROVIDER_TYPE_KNOWLEDGE_BASE: 'knowledge_base',
    CONTEXT_PROVIDER_TYPE_BROWSER: 'browser',
    CONTEXT_PROVIDER_TYPE_FILE: 'file',
  },
  AttachedResourceKeyEnum: {
    CONTEXT_PROVIDER_KEY_NAME: 'name',
    CONTEXT_PROVIDER_KEY_SYSTEM_FLAG: 'system_flag',
    CONTEXT_PROVIDER_KEY_BROWSER_DEVICE_ID: 'device_id',
    CONTEXT_PROVIDER_KEY_FILE_PATH: 'file_path',
  },
}))
vi.mock('@/utils/tool', () => ({ JSONParseLog: JSON.parse }))

const resource = (Type: string, Key: string, Value: string): AISessionTaskResourceInfo => ({
  Type,
  Key,
  Value,
  Scope: 'turn',
  Source: 'attached_resource_info',
})
const response = (TaskResources: AISessionTaskResourceInfo[]): GetAISessionCurrentResourcesResponse => ({
  SessionID: 'session-1',
  TaskID: 'task-1',
  UserInputUUID: 'input-1',
  TaskResources,
  SessionResources: [],
})

beforeEach(() => vi.clearAllMocks())

describe('recent mention resources', () => {
  it('returns empty categories before a session exists without querying', async () => {
    expect(await loadRecentMentionResources('')).toEqual({ ...createEmptyRecentMentionResources(), browserIDs: [] })
    expect(grpcGetAISessionCurrentResources).not.toHaveBeenCalled()
  })

  it('deduplicates resource names and file paths and omits unsupported resource types', () => {
    expect(
      parseRecentMentionResources([
        resource('aiforge', 'name', 'review'),
        resource('aiforge', 'name', 'review'),
        resource('aitool', 'name', 'read-file'),
        resource('file', 'file_path', '/tmp/a.txt'),
        resource('file', 'file_path', '/tmp/a.txt'),
        resource('risk', 'ids', '[101]'),
        resource('browser', 'device_id', '{"deviceId":"browser-1","name":"A"}'),
      ]),
    ).toEqual({
      filePaths: ['/tmp/a.txt'],
      forgeNames: ['review'],
      toolNames: ['read-file'],
      knowledgeBaseNames: [],
      browserIDs: ['browser-1'],
    })
  })

  it('does not expand the all-knowledge-bases flag in recent resources', async () => {
    vi.mocked(grpcGetAISessionCurrentResources).mockResolvedValue(
      response([resource('knowledge_base', 'system_flag', 'all_knowledge_base')]),
    )
    expect((await loadRecentMentionResources('session-1')).knowledgeBases).toEqual([])
    expect(grpcQueryKnowledgeBase).not.toHaveBeenCalled()
    expect(grpcQueryAITool).not.toHaveBeenCalled()
  })

  it('resolves file and folder paths from the current task', async () => {
    vi.mocked(grpcGetAISessionCurrentResources).mockResolvedValue(
      response([resource('file', 'file_path', '/docs/report.pdf'), resource('file', 'file_path', '/docs/archive')]),
    )
    vi.mocked(fetchIsFolderByPath).mockImplementation(async (path) => path === '/docs/archive')
    expect((await loadRecentMentionResources('session-1')).files).toEqual([
      { path: '/docs/report.pdf', isFolder: false },
      { path: '/docs/archive', isFolder: true },
    ])
  })

  it('queries full data by names and resolves only after every category finishes', async () => {
    vi.mocked(grpcGetAISessionCurrentResources).mockResolvedValue({
      ...response([
        resource('aiforge', 'name', 'review'),
        resource('aitool', 'name', 'read-file'),
        resource('aitool', 'name', 'list-files'),
        resource('aitool', 'name', 'read-file'),
        resource('knowledge_base', 'name', 'docs'),
        resource('knowledge_base', 'system_flag', 'all_knowledge_base'),
        resource('browser', 'device_id', '{"deviceId":"browser-1"}'),
      ]),
      SessionResources: [resource('aiforge', 'name', 'old-skill')],
    })
    const skill = { Id: 1, ForgeName: 'review', Description: 'Review documents' }
    const tool = { ID: 2, Name: 'read-file', Description: 'Read a file' }
    const listTool = { ID: 3, Name: 'list-files', Description: 'List files' }
    const knowledgeBase = { ID: '3', KnowledgeBaseName: 'docs' }
    let resolveKnowledge!: (value: any) => void
    vi.mocked(grpcQueryAIForge).mockResolvedValue({ Data: [skill] } as any)
    vi.mocked(grpcQueryAITool).mockResolvedValue({ Data: [listTool, tool] } as any)
    vi.mocked(grpcQueryKnowledgeBase).mockReturnValue(
      new Promise((resolve) => {
        resolveKnowledge = resolve
      }),
    )
    const completed = vi.fn()
    const pending = loadRecentMentionResources('session-1').then(completed)
    await vi.waitFor(() => expect(grpcQueryKnowledgeBase).toHaveBeenCalled())
    expect(completed).not.toHaveBeenCalled()
    expect(grpcGetAISessionCurrentResources).toHaveBeenCalledWith({ SessionID: 'session-1' }, true)
    expect(grpcQueryAIForge).toHaveBeenCalledWith(
      expect.objectContaining({
        Pagination: expect.objectContaining({ Limit: -1 }),
        Filter: { ForgeNames: ['review'] },
      }),
      true,
    )
    expect(grpcQueryAITool).toHaveBeenCalledExactlyOnceWith(
      {
        Pagination: expect.objectContaining({ Limit: -1 }),
        Filter: { ToolNames: ['read-file', 'list-files'] },
      },
      true,
    )
    expect(grpcQueryKnowledgeBase).toHaveBeenCalledWith(expect.objectContaining({ Filter: { Names: ['docs'] } }), true)
    resolveKnowledge({ Data: [knowledgeBase] })
    await pending
    expect(completed).toHaveBeenCalledWith({
      ...createEmptyRecentMentionResources(),
      skills: [skill],
      tools: [tool, listTool],
      knowledgeBases: [knowledgeBase],
      browserIDs: ['browser-1'],
    })
  })

  it('keeps all tools returned by QueryAITool when names differ from the session references', async () => {
    vi.mocked(grpcGetAISessionCurrentResources).mockResolvedValue(
      response([
        resource('aitool', 'name', 'read-file'),
        resource('aitool', 'name', 'list-files'),
        resource('aitool', 'name', 'find-file'),
      ]),
    )
    const readTool = { ID: 2, Name: 'read-file' }
    const listTool = { ID: 3, Name: 'list_files' }
    const findTool = { ID: 4, Name: 'find_file' }
    vi.mocked(grpcQueryAITool).mockResolvedValue({ Data: [listTool, readTool, findTool] } as any)

    expect((await loadRecentMentionResources('session-1')).tools).toEqual([readTool, listTool, findTool])
  })

  it('propagates lookup failure after the other category finishes', async () => {
    vi.mocked(grpcGetAISessionCurrentResources).mockResolvedValue(
      response([resource('aiforge', 'name', 'review'), resource('knowledge_base', 'name', 'docs')]),
    )
    vi.mocked(grpcQueryAIForge).mockRejectedValue(new Error('unavailable'))
    let finish!: (value: any) => void
    vi.mocked(grpcQueryKnowledgeBase).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const rejected = vi.fn()
    const pending = loadRecentMentionResources('session-1').catch(rejected)
    await vi.waitFor(() => expect(grpcQueryKnowledgeBase).toHaveBeenCalled())
    expect(rejected).not.toHaveBeenCalled()
    finish({ Data: [] })
    await pending
    expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ message: 'unavailable' }))
  })
})
