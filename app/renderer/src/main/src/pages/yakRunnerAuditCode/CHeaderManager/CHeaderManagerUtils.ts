import type { CHeaderEntry, CHeaderPack, CHeaderTreeNode } from './CHeaderManagerType'

export const decodePreviewContent = (content: unknown): string => {
  if (!content) return ''
  if (typeof content === 'string') return content
  const packed = content as { type?: string; data?: number[] }
  if (packed?.data && Array.isArray(packed.data)) {
    return new TextDecoder().decode(Uint8Array.from(packed.data))
  }
  if (content instanceof Uint8Array) {
    return new TextDecoder().decode(content)
  }
  return String(content)
}

export const formatSize = (size: number) => {
  if (!size || size <= 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export const packToNode = (pack: CHeaderPack): CHeaderTreeNode => {
  const isDir = pack.Kind === 'directory' || pack.Kind === 'zip'
  return {
    key: `pack:${pack.Name}`,
    title: pack.Name,
    packName: pack.Kind === 'file' ? '' : pack.Name,
    relativePath: pack.Kind === 'file' ? pack.Name : '',
    isDir,
    isPack: true,
    kind: pack.Kind,
    sizeBytes: Number(pack.SizeBytes || 0),
    depth: 1,
    isLeaf: !isDir,
  }
}

export const entryToNode = (packName: string, entry: CHeaderEntry, depth: number): CHeaderTreeNode => {
  return {
    key: `entry:${packName}:${entry.RelativePath}`,
    title: entry.Name,
    packName,
    relativePath: entry.RelativePath,
    isDir: !!entry.IsDir,
    isPack: false,
    kind: entry.IsDir ? 'directory' : 'file',
    sizeBytes: Number(entry.SizeBytes || 0),
    depth,
    isLeaf: !entry.IsDir,
  }
}

export const filterTree = (nodes: CHeaderTreeNode[], keyword: string): CHeaderTreeNode[] => {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return nodes
  const walk = (list: CHeaderTreeNode[]): CHeaderTreeNode[] => {
    const out: CHeaderTreeNode[] = []
    list.forEach((node) => {
      const children = node.children ? walk(node.children) : undefined
      if (node.title.toLowerCase().includes(kw) || (children && children.length > 0)) {
        out.push({ ...node, children })
      }
    })
    return out
  }
  return walk(nodes)
}

export const hasOfficialCHeaderPack = (nodes: Pick<CHeaderTreeNode, 'title'>[]) =>
  nodes.some((item) => item.title.toLowerCase() === 'c-std-headers.zip')
