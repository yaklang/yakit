export interface Risk {
    Hash: string
    IP: string
    Url?: string
    Port?: string
    Host?: string

    Title: string
    TitleVerbose?: string
    RiskType: string
    RiskTypeVerbose?: string
    Parameter?: string
    Payload?: string
    Details?: string | Object

    FromYakScript?: string
    WaitingVerified?: boolean
    ReverseToken?: string

    Id: number
    CreatedAt: number
    UpdatedAt?: number

    Severity?: string

    Request?: Uint8Array
    Response?: Uint8Array
    RuntimeId?: string
}