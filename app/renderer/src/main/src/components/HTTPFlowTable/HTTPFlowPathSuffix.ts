import { FiltersItemProps } from '../TableVirtualResize/TableVirtualResizeType'

type TagsCodeLike = {
  Value?: string
  Total?: number
}

const PATH_SUFFIX_MODIFIER_SEPARATOR = /[!@]/
const VALID_PATH_SUFFIX_REGEXP = /^[a-zA-Z0-9]+$/

export const normalizeHTTPFlowPathSuffix = (value?: string) => {
  if (!value) return ''

  let normalized = value.trim()
  if (!normalized) return ''

  if (normalized.startsWith('.')) {
    normalized = normalized.slice(1)
  }
  normalized = normalized.split(PATH_SUFFIX_MODIFIER_SEPARATOR)[0] || ''

  if (!VALID_PATH_SUFFIX_REGEXP.test(normalized)) {
    return ''
  }
  return normalized
}

export const getHTTPFlowPathSuffixValue = (path: string, pathSuffix?: string) => {
  const normalizedPathSuffix = normalizeHTTPFlowPathSuffix(pathSuffix)
  if (normalizedPathSuffix) {
    return normalizedPathSuffix
  }

  const cleanPath = path.split('?')[0].replace(/\/+$/, '')
  const match = cleanPath.match(/\.([a-zA-Z0-9]+)(?:[!@][^/]*)?$/)
  return match?.[1] || ''
}

export const formatHTTPFlowPathSuffix = (path: string, pathSuffix?: string) => {
  return getHTTPFlowPathSuffixValue(path, pathSuffix) || '-'
}

export const buildHTTPFlowSuffixOptions = (suffixes: TagsCodeLike[]): FiltersItemProps[] => {
  const uniqueSuffixes = new Set<string>()

  return suffixes.reduce<FiltersItemProps[]>((acc, item) => {
    const normalized = normalizeHTTPFlowPathSuffix(item.Value)
    if (!normalized || uniqueSuffixes.has(normalized)) {
      return acc
    }

    uniqueSuffixes.add(normalized)
    acc.push({
      label: normalized,
      value: normalized,
    })
    return acc
  }, [])
}
