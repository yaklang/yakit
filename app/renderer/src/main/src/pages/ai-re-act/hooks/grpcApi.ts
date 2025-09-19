export declare namespace AIAgentGrpcApi {
    /** 上传/下载 Token 量 */
    export interface Consumption {
        input_consumption: number
        output_consumption: number
        consumption_uuid: string
    }

    /** 上下文压力 */
    export interface Pressure {
        current_cost_token_size: number
        pressure_token_size: number
        timestamp: number
    }

    /**  (首字符响应|总对话)耗时 */
    export interface AICostMS {
        ms: number
        second: number
        timestamp: number
    }
}
