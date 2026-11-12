import { useEffect } from 'react'
import { useCreation, useDebounce, useInfiniteScroll } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useKnowledgeBase } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import type { KnowledgeBaseItem } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { getToolDisplayName } from '../../../aiToolList/toolDisplayName'
import { grpcGetAIToolList } from '../../../aiToolList/utils'
import { AIForgeListDefaultPagination } from '../../../defaultConstant'
import { grpcQueryAIForge } from '../../../grpc'
import type { ResourceFilterValue } from '../../../resourceFilter'
import type { MaterialCategory, MaterialOption } from '../type'

export const ALL_KNOWLEDGE_BASES = '@所有知识库'

const EMPTY_CATALOG: MaterialOption[] = []
type CatalogCategory = Exclude<MaterialCategory, 'focusMode'>

const toKnowledgeOption = (item: KnowledgeBaseItem, knowledgeIndex: number): MaterialOption => ({
  id: String(item.ID),
  name: item.KnowledgeBaseName,
  description: item.KnowledgeBaseDescription || item.Description,
  knowledgeIndex,
})

interface MaterialPage {
  list: MaterialOption[]
  page: number
  total: number
  nextPage?: number
}

const loadMaterialCatalogPage = async (
  category: Exclude<CatalogCategory, 'knowledgeBase'>,
  keyword: string,
  page: number,
): Promise<MaterialPage> => {
  if (category === 'forge') {
    const pagination = { ...AIForgeListDefaultPagination, Page: page }
    const result = await grpcQueryAIForge({ Pagination: pagination, Filter: { Keyword: keyword } })
    return {
      page,
      list: (result.Data ?? []).map((item) => ({
        id: String(item.Id),
        name: item.ForgeVerboseName || item.ForgeName,
        originalName: item.ForgeName,
        description: item.Description,
      })),
      total: Number(result.Total),
      nextPage: page * pagination.Limit < result.Total ? page + 1 : undefined,
    }
  }

  const pagination = { ...genDefaultPagination(20), OrderBy: 'created_at', Page: page }
  const result = await grpcGetAIToolList({
    Query: keyword,
    ToolName: '',
    OnlyFavorites: false,
    Pagination: pagination,
  })
  return {
    page,
    list: (result.Tools ?? []).map((item) => ({
      id: String(item.ID),
      name: item.VerboseName || item.Name,
      originalName: item.Name,
      verboseNameI18n: item.VerboseNameI18n,
      description: item.Description,
    })),
    total: Number(result.Total),
    nextPage: page * pagination.Limit < result.Total ? page + 1 : undefined,
  }
}

export const useMaterialCatalog = (category: CatalogCategory, search: string, filterValue: ResourceFilterValue) => {
  const { t, i18n } = useI18nNamespaces(['aiAgent'])
  const keyword = useDebounce(search.trim(), { wait: 200 })
  const isKnowledgeBase = category === 'knowledgeBase'
  const searchLocally = isKnowledgeBase || filterValue === 'added'
  const knowledgeBases = useKnowledgeBase((state) => (isKnowledgeBase ? state.knowledgeBases : undefined))
  const searchKnowledgeBases = useKnowledgeBase((state) => state.searchKnowledgeBases)
  const allLabel = isKnowledgeBase ? t('AIMentionTabs.allKnowledgeBase') : ''
  const knowledgeOptions = useCreation(() => (knowledgeBases ?? []).map(toKnowledgeOption), [knowledgeBases])
  const allKnowledgeOption = useCreation<MaterialOption>(
    () => ({ id: ALL_KNOWLEDGE_BASES, name: allLabel }),
    [allLabel],
  )
  const searchKnowledgeOptions = (query: string) => [
    allKnowledgeOption,
    ...searchKnowledgeBases(query).map(({ item, index }) => toKnowledgeOption(item, index)),
  ]

  const { data, loading, loadingMore, loadMore, noMore, reload, cancel } = useInfiniteScroll<MaterialPage>(
    (previous) =>
      category === 'knowledgeBase'
        ? Promise.resolve({ list: knowledgeOptions, page: 1, total: knowledgeOptions.length })
        : loadMaterialCatalogPage(category, keyword, previous?.nextPage ?? 1),
    { manual: true, isNoMore: (page) => page?.nextPage === undefined },
  )

  useEffect(() => {
    if (searchLocally) cancel()
    else reload()
  }, [keyword, searchLocally, cancel, reload])

  const remoteCatalog = data?.list ?? EMPTY_CATALOG
  const options = isKnowledgeBase ? knowledgeOptions : remoteCatalog
  const toolLanguage = category === 'tool' ? i18n.language : undefined
  const catalog = useCreation(() => {
    if (isKnowledgeBase) return [allKnowledgeOption, ...options]
    if (!toolLanguage) return options
    return options.map((item) => ({
      ...item,
      name: getToolDisplayName(item.verboseNameI18n, toolLanguage, item.name),
    }))
  }, [isKnowledgeBase, allKnowledgeOption, options, toolLanguage])

  return {
    catalog,
    searchKnowledgeOptions,
    total: data?.total ?? 0,
    searchLocally,
    keyword,
    page: data?.page ?? 1,
    loading: !searchLocally && loading,
    loadingMore: !searchLocally && loadingMore,
    hasMore: !searchLocally && !noMore,
    loadMore,
  }
}
