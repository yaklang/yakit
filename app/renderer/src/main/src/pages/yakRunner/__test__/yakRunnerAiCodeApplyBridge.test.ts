import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'

vi.mock('@/utils/notification', () => ({
  yakitFailed: vi.fn(),
}))

vi.mock('@/pages/yakRunner/utils', () => ({
  getFileSuffixFromPath: (filePath: string) => {
    const normalized = filePath.replace(/\\/g, '/').trim()
    const name = normalized.slice(normalized.lastIndexOf('/') + 1)
    const dot = name.lastIndexOf('.')
    return dot > 0 ? name.slice(dot + 1) : ''
  },
  isYaklangScriptDeliveryPath: (filePath?: string | null) => {
    const normalized = String(filePath || '')
      .replace(/\\/g, '/')
      .trim()
    return normalized.toLowerCase().endsWith('.yak')
  },
  normalizeYakRunnerFilePath: (filePath: string) => filePath.replace(/\\/g, '/'),
}))

// eslint-disable-next-line import/first
import {
  appendYakRunnerWorkspaceContextToEvent,
  getYakRunnerPageWorkspaceContext,
  registerYakRunnerPageGetWorkspaceContext,
  YAK_RUNNER_AI_PAGE_ID,
} from '../yakRunnerAiCodeApplyBridge'

describe('appendYakRunnerWorkspaceContextToEvent', () => {
  beforeEach(() => {
    registerYakRunnerPageGetWorkspaceContext(YAK_RUNNER_AI_PAGE_ID, () => ({
      directoryPath: 'C:/project',
      filePath: 'C:/project/iotdb_poc.yak',
    }))
  })

  it('drops @mention report file_path and prefers active .yak editor tab', () => {
    const event: AIInputEvent = {
      AttachedResourceInfo: [
        {
          Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_FILE,
          Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_FILE_PATH,
          Value: 'C:/Users/me/Downloads/02_security_report.md',
        },
      ],
    }

    const result = appendYakRunnerWorkspaceContextToEvent(YAK_RUNNER_AI_PAGE_ID, event)
    const filePaths = (result.AttachedResourceInfo || [])
      .filter((item) => item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_File_ID)
      .map((item) => item.Value)

    expect(filePaths).toEqual(['C:/project/iotdb_poc.yak'])
    expect(result.AttachedResourceInfo?.some((item) => String(item.Value).includes('report.md'))).toBe(false)
  })

  it('upserts directory_path and replaces non-.yak code block delivery path', () => {
    const event: AIInputEvent = {
      AttachedResourceInfo: [
        {
          Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_File,
          Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_File_ID,
          Value: 'C:/project/readme.md',
        },
        {
          Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
          Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
          Value: JSON.stringify({ path: 'C:/project/readme.md', content: '# report' }),
        },
      ],
    }

    const result = appendYakRunnerWorkspaceContextToEvent(YAK_RUNNER_AI_PAGE_ID, event)
    const deliveryPaths = (result.AttachedResourceInfo || [])
      .filter((item) => item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_File_ID)
      .map((item) => item.Value)

    expect(deliveryPaths).toEqual(['C:/project/iotdb_poc.yak'])
    expect(
      result.AttachedResourceInfo?.some(
        (item) => item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_Directory_ID,
      ),
    ).toBe(true)
  })

  it('does not attach file_path when active tab is not .yak', () => {
    registerYakRunnerPageGetWorkspaceContext(YAK_RUNNER_AI_PAGE_ID, () => ({
      directoryPath: 'C:/project',
      filePath: 'C:/project/readme.md',
    }))

    const result = appendYakRunnerWorkspaceContextToEvent(YAK_RUNNER_AI_PAGE_ID, { AttachedResourceInfo: [] })
    expect(
      result.AttachedResourceInfo?.some(
        (item) => item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_File_ID,
      ),
    ).toBe(false)
  })
})

describe('getYakRunnerPageWorkspaceContext', () => {
  it('returns null when page is not registered', () => {
    expect(getYakRunnerPageWorkspaceContext('missing-page')).toBeNull()
  })
})
