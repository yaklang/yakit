import { yakScriptsForUI } from '@/pages/invoker/grpcAdapters'
import { grpcPageForUI } from '@/utils/int64'
import { ipc } from '@/services/ipc'
import {
  genDefaultPagination,
  type QueryYakScriptRequest,
  type QueryYakScriptsResponse,
  type YakScript,
} from '../invoker/schema'
import { failed } from '../../utils/notification'

export const queryYakScriptList = (
  pluginType: string,
  onResult: (i: YakScript[], total?: number) => any,
  onFinally?: () => any,
  limit?: number,
  page?: number,
  keyword?: string,
  extraParam?: QueryYakScriptRequest,
  onFailed?: (e: any) => any,
  tag?: string[],
) => {
  if (limit !== undefined && limit <= 0) {
    limit = 200
  }

  ipc
    .invoke('grpc', 'QueryYakScript', {
      Type: pluginType,
      Tag: tag,
      ...(extraParam || {}),
      Keyword: keyword,
      Pagination: genDefaultPagination(limit, page),
    } as QueryYakScriptRequest)
    .then(yakScriptsForUI)
    .then(grpcPageForUI)
    .then((rsp) => {
      onResult(rsp.Data, rsp.Total)
    })
    .catch((e) => {
      failed(`Query Yak Plugin failed: ${e}`)
      if (onFailed) {
        onFailed(e)
      }
    })
    .finally(onFinally)
}
