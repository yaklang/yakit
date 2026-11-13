import { describe, expect, it, vi } from 'vitest'
import { getLocalFileLinkInfo } from '@/components/MilkdownEditor/CustomFile/utils'
import { loadAttachmentSizes } from '../../../template/aiAddMaterialsPopover/materialAttachmentList/attachmentSizes'

vi.mock('@/components/MilkdownEditor/CustomFile/utils', () => ({ getLocalFileLinkInfo: vi.fn() }))

describe('loadAttachmentSizes', () => {
  it('loads local sizes, skips pending blob URLs and retains successful results when a file is missing', async () => {
    vi.mocked(getLocalFileLinkInfo)
      .mockResolvedValueOnce({ size: 1024 } as Awaited<ReturnType<typeof getLocalFileLinkInfo>>)
      .mockRejectedValueOnce(new Error('file missing'))

    await expect(loadAttachmentSizes(['C:/report.pdf', 'blob:pending-image', 'C:/missing.txt'])).resolves.toEqual({
      'C:/report.pdf': 1024,
      'C:/missing.txt': undefined,
    })
    expect(getLocalFileLinkInfo).toHaveBeenCalledTimes(2)
    expect(getLocalFileLinkInfo).toHaveBeenCalledWith('C:/report.pdf', true)
  })
})
