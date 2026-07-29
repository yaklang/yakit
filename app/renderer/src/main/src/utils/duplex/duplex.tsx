import { info, yakitFailed, yakitNotify } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import emiter from '../eventBus/eventBus'
import { Uint8ArrayToString } from '../str'
import { JSONParseLog } from '../tool'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineTrashSecondIcon } from '@/assets/icon/outline'
import { yakitDuplex, yakitStream } from '@/services/electronBridge'
import { setRemoteValue } from '../kv'
import { GlobalConfigRemoteGV } from '@/enums/globalConfig'
import i18n from '@/i18n/i18n'
import { setClipboardText } from '../clipboard'
import {
  mitmFlowObservability,
  type MITMFlowCommittedMode,
} from '@/components/HTTPFlowTable/HTTPFlowTable.observability'
import { createMITMFlowCommittedRefreshScheduler } from '@/components/HTTPFlowTable/HTTPFlowTable.committed'

const tOriginal = i18n.getFixedT(null, 'utils')
let id = randomString(40)
let duplexListeners: Array<() => void> = []
let duplexStarted = false
let flowCommittedMode: MITMFlowCommittedMode = 'shadow'
const flowCommittedRefreshScheduler = createMITMFlowCommittedRefreshScheduler()

const FLOW_COMMITTED_MESSAGE_TYPE = 'httpflow/committed'
const FLOW_COMMITTED_SUBSCRIBE_MESSAGE_TYPE = 'httpflow/committed/subscribe'
const FLOW_COMMITTED_UNSUBSCRIBE_MESSAGE_TYPE = 'httpflow/committed/unsubscribe'

const flowCommittedSubscriptionRequest = (mode: MITMFlowCommittedMode): DuplexConnectionRequest => ({
  MessageType: mode === 'off' ? FLOW_COMMITTED_UNSUBSCRIBE_MESSAGE_TYPE : FLOW_COMMITTED_SUBSCRIBE_MESSAGE_TYPE,
  Timestamp: Date.now(),
})

export const setFlowCommittedMode = async (mode: MITMFlowCommittedMode) => {
  if (!['off', 'shadow', 'canary'].includes(mode)) throw new Error(`Unsupported FlowCommitted mode: ${mode}`)
  flowCommittedMode = mode
  flowCommittedRefreshScheduler.cancel()
  mitmFlowObservability.setFlowCommittedMode(mode)
  if (!duplexStarted) return
  await yakitDuplex.write(flowCommittedSubscriptionRequest(mode), id)
}

export const getFlowCommittedMode = () => flowCommittedMode

export const setFlowCommittedShadowEnabled = async (enabled: boolean) => {
  await setFlowCommittedMode(enabled ? 'shadow' : 'off')
}

export const isFlowCommittedShadowEnabled = () => flowCommittedMode !== 'off'

const cleanupDuplexListeners = () => {
  duplexListeners.forEach((off) => off())
  duplexListeners = []
}

export interface FileMonitorItemProps {
  // 是否为文件夹
  IsDir: boolean
  // 操作 createTemp、rename、renameFront、renameRollback、markReadOnly为前端定义
  Op: 'delete' | 'create' | 'createTemp' | 'renameFront' | 'rename' | 'renameRollback' | 'markReadOnly'
  // 路径
  Path: string
  // 重命名用
  NewPath?: string
}

export interface FileMonitorProps {
  Id: string
  ChangeEvents: FileMonitorItemProps[]
  CreateEvents: FileMonitorItemProps[]
  DeleteEvents: FileMonitorItemProps[]
}

/**@name 推送是否开启 */
export let serverPushStatus = false
type ServerPushStatusListener = (active: boolean) => void
const serverPushStatusListeners = new Set<ServerPushStatusListener>()

const updateServerPushStatus = (active: boolean) => {
  if (serverPushStatus === active) return
  serverPushStatus = active
  serverPushStatusListeners.forEach((listener) => listener(active))
}

export const subscribeServerPushStatus = (listener: ServerPushStatusListener) => {
  serverPushStatusListeners.add(listener)
  return () => {
    serverPushStatusListeners.delete(listener)
  }
}

