import {grpcFetchLocalPluginDetail} from "../pluginHub/utils/grpc"
import {defPluginExecuteFormValue} from "../plugins/operator/localPluginExecuteDetailHeard/constants"
import {apiDebugPlugin, DebugPluginRequest} from "../plugins/utils"
import {
    ListVectorStoreEntriesRequest,
    QueryEntityRequest,
    QueryEntityResponse,
    SearchKnowledgeBaseEntryRequest,
    SearchKnowledgeBaseEntryResponse,
    TClearKnowledgeResponse,
    VectorStoreEntryResponse,
    type KnowledgeBaseFile
} from "./TKnowledgeBase"
import {KnowledgeBaseItem} from "./hooks/useKnowledgeBase"
import {failed, yakitNotify} from "@/utils/notification"

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
import {YakitSideTabProps} from "../../components/yakitSideTab/YakitSideTabType"

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

export enum KnowledgeTabListEnum {
    Knowledge = "knowledge",
    Plugin = "plugin",
    AI_Model = "AIModel"
}
export const KnowledgeTabList: YakitSideTabProps["yakitTabs"] = [
    {value: KnowledgeTabListEnum.Knowledge, label: "知识库"},
    {value: KnowledgeTabListEnum.Plugin, label: "插件"},
    {value: KnowledgeTabListEnum.AI_Model, label: "AI模型"}
]

const insertModaOptions = [
    {
        value: "manual",
        label: "手动添加"
    },
    {
        value: "external",
        label: "外部导入"
    },
    {
        value: "other",
        label: "其他"
    }
]

const knowledgeTypeOptions = [
    {
        value: "漏洞情报",
        label: "漏洞情报"
    },
    {
        value: "攻击技术",
        label: "攻击技术"
    },
    {
        value: "恶意软件",
        label: "恶意软件"
    },
    {
        value: "渗透测试",
        label: "渗透测试"
    },
    {
        value: "红蓝对抗",
        label: "红蓝对抗"
    },
    {
        value: "威胁情报",
        label: "威胁情报"
    },
    {
        value: "应急响应",
        label: "应急响应"
    },
    {
        value: "代码审计",
        label: "代码审计"
    },
    {
        value: "逆向工程",
        label: "逆向工程"
    },
    {
        value: "Web安全",
        label: "Web安全"
    },
    {
        value: "内网渗透",
        label: "内网渗透"
    },
    {
        value: "云原生安全",
        label: "云原生安全"
    },
    {
        value: "移动安全",
        label: "移动安全"
    },
    {
        value: "IoT安全",
        label: "IoT安全"
    },
    {
        value: "密码学",
        label: "密码学"
    },
    {
        value: "协议分析",
        label: "协议分析"
    },
    {
        value: "供应链安全",
        label: "供应链安全"
    },
    {
        value: "安全工具",
        label: "安全工具"
    },
    {
        value: "武器库",
        label: "武器库"
    },
    {
        value: "靶场环境",
        label: "靶场环境"
    },
    {
        value: "字典规则",
        label: "字典规则"
    },
    {
        value: "等保合规",
        label: "等保合规"
    },
    {
        value: "安全标准",
        label: "安全标准"
    },
    {
        value: "法律法规",
        label: "法律法规"
    },
    {
        value: "安全基线",
        label: "安全基线"
    },
    {
        value: "编程语言",
        label: "编程语言"
    },
    {
        value: "开发框架",
        label: "开发框架"
    },
    {
        value: "数据库",
        label: "数据库"
    },
    {
        value: "DevOps",
        label: "DevOps"
    },
    {
        value: "系统运维",
        label: "系统运维"
    },
    {
        value: "行业报告",
        label: "行业报告"
    },
    {
        value: "技术博客",
        label: "技术博客"
    },
    {
        value: "培训教程",
        label: "培训教程"
    },
    {
        value: "产品文档",
        label: "产品文档"
    },
    {
        value: "项目管理",
        label: "项目管理"
    },
    {
        value: "AI与安全",
        label: "AI与安全"
    }
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
    },
    {
        key: "default",
        label: "设为默认"
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

const compareKnowledgeBaseChangeList = (
    prev: KnowledgeBaseItem[] | null | undefined,
    next: KnowledgeBaseItem[] | null | undefined
): {deleted: KnowledgeBaseItem[]; increased: KnowledgeBaseItem[]; unchanged: boolean} => {
    if (!Array.isArray(prev)) prev = []
    if (!Array.isArray(next)) next = []

    const prevMap = new Map(prev.map((item) => [item.ID, item]))
    const nextMap = new Map(next.map((item) => [item.ID, item]))

    // 删除项：prev 里有，但 next 没有
    const deleted = prev.filter((item) => !nextMap.has(item.ID))

    // 新增项：next 里有，但 prev 没有
    const increased = next.filter((item) => !prevMap.has(item.ID))

    // === 核心: 没有任何新增或删除时，返回 true ===
    const unchanged = deleted.length === 0 && increased.length === 0

    return {
        deleted,
        increased,
        unchanged
    }
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
            {Key: "prompt", Value: targetKnowledgeBase.prompt ?? ""},
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
        isShowStartInfo: false
    })
}

