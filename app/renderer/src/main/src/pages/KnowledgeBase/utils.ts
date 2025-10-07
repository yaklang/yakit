import {grpcFetchLocalPluginDetail} from "../pluginHub/utils/grpc"
import {defPluginExecuteFormValue} from "../plugins/operator/localPluginExecuteDetailHeard/constants"
import {apiDebugPlugin, DebugPluginRequest} from "../plugins/utils"
import {
    ListVectorStoreEntriesRequest,
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
        key: "import",
        label: "导入"
    },
    {
        key: "create",
        label: "新建"
    }
]

const tableHeaderGroupOptions = [
    {
        value: "Entity",
        label: "实体"
    },
    {
        value: "Knowledge",
        label: "知识"
    },
    {
        value: "Vector",
        label: "向量"
    }
]

/** SearchKnowledgeBaseEntry */
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

const BuildingKnowledgeBaseEntry = async (targetKnowledgeBase: KnowledgeBaseItem) => {
    const plugin = await grpcFetchLocalPluginDetail({Name: "构建知识条目"}, true)
    const executeParams: any = {
        params: {
            Code: "",
            PluginType: "yak",
            PluginName: "构建知识条目",
            ExecParams: [
                {
                    Key: "kbName",
                    Value: targetKnowledgeBase.KnowledgeBaseName!
                },
                {
                    Key: "query",
                    Value: ""
                },
                {
                    Key: "entrylen",
                    Value: targetKnowledgeBase.KnowledgeBaseLength ?? "1000"
                },
                {
                    Key: "k",
                    Value: "0"
                },
                {
                    Key: "kmin",
                    Value: "2"
                },
                {
                    Key: "kmax",
                    Value: "4"
                }
            ]
        },
        pluginCustomParams: plugin?.Params
    }
    await apiDebugPlugin({
        ...executeParams,
        token: targetKnowledgeBase.streamToken
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
/*     
    RAGDocumentType_Entity        RAGDocumentType = "entity"         // 实体
    RAGDocumentType_Relationship  RAGDocumentType = "relationship"   // 关系
    RAGDocumentType_Knowledge     RAGDocumentType = "knowledge"      // 知识
    RAGDocumentType_KHop          RAGDocumentType = "khop"           // 图
    RAGDocumentType_QuestionIndex RAGDocumentType = "question_index" // 问题索引
*/

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
    documentType
}