interface ConcurrentLoadItem {
  number: number
  time: number
}
export interface ConcurrentLoad {
  rps: ConcurrentLoadItem[]
  cps: ConcurrentLoadItem[]
}
export let concurrentLoad: ConcurrentLoad = {
  rps: [],
  cps: [],
}

interface DuplexConnectionResponseProps {
  Data: Buffer
  MessageType: string
  /** proto-loader is configured with longs: String for inbound int64 values. */
  Timestamp: number | string
}
export const updateConcurrentLoad = (key: keyof ConcurrentLoad, value: ConcurrentLoadItem[]) => {
  concurrentLoad = {
    ...concurrentLoad,
    [key]: value,
  }
}

function handleConcurrentLoadData(key: keyof ConcurrentLoad, number: number) {
  const curTime = Math.floor(Date.now() / 1000)
  const arr = concurrentLoad[key].slice()
  arr.push({ number, time: curTime })
  const trimmedData = arr.filter((point) => curTime - point.time < 300) // 最近5分钟数据
  updateConcurrentLoad(key, trimmedData)
  if (key === 'rps') {
    emiter.emit('onRefreshRps')
    emiter.emit('onRefreshCurRps', number)
  } else {
    emiter.emit('onRefreshCps')
  }
}

let openPerformanceTips = true
export const setOpenPerformanceTips = (value: boolean) => {
  openPerformanceTips = value
  setRemoteValue(GlobalConfigRemoteGV.PerformanceTips, !value + '')
}

