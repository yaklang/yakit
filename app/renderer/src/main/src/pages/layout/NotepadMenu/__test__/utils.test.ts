import { beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import emiter from '@/utils/eventBus/eventBus'
import { grpcQueryNote } from '@/pages/notepadManage/notepadManage/utils'
import { openLatestOrNewNotepad } from '../utils'

vi.mock('@/utils/envfile', () => ({
  isEnpriTrace: () => false,
}))

vi.mock('@/pages/notepadManage/notepadManage/utils', () => ({
  grpcQueryNote: vi.fn(),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

const queryMock = vi.mocked(grpcQueryNote)
const emitMock = vi.mocked(emiter.emit)

const openPayload = (params?: { notepadHash?: string; title?: string }) =>
  JSON.stringify({
    route: YakitRoute.Modify_Notepad,
    ...(params ? { params } : {}),
  })

describe('openLatestOrNewNotepad', () => {
  beforeEach(() => {
    queryMock.mockReset()
    emitMock.mockReset()
  })

  it('有有效 Id 时打开最近记事本', async () => {
    queryMock.mockResolvedValue({ Data: [{ Id: 12, Title: '上周笔记' }] } as never)
    openLatestOrNewNotepad()
    await vi.waitFor(() => {
      expect(emitMock).toHaveBeenCalledWith('openPage', openPayload({ notepadHash: '12', title: '上周笔记' }))
    })
  })

  it('没有数据时新建', async () => {
    queryMock.mockResolvedValue({ Data: [] } as never)
    openLatestOrNewNotepad()
    await vi.waitFor(() => {
      expect(emitMock).toHaveBeenCalledWith('openPage', openPayload({ notepadHash: '' }))
    })
  })

  it('Id 为空时走新建', async () => {
    queryMock.mockResolvedValue({ Data: [{ Id: 0, Title: '空' }] } as never)
    openLatestOrNewNotepad()
    await vi.waitFor(() => {
      expect(emitMock).toHaveBeenCalledWith('openPage', openPayload({ notepadHash: '' }))
    })
  })

  it('查询失败时兜底新建', async () => {
    queryMock.mockRejectedValue(new Error('query-fail'))
    openLatestOrNewNotepad()
    await vi.waitFor(() => {
      expect(emitMock).toHaveBeenCalledWith('openPage', openPayload())
    })
  })
})
