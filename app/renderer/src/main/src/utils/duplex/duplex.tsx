import { info, yakitFailed } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import emiter from '../eventBus/eventBus'
import { Uint8ArrayToString } from '../str'
import { JSONParseLog } from '../tool'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineTrashSecondIcon } from '@/assets/icon/outline'
import { yakitDuplex, yakitStream } from '@/services/electronBridge'
import { setRemoteValue } from '../kv'
import { GlobalConfigRemoteGV } from '@/enums/globalConfig'

let id = randomString(40)
let duplexListeners: Array<() => void> = []

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
  info('Server Push Enabled Already')
  cleanupDuplexListeners()

  const offData = yakitStream.onData(id, (data: DuplexConnectionProps) => {
    try {
      const resultData: Buffer = data.Data
      const obj = JSONParseLog(Uint8ArrayToString(resultData), { page: 'duplex', fun: 'startupDuplexConn' })
      switch (data.MessageType) {
        // 当前引擎支持推送数据库更新(如若不支持则依然使用轮询请求)
        case 'global':
          serverPushStatus = true
          break
        // 通知QueryHTTPFlows轮询更新
        case 'httpflow':
          emiter.emit('onRefreshQueryHTTPFlows', JSON.stringify(obj))
          break
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
                <div style={{position: "relative"}}>
                  {`检测到写入数据慢，当前项目数据库偏大。可删除HTTPFlow History流量后点击顶部设置，来回收数据库空间。`}
                  <YakitButton
                    type="text"
                    danger
                    onClick={() => setOpenPerformanceTips(false)}
                    style={{position: "absolute", right: -5, bottom: -2, fontSize: 14}}
                  >
                    不在提醒
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
    console.log(error)
  })

  duplexListeners = [offData, offError]

  yakitDuplex.start({}, id).then(() => {
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
  yakitStream.cancel('DuplexConnection', id)
  cleanupDuplexListeners()
}
