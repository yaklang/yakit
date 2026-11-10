import { useCreation, useDebounce, useInfiniteScroll, useUpdateEffect } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useKnowledgeBase } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { grpcGetAIToolList } from '../../../aiToolList/utils'
import { AIForgeListDefaultPagination } from '../../../defaultConstant'
import { grpcQueryAIForge } from '../../../grpc'
import type { MaterialCategory, MaterialOption } from '../type'

export const ALL_KNOWLEDGE_BASES = '@所有知识库'

const EMPTY_CATALOG: MaterialOption[] = []
type CatalogCategory = Exclude<MaterialCategory, 'focusMode'>

interface MaterialPage {
  list: MaterialOption[]
  page: number
  nextPage?: number
}

const loadRemotePage = async (
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
        forgeName: item.ForgeName,
        description: item.Description,
      })),
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
      description: item.Description,
    })),
    nextPage: page * pagination.Limit < result.Total ? page + 1 : undefined,
  }
}

export const useMaterialCatalog = (category: CatalogCategory, search: string, addedOnly: boolean) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const keyword = useDebounce(search.trim(), { wait: 200 })
  const isKnowledgeBase = category === 'knowledgeBase'
  const searchLocally = isKnowledgeBase || addedOnly
  const knowledgeBases = useKnowledgeBase((state) => (isKnowledgeBase ? state.knowledgeBases : undefined))
  const allLabel = isKnowledgeBase ? t('AIMentionTabs.allKnowledgeBase') : ''
  const knowledgeOptions = useCreation<MaterialOption[]>(() => {
    if (!knowledgeBases) return EMPTY_CATALOG
    return [
      { id: ALL_KNOWLEDGE_BASES, name: allLabel },
      ...knowledgeBases.map((item) => ({
        id: String(item.ID),
        name: item.KnowledgeBaseName,
        description: item.KnowledgeBaseDescription || item.Description,
      })),
    ]
  }, [knowledgeBases, allLabel])

  const { data, loading, loadingMore, loadMore, noMore, reload } = useInfiniteScroll<MaterialPage>(
    (previous) =>
      category === 'knowledgeBase'
        ? Promise.resolve({ list: knowledgeOptions, page: 1 })
        : loadRemotePage(category, keyword, previous?.nextPage ?? 1),
    { manual: isKnowledgeBase, isNoMore: (page) => page?.nextPage === undefined },
  )

  useUpdateEffect(() => {
    if (!searchLocally) reload()
  }, [keyword, addedOnly])

  return {
    catalog: isKnowledgeBase ? knowledgeOptions : (data?.list ?? EMPTY_CATALOG),
    searchLocally,
    keyword,
    page: data?.page ?? 1,
    loading: !searchLocally && loading,
    loadingMore: !searchLocally && loadingMore,
    hasMore: !searchLocally && !noMore,
    loadMore,
  }
}
