import { syntaxFlowResultsForUI } from '@/pages/yakRunnerCodeScan/grpcAdapters'
import { grpcPageForUI } from '@/utils/int64'
import { ipc } from '@/services/ipc'
import { yakitNotify } from '@/utils/notification'
import type {
  DeleteSyntaxFlowResultRequest,
  DeleteSyntaxFlowResultResponse,
  QuerySyntaxFlowResultRequest,
  QuerySyntaxFlowResultResponse,
} from './YakRunnerCodeScanType'
import type { APIOptionalFunc } from '@/apiUtils/type'
import type { QuerySyntaxFlowRuleRequest, SyntaxFlowRuleFilter } from '../ruleManagement/RuleManagementType'
import { grpcFetchLocalRuleList } from '../ruleManagement/api'

export type CodeScanComplianceMode = 'include' | 'exclude'

/** 获取审计结果 */
export const apiFetchQuerySyntaxFlowResult: (
  params: QuerySyntaxFlowResultRequest,
) => Promise<QuerySyntaxFlowResultResponse> = (params) => {
  return new Promise((resolve, reject) => {
    const queryParams: QuerySyntaxFlowResultRequest = {
      ...params,
    }
    ipc
      .invoke('grpc', 'QuerySyntaxFlowResult', queryParams)
      .then(syntaxFlowResultsForUI)
      .then(grpcPageForUI)
      .then((res) => {
        resolve(res)
      })
      .catch((e) => {
        reject(e)
        yakitNotify('error', '获取审计结果：' + e)
      })
  })
}

/** 删除审计结果 */
export const apiDeleteQuerySyntaxFlowResult: APIOptionalFunc<
  DeleteSyntaxFlowResultRequest,
  DeleteSyntaxFlowResultResponse
> = (params) => {
  return new Promise((resolve, reject) => {
    const queryParams: DeleteSyntaxFlowResultRequest = {
      ...params,
    }
    ipc
      .invoke('grpc', 'DeleteSyntaxFlowResult', queryParams)
      .then((res) => {
        resolve(res)
      })
      .catch((e) => {
        reject(e)
        yakitNotify('error', '删除审计结果：' + e)
      })
  })
}

// 获取选中分组下规则总数
export const getGroupNamesTotal = (
  // GroupNames: string[],
  Filter: SyntaxFlowRuleFilter,
) => {
  return new Promise<number>(async (resolve, reject) => {
    try {
      const { GroupNames } = Filter
      if (!GroupNames || GroupNames.length === 0) {
        resolve(0)
        return
      }
      const query: QuerySyntaxFlowRuleRequest = {
        Filter: {
          RuleNames: [],
          Language: [],
          GroupNames: [],
          Severity: [],
          Purpose: [],
          Tag: [],
          Keyword: '',
          FilterLibRuleKind: '',
          ...Filter,
        },
        Pagination: {
          Limit: 10,
          Page: 1,
          OrderBy: 'updated_at',
          Order: 'desc',
        },
      }
      const res = await grpcFetchLocalRuleList(query)
      resolve(parseInt(res.Total + ''))
    } catch (error) {
      reject(error)
    }
  })
}
