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
//#region slash
/**基础菜单 */
const baseSlashList = [
    {
        id: "text",
        label: "文本",
        icon: <IconType />
    },
    {
        id: "heading1",
        label: "一级标题",
        icon: <IconHeading1 />
    },
    {
        id: "heading2",
        label: "二级标题",
        icon: <IconHeading2 />
    },
    {
        id: "heading3",
        label: "三级标题",
        icon: <IconHeading3 />
    },
    {
        id: "orderedList",
        label: "有序列表",
        icon: <IconListOrdered />
    },
    {
        id: "unorderedList",
        label: "无序列表",
        icon: <IconList />
    },
    {
        id: "codeBlock",
        label: "代码块",
        icon: <IconCurlyBraces />
    },
    {
        id: "quote",
        label: "引用",
        icon: <IconQuote />
    },
    {
        id: "divider",
        label: "分割线",
        icon: <IconFlipVertical />
    }
] as const
/**常用菜单 */
const commonList = [
    {
        id: "task",
        label: "任务",
        icon: <IconCheckSquare />
    },
    {
        id: "highLight",
        label: "高亮",
        icon: <OutlineLightbulbIcon />
    },
    {
        id: "file",
        label: "文件",
        icon: <OutlinePaperclipIcon />
    }
] as const
/**基础菜单中的key集合 */
type BaseSlashType = (typeof baseSlashList)[number]["id"]
/**常用菜单中的key集合 */
type CommonSlashType = (typeof commonList)[number]["id"]
export type SlashType = BaseSlashType | CommonSlashType

const slashList = [...baseSlashList, ...commonList]
export const SlashKeyEnum = Object.fromEntries(
    slashList.map((item) => [item.id.charAt(0).toUpperCase() + item.id.slice(1), item.id])
) as {
    [K in SlashType as Capitalize<K>]: K
}

/** slash 线上菜单 */
export const onlineSlashList = {
    基础: baseSlashList,
    常用: commonList
}

/** slash 本地菜单 */
export const localSlashList = {
    基础: baseSlashList,
    常用: commonList.filter((ele) => !["file"].includes(ele.id))
}
//#endregion