// 清空知识库插件调用所需参数
const ClearAllKnowledgeBase = (params: TClearKnowledgeResponse) => async (streamToken: string) => {
    const executeParams: DebugPluginRequest = {
        Code: "",
        PluginType: params.Type,
        Input: "",
        HTTPRequestTemplate: {...defPluginExecuteFormValue, IsHttpFlowId: false, HTTPFlowId: []},
        PluginName: params.ScriptName,
        ExecParams: [
            {
                Key: "confirm",
                Value: "true"
            }
        ]
    }
    await apiDebugPlugin({
        params: executeParams,
        token: streamToken,
        pluginCustomParams: params.Params,
        isShowStartInfo: false
    })
}

// 知识库可用性诊断
const checkAIModelAvailability = async (params, streamToken) => {
    const executeParams: DebugPluginRequest = {
        Code: "",
        PluginType: params.Type,
        Input: "",
        HTTPRequestTemplate: {...defPluginExecuteFormValue, IsHttpFlowId: false, HTTPFlowId: []},
        PluginName: params.ScriptName,
        ExecParams: []
    }
    await apiDebugPlugin({
        params: executeParams,
        token: streamToken,
        pluginCustomParams: params.Params,
        isShowStartInfo: false
    })
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
    BaseIndex: string
    Type?: string
}

interface BackendRelationship {
    SourceEntityIndex: string
    TargetEntityIndex: string
    Attributes: {Key: string; Value: string}[]
    Type?: string
}

interface BackendData {
    Entities: BackendEntity[]
    Relationships: BackendRelationship[]
}

export interface GraphNode {
    id: string
    name: string
    category?: string
    symbolSize: number
    x: number
    y: number
    value: number
    fixed: boolean
}

export interface GraphLink {
    source: string
    target: string
}

export interface GraphData {
    nodes: GraphNode[]
    links: GraphLink[]
}

