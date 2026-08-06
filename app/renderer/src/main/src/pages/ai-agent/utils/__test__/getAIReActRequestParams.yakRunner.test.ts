import { describe, expect, it, vi } from 'vitest'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'

vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: {},
}))

vi.mock('@/utils/envfile', () => ({
  isIRify: () => false,
}))

vi.mock('@/pages/yakRunner/utils', () => ({
  isYaklangScriptDeliveryPath: (filePath?: string | null) => {
    const normalized = String(filePath || '')
      .replace(/\\/g, '/')
      .trim()
    return normalized.toLowerCase().endsWith('.yak')
  },
}))

// eslint-disable-next-line import/first
import { getAIReActRequestParams } from '@/pages/ai-agent/utils'

describe('getAIReActRequestParams yaklangScriptDeliveryOnly', () => {
  it('does not attach @mention file paths as delivery file_path', () => {
    const { attachedResourceInfo } = getAIReActRequestParams(
      {
        qs: 'write poc',
        mentionList: [
          {
            mentionType: 'file',
            mentionId: 'C:/Users/me/report.md',
            mentionName: 'C:/Users/me/report.md',
          },
        ],
      },
      { yaklangScriptDeliveryOnly: true },
    )

    expect(
      attachedResourceInfo?.some((item) => item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_FILE_PATH),
    ).toBe(false)
  })

  it('maps folder mention to directory_path instead of file_path', () => {
    const { attachedResourceInfo } = getAIReActRequestParams(
      {
        qs: 'write poc',
        mentionList: [
          {
            mentionType: 'folder',
            mentionId: 'C:/project',
            mentionName: 'C:/project',
          },
        ],
      },
      { yaklangScriptDeliveryOnly: true },
    )

    expect(attachedResourceInfo).toEqual([
      {
        Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_File,
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_Directory_ID,
        Value: 'C:/project',
      },
      {
        Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_HTTP_FLOW,
        Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_HTTP_FLOW_ID,
        Value: [],
      },
    ])
  })

  it('omits non-.yak code block file_path but keeps selected content', () => {
    const { attachedResourceInfo } = getAIReActRequestParams(
      {
        qs: 'fix',
        codeBlockList: [
          {
            path: 'C:/project/readme.md',
            rootPath: 'C:/project',
            content: '# title',
            language: 'markdown',
            name: 'readme.md',
            range: null,
          },
        ],
      },
      { yaklangScriptDeliveryOnly: true },
    )

    expect(
      attachedResourceInfo?.some(
        (item) => item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_File_ID,
      ),
    ).toBe(false)
    expect(
      attachedResourceInfo?.some(
        (item) => item.Key === AttachedResourceKeyEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_Content,
      ),
    ).toBe(true)
  })
})
