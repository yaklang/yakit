import { useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import { FileTreeSearchType, type FileTreeSearchTypeValue } from './constants'
import { FILE_SEARCH_UNSUPPORTED_ENGINE, grpcSearchFileContent, mergeFileSearchItems } from './utils'
import type { FileSearchFileItem } from './type'

const t = i18n.getFixedT(null, 'aiAgent')

export interface UseFileContentSearchOptions {
  /** 搜索根路径列表；引用抖动时用 path 拼接键判断变化 */
  roots: { path: string }[]
}

/**
 * @name 文件内容搜索（通用）
 * @description 按 roots 调用 RequestYakURL op=search 并发搜索，requestId 防竞态；
 * 根路径 / 搜索类型变化时若已有搜索词则自动重搜
 */
export const useFileContentSearch = (options: UseFileContentSearchOptions) => {
  const { roots } = options
  const [searchType, setSearchType] = useState<FileTreeSearchTypeValue>(FileTreeSearchType.Keyword)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState<FileSearchFileItem[]>([])
  const requestIdRef = useRef(0)

  const rootsKey = useMemo(() => roots.map((item) => item.path).join('\0'), [roots])
  const hasSearchPath = useMemo(() => roots.some((item) => !!item.path?.trim()), [rootsKey])

  const onSearch = useMemoizedFn((value?: string) => {
    const text = (value ?? keyword).trim()
    if (!text) {
      requestIdRef.current += 1
      setResults([])
      setLoading(false)
      setSearched(false)
      return
    }
    const paths = roots.map((item) => item.path?.trim()).filter(Boolean) as string[]
    if (paths.length === 0) {
      requestIdRef.current += 1
      setResults([])
      setSearched(true)
      setLoading(false)
      return
    }
    const requestId = ++requestIdRef.current
    setLoading(true)
    setSearched(true)
    Promise.allSettled(
      paths.map((path) =>
        grpcSearchFileContent({
          path,
          keyword: text,
          regex: searchType === FileTreeSearchType.Regexp,
        }),
      ),
    ).then((all) => {
      if (requestId !== requestIdRef.current) return
      setLoading(false)
      const items: FileSearchFileItem[] = []
      let firstError = ''
      all.forEach((settled) => {
        if (settled.status === 'fulfilled') items.push(...settled.value)
        else if (!firstError) {
          firstError = settled.reason instanceof Error ? settled.reason.message : String(settled.reason ?? '')
        }
      })
      setResults(mergeFileSearchItems(items))
      if (firstError) {
        const message =
          firstError === FILE_SEARCH_UNSUPPORTED_ENGINE
            ? t('FileTreeSearch.engineUnsupported')
            : `${t('FileTreeSearch.searchFailed')}: ${firstError}`
        yakitNotify('error', message)
      }
    })
  })

  useEffect(() => {
    // 根路径 / 类型变化时作废旧请求并清空。用 rootsKey 避免数组引用抖动死循环。
    requestIdRef.current += 1
    setResults([])
    setLoading(false)
    setSearched(false)
    if (!keyword.trim()) return
    onSearch()
  }, [rootsKey, searchType, onSearch])

  return {
    keyword,
    setKeyword,
    searchType,
    setSearchType,
    loading,
    searched,
    hasSearchPath,
    results,
    onSearch,
  }
}
