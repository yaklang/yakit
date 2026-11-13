import { describe, expect, it } from 'vitest'
import { getWorkspaceAddedCounts } from '../workspaceAddedCounts'

describe('getWorkspaceAddedCounts', () => {
  it('合并正文和表格勾选，附件不计入文件系统', () => {
    expect(
      getWorkspaceAddedCounts({
        resourceIds: { risk: ['1', '2'], http: ['9'] },
        selectedResourceIds: { risk: ['2', '3'], http: ['9', '10'] },
        mentions: [
          { mentionType: 'file', mentionId: '/tmp/a.txt', mentionName: '/tmp/a.txt' },
          { mentionType: 'folder', mentionId: '/tmp/dir', mentionName: '/tmp/dir' },
          {
            mentionType: 'file',
            mentionId: '/tmp/b.txt',
            mentionName: '/tmp/b.txt',
            mentionSource: 'attachment',
          },
        ],
      }),
    ).toEqual({ risk: 3, traffic: 2, fileSystem: 2 })
  })

  it('没有选中资料时数量为 0', () => {
    expect(
      getWorkspaceAddedCounts({
        resourceIds: { risk: [], http: [] },
        selectedResourceIds: { risk: [], http: [] },
        mentions: [],
      }),
    ).toEqual({ risk: 0, traffic: 0, fileSystem: 0 })
  })
})
