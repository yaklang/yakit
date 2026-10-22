import { useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { v4 as uuidv4 } from 'uuid'
import { yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import { FileTreeSearchType, type FileTreeSearchTypeValue } from './constants'
import {
  cancelGrpcSearchFileContent,
  FILE_SEARCH_UNSUPPORTED_ENGINE,
  grpcSearchFileContent,
  mergeFileSearchItems,
} from './utils'
import type { FileSearchFileItem } from './type'

const t = i18n.getFixedT(null, 'aiAgent')

export interface UseFileContentSearchOptions {
  /** 搜索根路径列表（展示 / hasSearchPath） */
  roots: { path: string }[]
  /**
   * Enter 搜索时解析根路径（优先于静态 roots）。
   * AI 侧异步范围时传入，避免用到切范围后尚未更新的旧/空 roots。
   */
  resolveRoots?: () => Promise<{ path: string }[]> | { path: string }[]
}

/**
 * @name 文件内容搜索（通用）
 * @description 按 roots / resolveRoots 调用 RequestYakURL op=search；仅手动触发；
 * Enter 时清理旧请求与结果，再按当前范围搜索
 */
export const useFileContentSearch = (options: UseFileContentSearchOptions) => {
  const { roots, resolveRoots } = options
  const [searchType, setSearchType] = useState<FileTreeSearchTypeValue>(FileTreeSearchType.Keyword)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState<FileSearchFileItem[]>([])
  const requestIdRef = useRef(0)
  const searchTokensRef = useRef<string[]>([])

  const rootsKey = useMemo(() => roots.map((item) => item.path).join('\0'), [roots])
  const hasSearchPath = useMemo(() => roots.some((item) => !!item.path?.trim()), [rootsKey])

  const cancelInFlight = useMemoizedFn(() => {
    const tokens = searchTokensRef.current
    searchTokensRef.current = []
    tokens.forEach((token) => {
      void cancelGrpcSearchFileContent(token)
    })
  })

  const onCancelSearch = useMemoizedFn(() => {
    if (!loading) return
    cancelInFlight()
    requestIdRef.current += 1
    setLoading(false)
  })

  const runSearchWithPaths = useMemoizedFn((text: string, paths: string[], requestId: number) => {
    if (paths.length === 0) {
      searchTokensRef.current = []
      setResults([])
      setSearched(true)
      setLoading(false)
      return
    }
    const tokens = paths.map(() => uuidv4())
    searchTokensRef.current = tokens
    setLoading(true)
    setSearched(true)
    Promise.allSettled(
      paths.map((path, index) =>
        grpcSearchFileContent({
          path,
          keyword: text,
          regex: searchType === FileTreeSearchType.Regexp,
          token: tokens[index],
        }),
      ),
    ).then((all) => {
      if (requestId !== requestIdRef.current) return
      searchTokensRef.current = []
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

  const onSearch = useMemoizedFn((value?: string) => {
    const text = (value ?? keyword).trim()
    // Enter：先清理旧请求与结果，再按当前范围搜
    cancelInFlight()
    const requestId = ++requestIdRef.current
    setResults([])

    if (!text) {
      setLoading(false)
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)

    const applyPaths = (list: { path: string }[]) => {
      if (requestId !== requestIdRef.current) return
      const paths = list.map((item) => item.path?.trim()).filter(Boolean) as string[]
      runSearchWithPaths(text, paths, requestId)
    }

    if (!resolveRoots) {
      applyPaths(roots)
      return
    }

    Promise.resolve(resolveRoots())
      .then(applyPaths)
      .catch((err) => {
        if (requestId !== requestIdRef.current) return
        searchTokensRef.current = []
        setLoading(false)
        setResults([])
        const message = err instanceof Error ? err.message : String(err ?? '')
        yakitNotify('error', `${t('FileTreeSearch.searchFailed')}: ${message}`)
      })
  })

  useEffect(() => {
    // 仅搜索类型变化时作废进行中请求；roots 异步刷新不再打断 Enter 解析中的搜索
    cancelInFlight()
    requestIdRef.current += 1
    setLoading(false)
  }, [searchType, cancelInFlight])

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
    onCancelSearch,
  }
}
