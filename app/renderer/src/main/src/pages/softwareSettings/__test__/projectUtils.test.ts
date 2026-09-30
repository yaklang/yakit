import { describe, expect, it } from 'vitest'
import {
  canCreateSubFolder,
  getSubmitFolderState,
  resolveParentFolderIds,
  type ProjectParamsProp,
} from '../projectUtils'

describe('resolveParentFolderIds', () => {
  it('一级文件夹：FolderId 为自己，ChildFolderId 为 0', () => {
    expect(resolveParentFolderIds({ Id: 5, FolderId: 0 })).toEqual({ FolderId: 5, ChildFolderId: 0 })
  })

  it('二级文件夹：FolderId 为一级文件夹，ChildFolderId 为自己', () => {
    expect(resolveParentFolderIds({ Id: 12, FolderId: 5 })).toEqual({ FolderId: 5, ChildFolderId: 12 })
  })

  it('后端返回字符串 id 时也转成数字', () => {
    const parent = { Id: '12', FolderId: '5' } as unknown as { Id: number; FolderId: number }
    expect(resolveParentFolderIds(parent)).toEqual({ FolderId: 5, ChildFolderId: 12 })
  })
})

describe('canCreateSubFolder', () => {
  it('一级文件夹下可以新建子文件夹', () => {
    expect(canCreateSubFolder({ FolderId: 0 })).toBe(true)
  })

  it('二级文件夹下不能再建子文件夹', () => {
    expect(canCreateSubFolder({ FolderId: 5 })).toBe(false)
  })

  it('后端返回字符串 id 时也能判断', () => {
    expect(canCreateSubFolder({ FolderId: '0' } as unknown as { FolderId: number })).toBe(true)
    expect(canCreateSubFolder({ FolderId: '5' } as unknown as { FolderId: number })).toBe(false)
  })
})

describe('getSubmitFolderState', () => {
  const params: ProjectParamsProp = {
    Type: 'file',
    ProjectName: 'kw',
    FolderId: 5,
    ChildFolderId: 12,
    Pagination: { Page: 3, Limit: 20, Order: 'desc', OrderBy: 'updated_at' },
  }
  const Pagination = { ...params.Pagination, Page: 1 }
  const twoLevelFiles = [
    { Id: 5, ProjectName: 'A', FolderId: 0 },
    { Id: 12, ProjectName: 'X', FolderId: 5 },
  ]

  it('folders 为 undefined：不改 files，只把页码重置为 1', () => {
    const next = getSubmitFolderState(undefined, params)
    expect(next.files).toBeUndefined()
    expect(next.params).toEqual({ ...params, Pagination })
  })

  it('folders 为 []：回到根目录，并清掉搜索和类型筛选', () => {
    const next = getSubmitFolderState([], params)
    expect(next.files).toEqual([])
    expect(next.params).toStrictEqual({ Type: 'all', Pagination, FolderId: undefined, ChildFolderId: undefined })
  })

  it('选了一级文件夹：进入该文件夹', () => {
    const next = getSubmitFolderState([{ Id: 5, ProjectName: 'A' }], params)
    expect(next.files).toEqual([{ Id: 5, ProjectName: 'A', FolderId: 0 }])
    expect(next.params).toStrictEqual({ Type: 'all', Pagination, FolderId: 5, ChildFolderId: undefined })
  })

  it('选了二级文件夹：进入该文件夹，其 FolderId 为一级文件夹 id', () => {
    const next = getSubmitFolderState(
      [
        { Id: 5, ProjectName: 'A' },
        { Id: 12, ProjectName: 'X' },
      ],
      params,
    )
    const files = next.files || []
    expect(files).toStrictEqual(twoLevelFiles)
    expect(next.params).toEqual({ Type: 'all', Pagination, FolderId: 5, ChildFolderId: 12 })
    expect(resolveParentFolderIds(files[1])).toEqual({ FolderId: 5, ChildFolderId: 12 })
  })

  it('后端返回字符串 id 时也转成数字', () => {
    const folders = [
      { Id: '5', ProjectName: 'A' },
      { Id: '12', ProjectName: 'X' },
    ] as unknown as { Id: number; ProjectName: string }[]
    const next = getSubmitFolderState(folders, params)
    expect(next.files).toStrictEqual(twoLevelFiles)
    expect(next.params).toEqual({ Type: 'all', Pagination, FolderId: 5, ChildFolderId: 12 })
  })

  it('级联选项上的多余字段不带进 files', () => {
    const option = { Id: 5, ProjectName: 'A', FolderId: 0, children: [], loading: false, isLeaf: false }
    const [file] = getSubmitFolderState([option], params).files || []
    expect(file).toStrictEqual({ Id: 5, ProjectName: 'A', FolderId: 0 })
  })

  it('不修改传入的 params', () => {
    getSubmitFolderState(undefined, params)
    getSubmitFolderState([{ Id: 5, ProjectName: 'A' }], params)
    expect(params.Pagination.Page).toBe(3)
  })
})
