import {type KnowledgeBaseFile} from "./TKnowledgeBase"

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

// const pluginData = await grpcFetchLocalPluginDetail({Name: "构建知识条目"}, true)
// let executeParams = {
//     params: {
//         Code: "",
//         PluginType: "yak",
//         PluginName: "构建知识条目",
//         ExecParams: [
//             {
//                 Key: "kbName",
//                 Value: addKnowledgenBaseModal.KnowledgeBaseName!
//             },
//             {
//                 Key: "query",
//                 Value: ""
//             },
//             {
//                 Key: "entrylen",
//                 Value: "1000"
//             },
//             {
//                 Key: "k",
//                 Value: "0"
//             },
//             {
//                 Key: "kmin",
//                 Value: "2"
//             },
//             {
//                 Key: "kmax",
//                 Value: "4"
//             }
//         ]
//     },
//     pluginCustomParams: pluginData?.Params
// }
// run({
//     ...executeParams,
//     token: lastTokenRef.current
// })

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

export {targetInstallList, getFileInfoList, createMenuList, manageMenuList, targetIcon}