const transformToGraphData = (data: BackendData): GraphData => {
    const total = data.Entities.length

    // map HiddenIndex → 连续 index
    const indexMap = new Map(data.Entities.map((entity, idx) => [entity.HiddenIndex, idx.toString()]))

    // 计算度数（决定节点大小）
    const degreeMap = new Map<string, number>()
    data.Entities.forEach((_, idx) => degreeMap.set(idx.toString(), 0))
    data.Relationships.forEach((rel) => {
        const s = indexMap.get(rel.SourceEntityIndex)
        const t = indexMap.get(rel.TargetEntityIndex)
        if (s && t) {
            degreeMap.set(s, (degreeMap.get(s) ?? 0) + 1)
            degreeMap.set(t, (degreeMap.get(t) ?? 0) + 1)
        }
    })

    // 构造节点
    const nodesTemp: GraphNode[] = data.Entities.map((entity, index) => {
        const degree = degreeMap.get(index.toString()) ?? 1
        const size = Math.log(degree + 1) * 10 + 10
        return {
            id: index.toString(),
            BaseIndex: entity?.BaseIndex,
            HiddenIndex: entity?.HiddenIndex,
            name: entity.Name ?? `Entity-${index}`,
            category: entity.Type ?? "default",
            symbolSize: size,
            x: 0,
            y: 0,
            value: degree,
            fixed: true
        }
    })

    // 最大节点设上限
    const maxSymbol = Math.max(...nodesTemp.map((n) => n.symbolSize))
    const maxSize = maxSymbol < 40 ? 40 : maxSymbol

    // 哪些是被指向的节点？其他节点放外围
    const targetIds = new Set(data.Relationships.map((rel) => indexMap.get(rel.TargetEntityIndex)).filter(Boolean))

    // 存放已分配位置，避免堆叠
    const occupiedPositions: {x: number; y: number; r: number}[] = []

    const isOverlapping = (x: number, y: number, r: number) => {
        return occupiedPositions.some((pos) => {
            const dx = pos.x - x
            const dy = pos.y - y
            const distance = Math.sqrt(dx * dx + dy * dy)
            return distance < pos.r + r + 20
        })
    }

    // 多层环状布局生成位置
    const generateLayeredPosition = (layerCount: number, idx: number, total: number) => {
        const nodesPerLayer = Math.ceil(total / layerCount)
        const layer = Math.floor(idx / nodesPerLayer)
        const angle = (idx % nodesPerLayer) * ((2 * Math.PI) / nodesPerLayer) + Math.random() * 0.5
        const radius = 200 + layer * 300 + Math.random() * 100 // 每层间距 300 + 随机扰动
        return {x: Math.cos(angle) * radius, y: Math.sin(angle) * radius}
    }

    const layerCount = Math.ceil(Math.sqrt(total)) // 根据总量设置层数

    // 生成最终节点位置
    const nodes: GraphNode[] = nodesTemp.map((node, idx) => {
        const isOuter = !targetIds.has(node.id)
        let x = 0,
            y = 0,
            size = node.symbolSize

        if (isOuter) {
            size = maxSize + Math.random() * 5
            let pos
            let attempt = 0
            do {
                const angle = Math.random() * 2 * Math.PI
                const radius = 1000 + idx * 15 + Math.random() * 300 // 外环半径更大
                pos = {x: Math.cos(angle) * radius, y: Math.sin(angle) * radius}
                attempt++
            } while (isOverlapping(pos.x, pos.y, size) && attempt < 100)
            x = pos.x
            y = pos.y
        } else {
            let pos
            let attempt = 0
            do {
                pos = generateLayeredPosition(layerCount, idx, total)
                attempt++
            } while (isOverlapping(pos.x, pos.y, size) && attempt < 100)
            x = pos.x
            y = pos.y
        }

        occupiedPositions.push({x, y, r: size})
        return {...node, x, y, symbolSize: size}
    })

    // 生成边
    const links: GraphLink[] = data.Relationships.map((rel) => ({
        source: indexMap.get(rel.SourceEntityIndex) ?? "",
        target: indexMap.get(rel.TargetEntityIndex) ?? ""
    })).filter((l) => l.source && l.target)

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

const prioritizeProcessingItems = (items: Array<KnowledgeBaseItem & {CreatedFromUI?: boolean}>) => {
    return [...items].sort((a, b) => {
        const aIsProcessing = a.streamstep === 1 || a.streamstep === 2
        const bIsProcessing = b.streamstep === 1 || b.streamstep === 2

        if (aIsProcessing && !bIsProcessing) return -1
        if (!aIsProcessing && bIsProcessing) return 1

        // 保持稳定排序
        return 0
    })
}

const extractFileName = (filePath: string) => {
    if (!filePath) return ""

    // 兼容 win/mac
    const parts = filePath.split(/[/\\]/)
    const fullName = parts[parts.length - 1]

    return fullName.replace(/\.[^/.]+$/, "")
}

type KnowledgeBase = Record<string, any>

const DEFAULT_EXTRA = {
    streamstep: "success" as 1 | 2 | "success",
    addManuallyItem: false,
    historyGenerateKnowledgeList: []
}

const mergeKnowledgeBaseList = (list1: KnowledgeBaseItem[], list2: KnowledgeBaseItem[]): KnowledgeBaseItem[] => {
    // 用 ID 构建 map，方便 O(1) 查找
    const map2 = new Map<string, KnowledgeBase>(list2.map((item) => [item.ID, item]))

    return list1.map((item1) => {
        const item2 = map2.get(item1.ID) || {}

        return {
            ...DEFAULT_EXTRA,
            ...item2,
            ...item1
        }
    })
}

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
    tableHeaderGroupOptions,
    apiSearchKnowledgeBaseEntry,
    apiListVectorStoreEntries,
    apiQueryEntity,
    documentType,
    findChangedObjects,
    transformToGraphData,
    extractAddedHistory,
    answerOptions,
    prioritizeProcessingItems,
    knowledgeTypeOptions,
    compareKnowledgeBaseChangeList,
    extractFileName,
    ClearAllKnowledgeBase,
    insertModaOptions,
    checkAIModelAvailability,
    mergeKnowledgeBaseList
}
