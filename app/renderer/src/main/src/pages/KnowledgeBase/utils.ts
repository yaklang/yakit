import {grpcFetchLocalPluginDetail} from "../pluginHub/utils/grpc"
import {defPluginExecuteFormValue} from "../plugins/operator/localPluginExecuteDetailHeard/constants"
import {apiDebugPlugin, DebugPluginRequest} from "../plugins/utils"
import {
    ListVectorStoreEntriesRequest,
    QueryEntityRequest,
    QueryEntityResponse,
    SearchKnowledgeBaseEntryRequest,
    SearchKnowledgeBaseEntryResponse,
    VectorStoreEntryResponse,
    type KnowledgeBaseFile
} from "./TKnowledgeBase"
import {KnowledgeBaseItem} from "./hooks/useKnowledgeBase"
import {yakitNotify} from "@/utils/notification"

import {
    CrabIcon,
    SleepingCatIcon,
    TigerIcon,
    CatIcon,
    OctopusIcon,
    PigIcon,
    DogIcon,
    RabbitIcon,
    JumpingDragonIcon,
    BatmanIcon,
    SkeletonIcon,
    MeasuringCupIcon,
    CarIcon,
    TVIcon,
    HeadphonesIcon,
    SmileyFaceIcon,
    HeartIcon,
    WalletIcon,
    DiamondIcon,
    RobotIcon
} from "./icon/sidebarIcon"

const {ipcRenderer} = window.require("electron")

// 知识库所需安装插件名称列表
const targetInstallList = [
    "ffmpeg",
    "llama-server",
    "model-Qwen3-Embedding-0.6B-Q4",
    "model-whisper-medium-q5",
    "page2image",
    "pandoc",
    "whisper.cpp"
]

// 获取文件上传后缀
const getFileInfoList = (filename?: string): KnowledgeBaseFile[] => {
    if (!filename) return []

    return filename.split(",").map((path) => {
        const trimmedPath = path.trim()
        if (!trimmedPath) return {path: "", fileType: ""}

        const parts = trimmedPath.split(".")
        const fileType = parts.length > 1 ? parts.pop()!.toLowerCase() : ""
        return {path: trimmedPath, fileType}
    })
}

const manageMenuList = [
    {
        key: "edit",
        label: "编辑"
    },
    {
        key: "export",
        label: "导出"
    },
    {
        key: "delete",
        label: "删除"
    }
]

const createMenuList = [
    {
        key: "create",
        label: "新建"
    },
    {
        key: "import",
        label: "导入"
    }
]

const tableHeaderGroupOptions = [
    {
        value: "entity",
        label: "实体"
    },
    {
        value: "knowledge",
        label: "知识"
    },
    {
        value: "vector",
        label: "向量"
    }
]

// 查询知识库-知识列表
const apiSearchKnowledgeBaseEntry: (
    query?: SearchKnowledgeBaseEntryRequest
) => Promise<SearchKnowledgeBaseEntryResponse> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("SearchKnowledgeBaseEntry", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `查询失败: ${e}`)
                reject(e)
            })
    })
}

// 查询知识库-向量列表
const apiListVectorStoreEntries: (query?: ListVectorStoreEntriesRequest) => Promise<VectorStoreEntryResponse> = (
    query
) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("ListVectorStoreEntries", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `查询失败: ${e}`)
                reject(e)
            })
    })
}

// 查询知识库-实体列表
const apiQueryEntity: (query?: QueryEntityRequest) => Promise<QueryEntityResponse> = (query) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("QueryEntity", query)
            .then(resolve)
            .catch((e) => {
                yakitNotify("error", `查询失败: ${e}`)
                reject(e)
            })
    })
}

const icons = [
    CrabIcon,
    SleepingCatIcon,
    TigerIcon,
    CatIcon,
    OctopusIcon,
    PigIcon,
    DogIcon,
    RabbitIcon,
    JumpingDragonIcon,
    BatmanIcon,
    SkeletonIcon,
    MeasuringCupIcon,
    CarIcon,
    TVIcon,
    HeadphonesIcon,
    SmileyFaceIcon,
    HeartIcon,
    WalletIcon,
    DiamondIcon,
    RobotIcon
]

const targetIcon = (index) => icons[(index * 7 + 3) % icons.length]

const mergeKnowledgeBaseData = (localData: KnowledgeBaseItem[], apiData: KnowledgeBaseItem[]): KnowledgeBaseItem[] =>
    !Array.isArray(apiData) || apiData.length === 0
        ? localData
        : apiData.reduce(
              (acc, remoteItem) => {
                  const index = acc.findIndex(
                      (localItem) => localItem.KnowledgeBaseName === remoteItem.KnowledgeBaseName
                  )
                  return index >= 0
                      ? acc.map((item, i) => (i === index ? {...item, ...remoteItem} : item))
                      : [...acc, remoteItem]
              },
              [...localData]
          )

