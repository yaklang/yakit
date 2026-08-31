export interface PacketHistory extends PacketOrigin, Omit<PacketPair, 'Request' | 'Response'> {
  Request?: Uint8Array
  Response?: Uint8Array
}

interface PacketOrigin {
  Id?: number
  Url?: string
}
interface PacketPair {
  HttpflowId?: number
  Url?: string
  Request?: string
  Response?: string
}
export interface Risk {
  Hash: string
  IP: string
  Url?: string
  Port?: string
  Host?: string

  Title: string
  TitleVerbose?: string
  Description?: string
  Solution?: string
  RiskType: string
  RiskTypeVerbose?: string
  Parameter?: string
  Payload?: string
  Details?: string | Object

  FromYakScript?: string
  YakScriptUUID?: string
  WaitingVerified?: boolean
  ReverseToken?: string

  Id: number
  CreatedAt: number
  UpdatedAt?: number

  Severity?: string

  Request?: Uint8Array
  Response?: Uint8Array
  RuntimeId?: string

  CVE?: string
  TaskName?: string
  Tags?: string
  IsRead?: boolean
  /**前端导出html使用 */
  RequestString?: string
  /**前端导出html使用 */
  ResponseString?: string
  /**前端使用:表格样式 */
  cellClassName?: string

  /** 代码扫描 */
  ResultID?: number
  SyntaxFlowVariable?: string
  ProgramName?: string

  // 关联的请求/响应报文对列表
  PacketPairs?: PacketPair[]

  /** CVSS 评分 0.0–10.0（前端/联调字段，protobuf 就绪后对齐） */
  Cvss?: number
  /** 验证人（已修复） */
  Verifier?: string
  /** 修复时间 unix 秒（已修复） */
  RepairTime?: number
  /** 修复建议（已修复） */
  RepairSuggestion?: string
  /** 处置说明（非已修复） */
  DisposalNote?: string
}
