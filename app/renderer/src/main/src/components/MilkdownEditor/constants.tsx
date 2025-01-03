import {OutlineLightbulbIcon, OutlinePaperclipIcon} from "@/assets/icon/outline"
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
import {BlockListProps, TooltipListProps} from "./MilkdownEditorType"

export const defaultBlockList: BlockListProps[] = [
    {
        id: 1,
        icon: <IconHeading1 />,
        label: "一级标题",
        description: "一级标题: #空格"
    },
    {
        id: 2,
        icon: <IconHeading2 />,
        label: "二级标题",
        description: "二级标题: ##空格"
    },
    {
        id: 3,
        icon: <IconHeading3 />,
        label: "三级标题",
        description: "三级标题: ###空格"
    },
    {
        id: 4,
        icon: <IconListOrdered />,
        label: "有序列表",
        description: "有序列表: 1.空格"
    },
    {
        id: 5,
        icon: <IconList />,
        label: "无序列表",
        description: "无序列表: -空格或*空格"
    },
    {
        id: 6,
        icon: <IconCheckSquare />,
        label: "任务",
        description: "任务"
    },
    {
        id: 7,
        icon: <IconCurlyBraces />,
        label: "代码块",
        description: "代码块:```空格"
    },
    {
        id: 8,
        icon: <IconQuote />,
        label: "引用",
        description: "引用: >空格"
    },
    {
        id: 9,
        icon: <OutlineLightbulbIcon />,
        label: "高亮",
        description: "高亮: :::success空格"
    },
    {
        id: 10,
        icon: <OutlinePaperclipIcon />,
        label: "上传文件",
        description: "上传文件"
    },
    {
        id: 11,
        icon: <IconFlipVertical />,
        label: "分割线",
        description: "分割线: ***"
    }
]

export const defaultTooltipList: TooltipListProps[] = [
    {
        id: 1,
        icon: <IconType />,
        label: "正文",
        description: "正文"
    },
    {
        id: 2,
        icon: <IconHeading1 />,
        label: "一级标题",
        description: "一级标题: #空格"
    },
    {
        id: 3,
        icon: <IconHeading2 />,
        label: "二级标题",
        description: "二级标题: ##空格"
    },
    {
        id: 4,
        icon: <IconHeading3 />,
        label: "三级标题",
        description: "三级标题: ###空格"
    },
    {
        id: 5,
        label: "divider"
    },
    {
        id: 6,
        icon: <IconListOrdered />,
        label: "有序列表",
        description: "有序列表: 1.空格"
    },
    {
        id: 7,
        icon: <IconList />,
        label: "无序列表",
        description: "无序列表: -空格或*空格"
    },
    {
        id: 8,
        icon: <IconCheckSquare />,
        label: "任务",
        description: "任务"
    },
    {
        id: 9,
        label: "divider"
    },
    {
        id: 10,
        icon: <IconCurlyBraces />,
        label: "代码块",
        description: "代码块:```空格"
    },
    {
        id: 11,
        icon: <IconQuote />,
        label: "引用",
        description: "引用: >空格"
    }
]
