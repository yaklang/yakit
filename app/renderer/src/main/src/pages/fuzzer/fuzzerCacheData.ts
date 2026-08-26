import { DefFuzzerTableMaxData } from '@/defaultConstants/HTTPFuzzerPage'
import { FuzzerRemoteGV } from '@/enums/fuzzer'
import type { KVPair } from '@/models/kv'
import type { WebFuzzerType } from '@/pages/fuzzer/WebFuzzerPage/WebFuzzerPageType'
import { getRemoteValue } from '@/utils/kv'
import { yakitFailed } from '@/utils/notification'

export type AdvancedConfigShowProps = Record<Exclude<WebFuzzerType, 'sequence' | 'concurrency'>, boolean>

export interface FuzzerCacheDataProps {
  proxy: string[]
  dnsServers: string[]
  etcHosts: KVPair[]
  advancedConfigShow: AdvancedConfigShowProps | null
  resNumlimit: number
  noSystemProxy: boolean
  disableUseConnPool: boolean
}

/** 获取 fuzzer 高级配置中的 proxy / dnsServers / etcHosts / resNumlimit 等缓存 */
export const getFuzzerCacheData: () => Promise<FuzzerCacheDataProps> = () => {
  return new Promise(async (resolve, rejects) => {
    try {
      const [
        proxyResult,
        dnsServersResult,
        etcHostsResult,
        advancedConfigShowResult,
        resNumlimitResult,
        noSystemProxyResult,
        disableUseConnPoolResult,
      ] = await Promise.allSettled([
        getRemoteValue(FuzzerRemoteGV.WEB_FUZZ_PROXY),
        getRemoteValue(FuzzerRemoteGV.WEB_FUZZ_DNS_Server_Config),
        getRemoteValue(FuzzerRemoteGV.WEB_FUZZ_DNS_Hosts_Config),
        getRemoteValue(FuzzerRemoteGV.WebFuzzerAdvancedConfigShow),
        getRemoteValue(FuzzerRemoteGV.FuzzerResMaxNumLimit),
        getRemoteValue(FuzzerRemoteGV.FuzzerNoSystemProxy),
        getRemoteValue(FuzzerRemoteGV.FuzzerDisableUseConnPool),
      ])

      const proxy = proxyResult.status === 'fulfilled' ? proxyResult.value : ''
      const dnsServers = dnsServersResult.status === 'fulfilled' ? dnsServersResult.value : ''
      const etcHosts = etcHostsResult.status === 'fulfilled' ? etcHostsResult.value : ''
      const advancedConfigShow = advancedConfigShowResult.status === 'fulfilled' ? advancedConfigShowResult.value : ''
      const resNumlimit = resNumlimitResult.status === 'fulfilled' ? resNumlimitResult.value : ''
      const noSystemProxy = noSystemProxyResult.status === 'fulfilled' ? noSystemProxyResult.value : ''
      const disableUseConnPool = disableUseConnPoolResult.status === 'fulfilled' ? disableUseConnPoolResult.value : ''

      const value: FuzzerCacheDataProps = {
        proxy: proxy ? proxy.split(',') : [],
        dnsServers: dnsServers ? JSON.parse(dnsServers) : [],
        etcHosts: etcHosts ? JSON.parse(etcHosts) : [],
        advancedConfigShow: advancedConfigShow ? JSON.parse(advancedConfigShow) : null,
        resNumlimit: resNumlimit ? JSON.parse(resNumlimit) : DefFuzzerTableMaxData,
        noSystemProxy: noSystemProxy === 'true',
        disableUseConnPool: disableUseConnPool === 'true',
      }
      resolve(value)
    } catch (error) {
      rejects(error)
      yakitFailed(error + '')
    }
  })
}
