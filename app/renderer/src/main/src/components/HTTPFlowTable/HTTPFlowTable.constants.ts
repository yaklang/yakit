import type { CSSProperties, ReactNode } from 'react'
import { PaginationSchema } from '@/pages/invoker/schema'
import { HTTPFlowsToOnlineRequest } from '@/utils/login'
import { YakQueryHTTPFlowRequest } from '@/utils/yakQueryHTTPFlow'
import { FiltersItemProps, SortProps } from '@/components/TableVirtualResize/TableVirtualResizeType'
import { HTTPHistorySourcePageType } from '@/components/HTTPHistory'
import { type OptionProps } from '@/components/YakitCombinationSearch/YakitCombinationSearchType'
import { YakParamProps } from '@/pages/plugins/pluginsType'
import type { DebouncedFunc } from 'lodash'
import type { HistoryPluginSearchType } from '@/utils/yakQueryHTTPFlow'
import type { MitmExtractAggregateFlowFilterRow } from '@/utils/yakQueryHTTPFlow'

export interface codecHistoryPluginProps {
  key: string
  label: string
  params: YakParamProps[]
  isAiPlugin: boolean
}

export interface HTTPHeaderItem {
  Header: string
  Value: string
}

export interface HTTPFlow {
  Id: number
  Method: string
  Path: string
  Hash: string
  IsHTTPS: boolean
  Url: string
  URL: string
  Request: Uint8Array
  Response: Uint8Array
  StatusCode: number
  BodyLength: number
  BodySizeVerbose?: string
  RequestLength?: number
  RequestSizeVerbose?: string
  ContentType: string
  SourceType: string
  RequestHeader: HTTPHeaderItem[]
  ResponseHeader: HTTPHeaderItem[]
  GetParamsTotal: number
  PostParamsTotal: number
  CookieParamsTotal: number
  CreatedAt: number
  UpdatedAt: number
  HostPort?: string
  IPAddress?: string
  HtmlTitle?: string
  PathSuffix?: string

  GetParams: FuzzableParams[]
  PostParams: FuzzableParams[]
  CookieParams: FuzzableParams[]

  Tags?: string

  IsPlaceholder?: boolean

  IsWebsocket?: boolean
  WebsocketHash?: string

  cellClassName?: string

  InvalidForUTF8Request?: boolean
  InvalidForUTF8Response?: boolean
  RawRequestBodyBase64?: string
  RawResponseBodyBase64?: string
  SafeHTTPRequest?: string

  Domains?: string[]
  RootDomains?: string[]
  JsonObjects?: string[]

  IsTooLargeResponse: boolean
  TooLargeResponseHeaderFile: string
  TooLargeResponseBodyFile: string
  IsTooLargeRequest: boolean
  TooLargeRequestHeaderFile: string
  TooLargeRequestBodyFile: string
  IsRequestOversize?: boolean
  DisableRenderStyles: boolean
  // 超大 multipart 请求的文件 part 列表（落盘 sidecar，manifest.json 派生）。
  // 非空时详情页渲染「下载 xxx 文件」下拉，GetHTTPFlowBodyById 带 PartIndex 下载单个文件。
  MultipartFiles?: MultipartFileInfo[]

  RequestString: string
  ResponseString: string

  HiddenIndex?: string

  FromPlugin: string
}

export interface FuzzableParams {
  Position: string
  ParamName: string
  OriginValue: Uint8Array
  AutoTemplate: Uint8Array
  IsHTTPS: boolean
}

export interface MultipartFileInfo {
  PartIndex: number
  FieldName: string
  Filename: string
  ContentType: string
  Size: number
}

export interface HistoryTableTitleShow {
  noTableTitle?: boolean
  showSourceType?: boolean
  showAdvancedSearch?: boolean
  showProtocolType?: boolean
  showHistorySearch?: boolean
  showColorSwatch?: boolean
  showBatchActions?: boolean
  showDelAll?: boolean
  showSetting?: boolean
  showRefresh?: boolean
  showHistoryAnalysisBtn?: boolean
  onHistoryAnalysisClick?: () => void
}

export interface HTTPFlowTableProp extends HistoryTableTitleShow {
  onSelected?: (i?: HTTPFlow) => any
  params?: YakQueryHTTPFlowRequest
  mitmAggregateFilterRows?: MitmExtractAggregateFlowFilterRow[]
  inViewport?: boolean
  onSearch?: (i: string) => any
  title?: string
  onlyShowFirstNode?: boolean
  setOnlyShowFirstNode?: (i: boolean) => void
  refresh?: boolean
  importRefresh?: boolean
  httpHistoryTableTitleStyle?: CSSProperties
  historyId?: string
  pageType?: HTTPHistorySourcePageType
  includeInUrl?: string[]
  onQueryParams?: (queryParams: string, execFlag: boolean) => void
  titleHeight?: number
  containerClassName?: string
  runTimeId?: string
  downstreamProxyStr?: string
  ProcessName?: string[]
  TagsFilter?: string[]
  filterTagDom?: ReactNode
  onSetTableTotal?: (t: number) => void
  onSetTableSelectNum?: (s: number) => void
  onSetHasNewData?: (f: boolean) => void
  onSetSelectedHttpFlowIds?: (ids: string[]) => void
  onRegisterTableSelectApi?: (api: { reset: () => void; deselectId: (id: string) => void }) => void
  defaultExcludeColumnsKey?: string[]
  builtinTagList?: FiltersItemProps[]
}

export interface YakQueryHTTPFlowResponse {
  Data: HTTPFlow[]
  Total: number
  Pagination: PaginationSchema
}

export interface HTTPFlowsToOnlineBatchRequest {
  ToOnlineWhere: HTTPFlowsToOnlineRequest
  UploadHTTPFlowsWhere: YakQueryHTTPFlowRequest
}

