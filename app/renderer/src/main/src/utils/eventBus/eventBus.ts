import mitt from 'mitt'
import type { MitmEventProps } from './events/mitm'
import type { WebFuzzerEventProps } from './events/webFuzzer'
import type { SimpleDetectEventProps } from './events/simpleDetect'
import type { EditorEventProps } from './events/editor'
import type { HistoryEventProps } from './events/history'
import type { PluginsEventProps } from './events/plugins'
import type { MainOperatorEventProps } from './events/main'
import type { PayLoadEventProps } from './events/payload'
import type { ProjectMagEventProps } from './events/projectMag'
import type { WebShellEventProps } from './events/webShell'
import type { RefreshDataEventProps } from './events/refreshData'
import type { UpdateYakitYaklangEventProps } from './events/updateYakitYaklang'
import type { GlobalEventProps } from './events/global'
import type { PluginBatchExecutorProps } from './events/pluginBatchExecutor'
import type { YakitRiskProps } from './events/yakitRisk'
import type { YakRunnerEventProps } from './events/yakRunner'
import type { YakRunnerAuditEventProps } from './events/yakRunnerAudit'
import type { YakRunnerCodeScanEventProps } from './events/yakRunnerCodeScan'
import type { yakJavaDecompilerEventProps } from './events/yakJavaDecompiler'
import type { NotepadEventProps } from './events/notepad'
import type { ShortcutKeyEventProps } from './events/shortcutKey'
import type { AIAgentEventProps } from './events/aiAgent'
import type { YakRunnerScanHistoryEventProps } from './events/yakRunnerScanHistory'
import type { AIReActEventProps } from './events/aiReAct'
import type { ReportPageEventProps } from './events/reportPage'
import type { YakKnowledgeRepositoryEventProps } from './events/aiRepository'
import type { MainWinOperatorEventProps } from './events/mainWin'
import type { RuleManagementEventProps } from './events/ruleManagement'
import type { YakRunnerAiCodeAuditEventProps } from './events/yakRunnerAiCodeAudit'
import type { ContextMenuEventProps } from './events/contextMenu'

type Contrast<T extends object, E extends object> = [keyof T & keyof E] extends [never] ? never : string
type OneToArr<T extends object, E extends object[]> = E extends [infer X extends object, ...infer Y extends object[]]
  ? [Contrast<T, X>] extends [never]
    ? OneToArr<T, Y>
    : string
  : number
type ArrContrast<E extends object[]> = E extends [infer X extends object, ...infer Y extends object[]]
  ? OneToArr<X, Y> extends number
    ? ArrContrast<Y>
    : string
  : number
type Exchange<T> = T extends number ? boolean : never
type Joins<T extends object[]> = T extends [infer H extends object, ...infer U extends object[]] ? H & Joins<U> : {}

/**
 * @name 事件总线的信号源定义
 * @description 事件信号的定义规则
 * - 各页面的事件信号定义变量命名: `${页面名(英文)}EventProps`
 *
 * - 页面内事件信号的发送值，如不附加值则建议TS定义为选填，
 *   首选类型建议为string(注: 复杂的类型可能导致各页面信号定义交叉类型时出现never类型)
 *
 * - 建议不要在map方法内的组件设置事件监听，如果需要设置，请自行解决如何区别不同页面同事件监听的问题
 */
type Events = [
  MitmEventProps,
  WebFuzzerEventProps,
  SimpleDetectEventProps,
  EditorEventProps,
  HistoryEventProps,
  PluginsEventProps,
  MainOperatorEventProps,
  PayLoadEventProps,
  ProjectMagEventProps,
  WebShellEventProps,
  RefreshDataEventProps,
  UpdateYakitYaklangEventProps,
  GlobalEventProps,
  PluginBatchExecutorProps,
  YakitRiskProps,
  YakRunnerEventProps,
  YakRunnerAuditEventProps,
  YakRunnerCodeScanEventProps,
  yakJavaDecompilerEventProps,
  NotepadEventProps,
  ShortcutKeyEventProps,
  AIAgentEventProps,
  YakRunnerScanHistoryEventProps,
  AIReActEventProps,
  ReportPageEventProps,
  YakKnowledgeRepositoryEventProps,
  MainWinOperatorEventProps,
  RuleManagementEventProps,
  YakRunnerAiCodeAuditEventProps,
  ContextMenuEventProps,
]

type CheckVal = Exchange<ArrContrast<Events>>
// !!! 该变量声明不能改动
// 如果编辑器(vscode)对该变量报错，则说明声明的信号有重名情况，请自行检查重名的位置
const checkVal: CheckVal = true

const emiter = mitt<Joins<Events>>()

export default emiter
