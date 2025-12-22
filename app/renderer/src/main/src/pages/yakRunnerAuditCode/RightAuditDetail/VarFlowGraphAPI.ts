/**
 * VarFlowGraph API 接口
 * 用于获取 SyntaxFlow 分析结果的变量流动图
 */

import {VarFlowGraph} from "./VarFlowGraphType"
import {RequestYakURLResponse, YakURLResource} from "@/pages/yakURLTree/data"

const {ipcRenderer} = window.require("electron")

/**
 * 获取完整的 VarFlowGraph 数据（包含所有节点、边、步骤和证据树）
 * @param programId 程序标识符
 * @param resultId SyntaxFlow 分析结果 ID
 * @returns VarFlowGraph 数据或 null
 */
export const fetchVarFlowGraph = async (
    programId: string,
    resultId: string
): Promise<VarFlowGraph | null> => {
    try {
        const params = {
            Method: "GET",
            Url: {
                Schema: "syntaxflow",
                Location: programId,
                Path: "/graph",
                Query: [
                    {
                        Key: "result_id",
                        Value: resultId
                    }
                ]
            }
        }

        const response: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)

        if (!response || !response.Resources || response.Resources.length === 0) {
            return null
        }

        // 查找 var_flow_graph 资源
        const varFlowGraphResource = response.Resources.find(
            (resource) => resource.ResourceType === "var_flow_graph"
        )

        if (!varFlowGraphResource) {
            return null
        }

        // 从 Extra 字段中提取 var_flow_graph JSON 数据
        const varFlowGraphExtra = varFlowGraphResource.Extra.find((item) => item.Key === "var_flow_graph")

        if (!varFlowGraphExtra || !varFlowGraphExtra.Value) {
            return null
        }

        // 解析 JSON 数据 - 现在包含完整的步骤详情和证据树
        const varFlowGraph: VarFlowGraph = JSON.parse(varFlowGraphExtra.Value)
        return varFlowGraph
    } catch (error) {
        console.error("Failed to fetch VarFlowGraph:", error)
        return null
    }
}

/**
 * 获取变量的值列表（点击节点）
 * @param programId 程序标识符
 * @param resultId SyntaxFlow 分析结果 ID
 * @param variable 变量名
 * @param page 页码
 * @param pageSize 每页数量
 * @returns 变量值列表
 */
export const fetchVariableValues = async (
    programId: string,
    resultId: string,
    variable: string,
    page: number = 1,
    pageSize: number = 20
): Promise<RequestYakURLResponse | null> => {
    try {
        const params = {
            Method: "GET",
            Url: {
                Schema: "syntaxflow",
                Location: programId,
                Path: `/${variable}`,
                Query: [
                    {
                        Key: "result_id",
                        Value: resultId
                    }
                ]
            },
            Page: page,
            PageSize: pageSize
        }

        const response: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
        return response
    } catch (error) {
        console.error("Failed to fetch variable values:", error)
        return null
    }
}

/**
 * ⚠️ 已废弃：边步骤和步骤详情现在已包含在 fetchVarFlowGraph 返回的完整图中
 * 不再需要额外的 API 请求来获取边步骤和步骤详情
 * 
 * 迁移指南：
 * - 边的步骤：通过 edge.step_ids 在 graph.steps 中查找
 * - 步骤详情：直接从 graph.steps 中读取，包含完整的 evidence_tree
 */

/**
 * 获取单个值的数据流图
 * @param programId 程序标识符
 * @param resultId SyntaxFlow 分析结果 ID
 * @param variable 变量名
 * @param index 值的索引
 * @returns 数据流图数据
 */
export const fetchValueDataFlowGraph = async (
    programId: string,
    resultId: string,
    variable: string,
    index: number
): Promise<RequestYakURLResponse | null> => {
    try {
        const params = {
            Method: "GET",
            Url: {
                Schema: "syntaxflow",
                Location: programId,
                Path: `/${variable}/${index}`,
                Query: [
                    {
                        Key: "result_id",
                        Value: resultId
                    }
                ]
            }
        }

        const response: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
        return response
    } catch (error) {
        console.error("Failed to fetch value data flow graph:", error)
        return null
    }
}