/**
 * 对比两个知识库数组，判断新增或删除
 * @param prev 上一次的数据
 * @param next 当前的数据
 */
const compareKnowledgeBaseChange = (
    prev: KnowledgeBaseItem[] | null | undefined,
    next: KnowledgeBaseItem[] | null | undefined
): {delete: KnowledgeBaseItem | null; increase: KnowledgeBaseItem | null} | true => {
    // 如果任意一方为空，则无法比较，直接返回 true（表示无变化或无法判断）
    if (!Array.isArray(prev) || !Array.isArray(next)) return true

    const prevMap = new Map(prev.map((item) => [item.ID, item]))
    const nextMap = new Map(next.map((item) => [item.ID, item]))

    // 查找被删除的对象
    const deleted = prev.find((item) => !nextMap.has(item.ID))
    if (deleted) return {delete: deleted, increase: null}

    // 查找新增的对象
    const increased = next.find((item) => !prevMap.has(item.ID))
    if (increased) return {delete: null, increase: increased}

    // 没有变化
    return true
}

const findChangedObjects = (before, after) => {
    return after.find((newItem) => {
        const oldItem = before.find((b) => b.ID === newItem.ID)
        return oldItem?.streamstep === "success" && newItem.streamstep === 1
    })
}

const BuildingKnowledgeBase = async (targetKnowledgeBase: KnowledgeBaseItem) => {
    const plugin = await grpcFetchLocalPluginDetail({Name: "构建知识库"}, true)
    const files = (targetKnowledgeBase.KnowledgeBaseFile?.map((it) => it.path) || []).join(",")
    const executeParams: DebugPluginRequest = {
        Code: "",
        PluginType: plugin.Type,
        Input: "",
        HTTPRequestTemplate: {...defPluginExecuteFormValue, IsHttpFlowId: false, HTTPFlowId: []},
        ExecParams: [
            {Key: "files", Value: files},
            {Key: "kbName", Value: targetKnowledgeBase.KnowledgeBaseName || "default"},
            {Key: "prompt", Value: ""},
            {Key: "entrylen", Value: `${targetKnowledgeBase.KnowledgeBaseLength ?? 1000}`},
            {Key: "k", Value: "0"},
            {Key: "kmin", Value: "2"},
            {Key: "kmax", Value: "4"}
        ],
        PluginName: plugin.ScriptName
    }

    await apiDebugPlugin({
        params: executeParams,
        token: targetKnowledgeBase.streamToken,
        pluginCustomParams: plugin.Params,
        isShowStartInfo: false
    })
}

const BuildingKnowledgeBaseEntry = async (targetKnowledgeBase: any, depth?: number) => {
    const plugin = await grpcFetchLocalPluginDetail({Name: "构建知识条目"}, true)
    const executeParam = [
        {
            Key: "kbName",
            Value: targetKnowledgeBase.KnowledgeBaseName!
        },
        {
            Key: "query",
            Value: targetKnowledgeBase.query ?? ""
        },
        {
            Key: "entrylen",
            Value: targetKnowledgeBase.KnowledgeBaseLength ?? 1000
        },
        {
            Key: "k",
            Value: 0
        },
        {
            Key: "klimit",
            Value: 300
        },
        {
            Key: "kmin",
            Value: 2
        },
        {
            Key: "kmax",
            Value: 4
        },
        // TODO 深度存在问题
        {
            Key: "depth",
            Value: 0
        },
        {
            Key: "entityID",
            Value: targetKnowledgeBase.isAll ? "" : targetKnowledgeBase?.HiddenIndex
        }
    ]
    const executeParams: any = {
        params: {
            Code: "",
            PluginType: "yak",
            PluginName: "构建知识条目",
            ExecParams: executeParam
        },
        pluginCustomParams: plugin?.Params
    }
    await apiDebugPlugin({
        ...executeParams,
        token: targetKnowledgeBase.streamToken,
        isShowStartInfo: true
    })
}

const getNextSelectedID = (list: KnowledgeBaseItem[], deleteID: string): string | null => {
    const len = list.length
    const index = list.findIndex((i) => i.ID === deleteID)

    // 逻辑合并为一行表达式，无 if
    return (len <= 1 && null) || (index === 0 && list?.[1]?.ID) || list[0]?.ID || null
}

const documentType = [
    {
        label: "实体",
        value: "entity"
    },
    {
        label: "关系",
        value: "relationship"
    },
    {
        label: "知识",
        value: "knowledge"
    },
    {
        label: "图",
        value: "khop"
    },
    {
        label: "问题索引",
        value: "question_index"
    }
]

interface BackendEntity {
    ID: string
    Name: string
    HiddenIndex: string
}

