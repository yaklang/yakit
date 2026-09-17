export interface CHeaderPack {
  Name: string
  Kind: string
  SizeBytes: number
  ModifiedAt: number
}

export interface CHeaderEntry {
  Name: string
  RelativePath: string
  IsDir: boolean
  SizeBytes: number
}

export interface CHeaderTreeNode {
  key: string
  title: string
  packName: string
  relativePath: string
  isDir: boolean
  isPack: boolean
  kind: string
  sizeBytes: number
  depth: number
  isLeaf?: boolean
  children?: CHeaderTreeNode[]
}

export interface CHeaderManagerProps {}