export const startupDuplexConn = () => {
  updateServerPushStatus(false)
  cleanupDuplexListeners()
  yakitStream.cancel('DuplexConnection', id)

  const offData = yakitStream.onData(id, (data: DuplexConnectionResponseProps) => {
    // Receiving any frame proves that the duplex transport is live, including
    // compatibility engines whose first observable frame is not `global`.
    updateServerPushStatus(true)
    try {
      const resultData: Buffer = data.Data
      const obj = JSONParseLog(Uint8ArrayToString(resultData), { page: 'duplex', fun: 'startupDuplexConn' })
      switch (data.MessageType) {
        // 当前引擎支持推送数据库更新(如若不支持则依然使用轮询请求)
        case 'global':
          updateServerPushStatus(true)
          break
        // 通知QueryHTTPFlows轮询更新
        case 'httpflow': {
          const serverSentAtUnixMs = mitmFlowObservability.recordDuplexNotification(data.Timestamp, {
            recordLiveTrigger: false,
          })
          emiter.emit(
            'onRefreshQueryHTTPFlows',
            JSON.stringify({
              __yakitHTTPFlowRefreshEnvelope: 1,
              serverSentAtUnixMs,
              payload: obj,
            }),
          )
          break
        }
        // Shadow always reconciles against QueryHTTPFlows. Canary additionally
        // emits a bounded wake-up; it never writes rows from the event itself.
        case FLOW_COMMITTED_MESSAGE_TYPE: {
          const signal = mitmFlowObservability.recordHTTPFlowCommitted(obj, data.Timestamp)
          if (signal && flowCommittedMode === 'canary') {
            flowCommittedRefreshScheduler.request(() => {
              emiter.emit('onMITMFlowCommitted', JSON.stringify(signal))
            })
          }
          break
        }
        // 通知QueryYakScript轮询更新
        case 'yakscript':
          emiter.emit('onRefreshQueryYakScript')
          break
        // 通知QueryNewRisk轮询更新
        case 'risk':
          emiter.emit('onRefreshQueryNewRisk')
          break
        // 文件树结构监控
        case 'file_monitor':
          const event: FileMonitorProps = obj
          emiter.emit('onRefreshYakRunnerFileTree', JSON.stringify(event))
          break
        // 代码扫描-审计结果表
        case 'syntaxflow_result':
          emiter.emit('onRefreshCodeScanResult', JSON.stringify(obj))
          break
        // fuzzer-批量请求中的丢弃包数量
        case 'fuzzer_server_push':
          emiter.emit('onGetDiscardPackageCount', JSON.stringify(obj))
          break
        // OpenAPI / API 文档解析进度
        case 'openapi_parse':
          emiter.emit('onOpenAPIParseProgress', JSON.stringify(obj))
          break
        // MCP / 后端通知前端新建 Web Fuzzer Tab
        case 'web_fuzzer_tab':
          emiter.emit('onServerPushOpenWebFuzzerTab', JSON.stringify(obj))
          break
        // MCP / 后端通知前端刷新项目列表或进入新建项目
        case 'project':
          emiter.emit('onServerPushProjectChanged', JSON.stringify(obj))
          break
        // 通知QuerySSARisks轮询更新
        case 'ssa_risk':
          emiter.emit('onRefreshQuerySSARisks', JSON.stringify(obj))
          break
        // 通知QueryAIMemoryEntity轮询更新
        case 'ai_memory':
          emiter.emit('onRefreshQueryAIMemoryEntity', JSON.stringify(obj))
          break
        // rps
        case 'rps':
          handleConcurrentLoadData('rps', obj)
          break
        case 'cps':
          handleConcurrentLoadData('cps', obj)
          break
        case 'knowledge_base_entry':
          emiter.emit('onKnowledgeBaseEntry', JSON.stringify(obj))
          break
        case 'vector_store_document':
          emiter.emit('onVectorStoreDocument', JSON.stringify(obj))
          break
        case 'er_model_relationship':
          emiter.emit('onErModelRelationship', JSON.stringify(obj))
          break
        case 'httpflow_slow_insert_sql':
        case 'httpflow_slow_query_sql':
          if (openPerformanceTips) {
            yakitFailed({
              message: (
                <div>
                  {tOriginal('Duplex.databaseTooLarge')}
                  <YakitButton
                    type="text"
                    onClick={() => {
                      setClipboardText(JSON.stringify(obj))
                    }}
                    style={{
                      position: 'relative',
                      right: i18n.language.startsWith('zh') ? -110 : -140,
                      bottom: -2,
                      fontSize: 14,
                    }}
                  >
                    复制报错信息
                  </YakitButton>
                  <YakitButton
                    type="text"
                    danger
                    onClick={() => {
                      setOpenPerformanceTips(false)
                      yakitNotify('success', '已关闭数据写入慢提示')
                    }}
                    style={{
                      position: 'relative',
                      right: i18n.language.startsWith('zh') ? -100 : -140,
                      bottom: -2,
                      fontSize: 14,
                    }}
                  >
                    不再提醒
                  </YakitButton>
                </div>
              ),
            })
          }
          break
        case 'mitm_slow_rule_hook':
          emiter.emit('onMitmRuleMoreLimt')
          break
      }
    } catch (error) {}
  })
  const offError = yakitStream.onError(id, (error) => {
    updateServerPushStatus(false)
    console.log(error)
  })

  duplexListeners = [offData, offError]

  duplexStarted = false
  flowCommittedRefreshScheduler.cancel()
  mitmFlowObservability.setFlowCommittedMode(flowCommittedMode)
  yakitDuplex.start(flowCommittedSubscriptionRequest(flowCommittedMode), id).then(() => {
    duplexStarted = true
    info('Server Push Enabled')
  })
}

export interface DuplexConnectionProps {
  Data: Buffer
  MessageType: string
  Timestamp: number
}

export const sendDuplexConn = (params: DuplexConnectionProps) => {
  yakitDuplex.write(params, id)
}

export const closeDuplexConn = () => {
  duplexStarted = false
  flowCommittedRefreshScheduler.cancel()
  updateServerPushStatus(false)
  yakitStream.cancel('DuplexConnection', id)
  cleanupDuplexListeners()
}

declare global {
  interface Window {
    __YAKIT_MITM_FLOW_SHADOW__?: {
      setEnabled: (enabled: boolean) => Promise<void>
      isEnabled: () => boolean
      setMode: (mode: MITMFlowCommittedMode) => Promise<void>
      getMode: () => MITMFlowCommittedMode
    }
  }
}

if (typeof window !== 'undefined') {
  window.__YAKIT_MITM_FLOW_SHADOW__ = {
    setEnabled: setFlowCommittedShadowEnabled,
    isEnabled: isFlowCommittedShadowEnabled,
    setMode: setFlowCommittedMode,
    getMode: getFlowCommittedMode,
  }
}
