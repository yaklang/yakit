export interface ShareDataProps {
    module: string // 新建tab类型
    getShareContent: (callback: any) => void
}

export interface HTTPFlowsShareRequest{
    Ids:string[]
    LimitNum?:number
    ExpiredTime:number
    Pwd:boolean
    ShareId?:string
    Token:string
    Module:string
}

export interface HTTPFlowsShareResponse{
    ShareId:string
    ExtractCode:string
}