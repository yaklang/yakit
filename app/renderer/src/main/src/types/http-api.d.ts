/**
 * 此文件存放http接口相关的结构定义
 * 存放结构定义为swagger无法转换的定义
 */

/** http接口请求体里的分页定义 */
export interface HTTPRequestParameters {
    /** 页码 */
    page?: number
    /** 单页条数(不传默认 20) */
    limit?: number
    /** 排序字段(不传默认 created_at) */
    order_by?: string
    /** 排序顺序(不传默认 desc) */
    order?: "asc" | "desc"
}
