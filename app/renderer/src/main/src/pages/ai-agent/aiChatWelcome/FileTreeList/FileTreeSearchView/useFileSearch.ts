import { useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useCustomFolder } from '../../../components/aiFileSystemList/store/useCustomFolder'
import { yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'
import {
  FileTreeSearchScope,
  FileTreeSearchType,
  type FileTreeSearchScopeValue,
  type FileTreeSearchTypeValue,
} from './constants'
import {
  FILE_SEARCH_UNSUPPORTED_ENGINE,
  grpcSearchFileContent,
  mergeFileSearchItems,
  resolveSearchPaths,
} from './utils'
import type { FileSearchFileItem } from './type'

const t = i18n.getFixedT(null, 'aiAgent')

/**
 * @name 文件树内容搜索
 * @description 按 scope 收集根路径后调用 RequestYakURL op=search 并发搜索，requestId 防竞态；
 * scope / 搜索类型变化时若已有搜索词则自动重搜
 */
export const useFileSearch = () => {
  const store = useCurrentStore()
  const grpcFolders = useStore(store, (state) => state.grpcFolders)
  const customFolder = useCustomFolder()

  const [searchType, setSearchType] = useState<FileTreeSearchTypeValue>(FileTreeSearchType.Keyword)
  const [scope, setScope] = useState<FileTreeSearchScopeValue>(FileTreeSearchScope.All)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState<FileSearchFileItem[]>([])
  const requestIdRef = useRef(0)

  const hasSearchPath = useMemo(
    () => resolveSearchPaths(scope, grpcFolders, customFolder).length > 0,
    [scope, grpcFolders, customFolder],
  )

  const onSearch = useMemoizedFn((value?: string) => {
    const text = (value ?? keyword).trim()
    if (!text) {
      setResults([])
      return
    }
    const paths = resolveSearchPaths(scope, grpcFolders, customFolder)
    if (paths.length === 0) {
      // 仍算已搜索，便于单范围空态展示「查询全部文件夹」
      setResults([])
      setSearched(true)
      setLoading(false)
      return
    }
    const requestId = ++requestIdRef.current
    setLoading(true)
    setSearched(true)
    Promise.allSettled(
      paths.map((item) =>
        grpcSearchFileContent({
          path: item.path,
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
      if (items.length === 0 && firstError) {
        const message =
          firstError === FILE_SEARCH_UNSUPPORTED_ENGINE
            ? t('FileTreeSearch.engineUnsupported')
            : `${t('FileTreeSearch.searchFailed')}: ${firstError}`
        yakitNotify('error', message)
      }
    })
  })

  useEffect(() => {
    if (!keyword.trim()) return
    onSearch()
  }, [scope, searchType, onSearch])

  return {
    keyword,
    setKeyword,
    searchType,
    setSearchType,
    scope,
    setScope,
    loading,
    searched,
    hasSearchPath,
    results,
    onSearch,
  }
}
