import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'

// QueryRisks 的 gRPC Risk 不包含验证人，编辑时从既有线上风险接口补齐。
export const apiGetRiskVerifierUid = async (hash: string): Promise<string | undefined> => {
  const response = await NetWorkApi<Partial<API.GetRiskRequest>, API.RiskUploadResponse>({
    method: 'post',
    url: 'risk',
    params: { page: 1, limit: 1 },
    data: { hash: [hash] },
  })
  return response.data?.find((risk) => risk.hash === hash || risk.risk_hash === hash)?.verifierUid
}
