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
}