export interface HTTPFlowsToOnlineBatchResponse {
  SuccessCount: number
  FailedCount: number
}

export interface HTTPFlowsFieldGroupResponse {
  Tags: TagsCode[]
  StatusCode: TagsCode[]
  Suffixes: TagsCode[]
}

export interface TagsCode {
  Value: string
  Total: number
  Builtin?: boolean
}

export interface CompateData {
  content: string
  language: string
}

export interface ShieldData {
  data: (string | number)[]
}

export interface ExportHTTPFlowStreamRequest {
  Filter: YakQueryHTTPFlowRequest
  FieldName?: string[]
  ExportType: 'csv' | 'har'
  TargetPath: string
}

export interface ImportExportStreamResponse {
  ExportFilePath?: string
  Percent: number
  Verbose: string
}

export interface UpdateCacheData {
  id: number
  tags: string
}

export interface HistoryMenuData {
  key: string
  label: ReactNode
  keybindings?: string[]
  number?: number
  webSocket?: boolean
  default?: boolean
  all?: boolean
  children?: HistoryMenuData[]
  onClickSingle?: (flow: HTTPFlow) => void
  onClick?: (flow: HTTPFlow) => void
  onClickBatch?: (flows: HTTPFlow[], n?: number) => void
  params?: YakParamProps[]
  isAiPlugin?: boolean
}

export interface ColumnAllInfoItem {
  dataKey: string
  title: string
  isShow: boolean
}

export interface AdvancedSetSaveItem {
  backgroundRefresh: boolean
  dragSelectEnabled: boolean
  binaryDisplayEnabled: boolean
  configColumnsAll: ColumnAllInfoItem[]
}

export interface AdvancedSetProps {
  showBackgroundRefresh?: boolean
  dragSelectEnabled?: boolean
  binaryDisplayEnabled?: boolean
  columnsAllStr: string
  onCancel: () => void
  onSave: (setting: AdvancedSetSaveItem) => void
  defalutColumnsOrder: string[]
}

export interface HTTPFlowShieldProps {
  shieldData: ShieldData
  cancleFilter: (s: string | number) => void
  cancleAllFilter: (mitmVersion: string) => void
}

export interface ColorSearchProps {
  color: string[]
  setColor: (s: string[]) => void
  onReset: () => void
  onSure: () => void
  setIsShowColor: (b: boolean) => void
}

export interface RangeInputNumberProps {
  minNumber?: number
  setMinNumber?: (b: number) => void
  maxNumber?: number
  setMaxNumber?: (b: number) => void
  extra?: ReactNode
  onReset?: () => void
  onSure?: () => void
  showFooter?: boolean
  onChangeValued?: () => void
}

export interface RangeInputNumberTableWrapperProps extends RangeInputNumberProps {
  showSort?: boolean
  bodyLengthSort?: 'asc' | 'desc' | false
  onBodyLengthSort?: (s: 'asc' | 'desc') => void
  checkBodyLength: boolean
  onCheckThan0: DebouncedFunc<(check: boolean) => void>
}

export interface HistorySearchProps {
  searchVal?: string
  setSearchVal?: (s: string) => void
  showPopoverSearch: boolean
  handleSearch: (searchValue: string, searchType: HistoryPluginSearchType) => void
  addonBeforeOption?: OptionProps[]
  hint?: boolean
}

export interface EditTagsInfo {
  Id: number
  Hash: string
  Tags: string[]
}

export interface EditTagsModalProps {
  visible: boolean
  editTagsInfo?: EditTagsInfo
  onCancel: () => void
  onOk: (params: EditTagsInfo) => void
}

export type getContainerFunc = () => HTMLElement

export interface ImportExportProgressProps {
  visible: boolean
  onClose: (finish: boolean, streamData: ImportExportStreamResponse[]) => void
  getContainer?: string | HTMLElement | getContainerFunc | false
  title: string
  subTitle?: string
  token: string
  apiKey: string
}

export const HTTP_FLOW_FAVORITE_TAG = 'YAKIT_FAVORITE'

export const OFFSET_LIMIT = 30
export const OFFSET_STEP = 100
export const SHIELD_MAX_LIMIT = 5
/** 表格内存滑窗上限，超出后由 useVirtualTableHook */
export const HTTP_FLOW_TABLE_MAX_DATA_LENGTH = 1000

export const HTTP_FLOW_TABLE_SHIELD_DATA = 'HTTP_FLOW_TABLE_SHIELD_DATA'

export const defSort: SortProps = {
  order: 'desc',
  orderBy: 'id',
}

export const SourceType = [
  { text: (t) => 'MITM', value: 'mitm' },
  { text: (t) => t('HTTPFlowTable.plugin'), value: 'scan' },
  {
    text: (t) => t('HTTPFlowTable.crawler'),
    value: 'basic-crawler',
  },
]

export const contentType: FiltersItemProps[] = [
  { value: 'javascript', label: 'javascript' },
  { value: 'x-javascript', label: 'x-javascript' },
  { value: 'css', label: 'css' },
  { value: 'html', label: 'html' },
  { value: 'plain', label: 'plain' },
  { value: 'xml', label: 'xml' },
  { value: 'json', label: 'json' },
  { value: 'form-data', label: 'form-data' },
  { value: 'octet-stream', label: 'octet-stream' },
  { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
  { value: 'xhtml+xml', label: 'xhtml+xml' },
  { value: 'atom+xml', label: 'atom+xml' },
  { value: 'pdf', label: 'pdf' },
  { value: 'msword', label: 'msword' },
  { value: 'gif', label: 'gif' },
  { value: 'jpeg', label: 'jpeg' },
  { value: 'png', label: 'png' },
]