interface BackendRelationship {
    SourceEntityIndex: string
    TargetEntityIndex: string
    Attributes: {Key: string; Value: string}[]
    Type?: string // 可选类型
}

interface BackendData {
    Entities: BackendEntity[]
    Relationships: BackendRelationship[]
}

export interface GraphNode {
    id: string
    name: string
    symbolSize: number
    x: number
    y: number
    value: number
    fixed: boolean
}

interface GraphLink {
    source: string
    target: string
}

export interface GraphData {
    nodes: GraphNode[]
    links: GraphLink[]
    // links?: GraphSeriesOption["data"]
    // nodes?: GraphSeriesOption["data"]
}

const transformToGraphData = (data: BackendData): GraphData => {
    const indexMap = new Map(data.Entities.map((entity, idx) => [entity.HiddenIndex, idx.toString()]))

    const degreeMap = new Map()
    data.Entities.forEach((_, idx) => degreeMap.set(idx.toString(), 0))

    data.Relationships.forEach((rel) => {
        const sourceId = indexMap.get(rel.SourceEntityIndex)
        const targetId = indexMap.get(rel.TargetEntityIndex)
        if (sourceId && targetId) {
            degreeMap.set(sourceId, (degreeMap.get(sourceId) ?? 0) + 1)
            degreeMap.set(targetId, (degreeMap.get(targetId) ?? 0) + 1)
        }
    })

    // 先生成普通节点，暂不考虑外围
    const nodesTemp: GraphNode[] = data.Entities.map((entity, index) => {
        const degree = degreeMap.get(index.toString()) ?? 1
        const size = Math.log(degree + 1) * 10 + 10 // log增长
        return {
            id: index.toString(),
            name: entity.Name || `Entity-${index}`,
            symbolSize: size,
            x: 0,
            y: 0,
            value: degree,
            fixed: true
        }
    })

    const nodesTempSymbolSize = nodesTemp.map((n) => n.symbolSize)

    const maxSize = Math.max(...nodesTempSymbolSize) < 40 ? 40 : Math.max(...nodesTempSymbolSize)

    // 判断哪些节点没有 target
    const targetIds = new Set(data.Relationships.map((rel) => indexMap.get(rel.TargetEntityIndex)).filter(Boolean))

    const spreadRange = 300 // 中心区域大小
    const outerRange = 400 // 外围范围

    const nodes: GraphNode[] = nodesTemp.map((node) => {
        const isOuter = !targetIds.has(node.id)
        let x: number, y: number, size: number

        if (isOuter) {
            // 外围随机坐标
            const angle = Math.random() * 2 * Math.PI
            x = Math.cos(angle) * outerRange
            y = Math.sin(angle) * outerRange

            // symbolSize 随机在 15~20
            size = maxSize + Math.random() * 5
        } else {
            // 中心区域随机坐标
            x = Math.random() * spreadRange - spreadRange / 2
            y = Math.random() * spreadRange - spreadRange / 2
            size = node.symbolSize
        }

        return {...node, x, y, symbolSize: size}
    })

    const links: GraphLink[] = data.Relationships.map((rel) => ({
        source: indexMap.get(rel.SourceEntityIndex) ?? "",
        target: indexMap.get(rel.TargetEntityIndex) ?? ""
    })).filter((link) => link.source && link.target)

    return {nodes, links}
}

const extractAddedHistory = <T extends {token: string}>(
    current: {historyGenerateKnowledgeList: T[]},
    previous: {historyGenerateKnowledgeList: T[]}
): T | null => {
    const currentList = current.historyGenerateKnowledgeList ?? []
    const previousTokens = new Set(previous.historyGenerateKnowledgeList?.map((item) => item.token))
    return currentList.find((item) => !previousTokens.has(item.token)) ?? null
}

const answerOptions = [
    {
        value: "hypothetical_answer",
        label: "假设回答"
        // description: "这里是改模式的简短介绍"
    },
    {
        value: "generalize_query",
        label: "泛化回答"
        // description: "这里是改模式的简短介绍"
    },
    {
        value: "split_query",
        label: "多次查询"
        // description: "这里是改模式的简短介绍"
    },
    {
        value: "hypothetical_answer_with_split",
        label: "假设并多次查询"
        // description: "这里是改模式的简短介绍"
    }
]

export {
    targetInstallList,
    getFileInfoList,
    createMenuList,
    manageMenuList,
    targetIcon,
    mergeKnowledgeBaseData,
    compareKnowledgeBaseChange,
    BuildingKnowledgeBase,
    BuildingKnowledgeBaseEntry,
    getNextSelectedID,
    tableHeaderGroupOptions,
    apiSearchKnowledgeBaseEntry,
    apiListVectorStoreEntries,
    apiQueryEntity,
    documentType,
    findChangedObjects,
    transformToGraphData,
    extractAddedHistory,
    answerOptions
}
