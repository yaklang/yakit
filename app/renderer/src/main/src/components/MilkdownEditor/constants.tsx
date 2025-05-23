import {OutlineCameraIcon, OutlineLightbulbIcon, OutlinePaperclipIcon} from "@/assets/icon/outline"
import {
    IconHeading1,
    IconHeading2,
    IconHeading3,
    IconListOrdered,
    IconList,
    IconCheckSquare,
    IconCurlyBraces,
    IconQuote,
    IconFlipVertical,
    IconType
} from "./icon/icon"
import {ReactNode} from "react"

export interface MilkdownBaseUtilProps {
    key: string
    icon: ReactNode
    label: string
    description: string
}
export interface BlockListProps {
    key: MilkdownMenuType
    icon: ReactNode
    label: string
    description: string
}
export type TooltipListProps = BlockListProps | {key: string; label: string}

export const MilkdownMenu = {
    text: {
        key: "text",
        icon: <IconType />,
        label: "文本",
        description: "文本"
    },
    heading1: {
        key: "heading1",
        icon: <IconHeading1 />,
        label: "一级标题",
        description: "一级标题: #空格"
    },
    heading2: {
        key: "heading2",
        icon: <IconHeading2 />,
        label: "二级标题",
        description: "二级标题: ##空格"
    },
    heading3: {
        key: "heading3",
        icon: <IconHeading3 />,
        label: "三级标题",
        description: "三级标题: ###空格"
    },
    orderedList: {
        key: "orderedList",
        icon: <IconListOrdered />,
        label: "有序列表",
        description: "有序列表: 1.空格"
    },
    unorderedList: {
        key: "unorderedList",
        icon: <IconList />,
        label: "无序列表",
        description: "无序列表: -空格或*空格"
    },
    task: {
        key: "task",
        icon: <IconCheckSquare />,
        label: "任务",
        description: "任务"
    },
    codeBlock: {
        key: "codeBlock",
        icon: <IconCurlyBraces />,
        label: "代码块",
        description: "代码块:```空格"
    },
    quote: {
        key: "quote",
        icon: <IconQuote />,
        label: "引用",
        description: "引用: >空格"
    },
    highLight: {
        key: "highLight",
        icon: <OutlineLightbulbIcon />,
        label: "高亮",
        description: "高亮: :::success空格"
    },
    file: {
        key: "file",
        icon: <OutlinePaperclipIcon />,
        label: "上传文件",
        description: "上传文件"
    },
    divider: {
        key: "divider",
        icon: <IconFlipVertical />,
        label: "分割线",
        description: "分割线: ***"
    }
}

const MilkdownMenuKey = Object.keys(MilkdownMenu)
/**基础菜单中的key集合 */
export type MilkdownMenuType = keyof typeof MilkdownMenu

export const MilkdownMenuKeyEnum = Object.fromEntries(
    MilkdownMenuKey.map((item) => [item.charAt(0).toUpperCase() + item.slice(1), item])
) as {
    [K in MilkdownMenuType as Capitalize<K>]: K
}
/**
 * 根据传的key生成对应的工具菜单，按key的顺序
 * @param {MilkdownMenuType[]} keys
 * */
export const createMilkdownMenuListByKey = (keys: MilkdownMenuType[]) => {
    return keys.map((ele) => ({
        ...MilkdownMenu[ele],
        key: ele
    }))
}
//#region slash

/**基础菜单 Key值 */
export const baseSlashKey: MilkdownMenuType[] = [
    MilkdownMenuKeyEnum.Text,
    MilkdownMenuKeyEnum.Heading1,
    MilkdownMenuKeyEnum.Heading2,
    MilkdownMenuKeyEnum.Heading3,
    MilkdownMenuKeyEnum.OrderedList,
    MilkdownMenuKeyEnum.UnorderedList,
    MilkdownMenuKeyEnum.CodeBlock,
    MilkdownMenuKeyEnum.Quote,
    MilkdownMenuKeyEnum.Divider
]
/**显示常用菜单 Key值 */
export const onlineCommonSlashKey: MilkdownMenuType[] = [
    MilkdownMenuKeyEnum.Task,
    MilkdownMenuKeyEnum.HighLight,
    MilkdownMenuKeyEnum.File
]

/**本地常用菜单 Key值 */
export const localCommonSlashKey: MilkdownMenuType[] = [MilkdownMenuKeyEnum.Task, MilkdownMenuKeyEnum.HighLight]

//#endregion

//#region Block
export const onlineBlockKey: MilkdownMenuType[] = [
    MilkdownMenuKeyEnum.Heading1,
    MilkdownMenuKeyEnum.Heading2,
    MilkdownMenuKeyEnum.Heading3,
    MilkdownMenuKeyEnum.OrderedList,
    MilkdownMenuKeyEnum.UnorderedList,
    MilkdownMenuKeyEnum.Task,
    MilkdownMenuKeyEnum.CodeBlock,
    MilkdownMenuKeyEnum.Quote,
    MilkdownMenuKeyEnum.HighLight,
    MilkdownMenuKeyEnum.File,
    MilkdownMenuKeyEnum.Divider
]
export const localBlockKey: MilkdownMenuType[] = [
    MilkdownMenuKeyEnum.Heading1,
    MilkdownMenuKeyEnum.Heading2,
    MilkdownMenuKeyEnum.Heading3,
    MilkdownMenuKeyEnum.OrderedList,
    MilkdownMenuKeyEnum.UnorderedList,
    MilkdownMenuKeyEnum.Task,
    MilkdownMenuKeyEnum.CodeBlock,
    MilkdownMenuKeyEnum.Quote,
    MilkdownMenuKeyEnum.HighLight,
    MilkdownMenuKeyEnum.Divider
]
//#endregion
//#region Tooltip
export const tooltipKey: (MilkdownMenuType | "key-divider")[] = [
    MilkdownMenuKeyEnum.Text,
    MilkdownMenuKeyEnum.Heading1,
    MilkdownMenuKeyEnum.Heading2,
    MilkdownMenuKeyEnum.Heading3,
    "key-divider",
    MilkdownMenuKeyEnum.OrderedList,
    MilkdownMenuKeyEnum.UnorderedList,
    MilkdownMenuKeyEnum.Task,
    "key-divider",
    MilkdownMenuKeyEnum.CodeBlock,
    MilkdownMenuKeyEnum.Quote
]
//#endregion
