import { describe, expect, it } from 'vitest'
import type { CHeaderTreeNode } from '../CHeaderManagerType'
import {
  decodePreviewContent,
  entryToNode,
  filterTree,
  formatSize,
  hasOfficialCHeaderPack,
  packToNode,
} from '../CHeaderManagerUtils'

const makeNode = (title: string, children?: CHeaderTreeNode[]): CHeaderTreeNode => ({
  key: title,
  title,
  packName: title,
  relativePath: '',
  isDir: !!children,
  isPack: true,
  kind: children ? 'directory' : 'file',
  sizeBytes: 0,
  depth: 1,
  children,
})

describe('CHeaderManagerUtils', () => {
  it('decodePreviewContent 支持 string / packed bytes / Uint8Array', () => {
    expect(decodePreviewContent('')).toBe('')
    expect(decodePreviewContent('stdio.h')).toBe('stdio.h')
    expect(decodePreviewContent(Uint8Array.from([104, 101, 108, 108, 111]))).toBe('hello')
    expect(decodePreviewContent({ data: Array.from(new TextEncoder().encode('packed')) })).toBe('packed')
    expect(decodePreviewContent(12)).toBe('12')
  })

  it('formatSize 按量级格式化，非法大小返回空串', () => {
    expect(formatSize(0)).toBe('')
    expect(formatSize(-1)).toBe('')
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(2048)).toBe('2.0 KB')
    expect(formatSize(2 * 1024 * 1024)).toBe('2.0 MB')
  })

  it('packToNode / entryToNode 按 kind 生成树节点', () => {
    expect(
      packToNode({
        Name: 'c-std-headers.zip',
        Kind: 'zip',
        SizeBytes: 10,
        ModifiedAt: 1,
      }),
    ).toMatchObject({
      key: 'pack:c-std-headers.zip',
      title: 'c-std-headers.zip',
      packName: 'c-std-headers.zip',
      isDir: true,
      isPack: true,
      isLeaf: false,
      depth: 1,
    })
    expect(
      packToNode({
        Name: 'stdio.h',
        Kind: 'file',
        SizeBytes: 8,
        ModifiedAt: 1,
      }),
    ).toMatchObject({
      packName: '',
      relativePath: 'stdio.h',
      isDir: false,
      isLeaf: true,
    })
    expect(
      entryToNode(
        'sdk',
        {
          Name: 'include',
          RelativePath: 'include',
          IsDir: true,
          SizeBytes: 0,
        },
        2,
      ),
    ).toMatchObject({
      key: 'entry:sdk:include',
      packName: 'sdk',
      isDir: true,
      kind: 'directory',
      depth: 2,
      isLeaf: false,
    })
  })

  it('filterTree 按标题过滤并保留命中子节点的父级', () => {
    const tree = [makeNode('sdk', [makeNode('stdio.h'), makeNode('math.h')]), makeNode('other.zip')]
    expect(filterTree(tree, '')).toEqual(tree)
    expect(filterTree(tree, 'stdio').map((item) => item.title)).toEqual(['sdk'])
    expect(filterTree(tree, 'stdio')[0].children?.map((item) => item.title)).toEqual(['stdio.h'])
    expect(filterTree(tree, 'other').map((item) => item.title)).toEqual(['other.zip'])
    expect(filterTree(tree, 'missing')).toEqual([])
  })

  it('hasOfficialCHeaderPack 仅识别官方包名', () => {
    expect(hasOfficialCHeaderPack([{ title: 'c-std-headers.zip' }])).toBe(true)
    expect(hasOfficialCHeaderPack([{ title: 'C-STD-HEADERS.ZIP' }])).toBe(true)
    expect(hasOfficialCHeaderPack([{ title: 'other.zip' }])).toBe(false)
  })
})
