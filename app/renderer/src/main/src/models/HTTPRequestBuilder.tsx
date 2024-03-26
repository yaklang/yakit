import {KVPair} from "@/models/kv"

export interface HTTPRequestBuilderParams {
    IsHttps: boolean

    IsRawHTTPRequest: boolean
    RawHTTPRequest: Uint8Array

    Method: string
    Input?: string

    Path: string[]
    GetParams: KVPair[]
    Headers: KVPair[]
    Cookie: KVPair[]

    Body: Uint8Array
    PostParams: KVPair[]
    MultipartParams: KVPair[]
    MultipartFileParams: KVPair[]

    IsHttpFlowId: boolean
    HTTPFlowId: number[]
}
