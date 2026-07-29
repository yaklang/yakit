import { OutlineCameraIcon, OutlineLightbulbIcon, OutlinePaperclipIcon } from '@/assets/icon/outline'
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
  IconType,
} from './icon/icon'
import { ReactNode } from 'react'
import { TFunction } from '@/i18n/useI18nNamespaces'

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
export type TooltipListProps = BlockListProps | { key: string; label: string }

export const MilkdownMenu = {
  text: {
    key: 'text',
    icon: <IconType />,
    labelKey: 'MilkdownEditor.menu.text.label',
    descriptionKey: 'MilkdownEditor.menu.text.description',
  },
  heading1: {
    key: 'heading1',
    icon: <IconHeading1 />,
    labelKey: 'MilkdownEditor.menu.heading1.label',
    descriptionKey: 'MilkdownEditor.menu.heading1.description',
  },
  heading2: {
    key: 'heading2',
    icon: <IconHeading2 />,
    labelKey: 'MilkdownEditor.menu.heading2.label',
    descriptionKey: 'MilkdownEditor.menu.heading2.description',
  },
  heading3: {
    key: 'heading3',
    icon: <IconHeading3 />,
    labelKey: 'MilkdownEditor.menu.heading3.label',
    descriptionKey: 'MilkdownEditor.menu.heading3.description',
  },
  orderedList: {
    key: 'orderedList',
    icon: <IconListOrdered />,
    labelKey: 'MilkdownEditor.menu.orderedList.label',
    descriptionKey: 'MilkdownEditor.menu.orderedList.description',
  },
  unorderedList: {
    key: 'unorderedList',
    icon: <IconList />,
    labelKey: 'MilkdownEditor.menu.unorderedList.label',
    descriptionKey: 'MilkdownEditor.menu.unorderedList.description',
  },
  task: {
    key: 'task',
    icon: <IconCheckSquare />,
    labelKey: 'MilkdownEditor.menu.task.label',
    descriptionKey: 'MilkdownEditor.menu.task.description',
  },
  codeBlock: {
    key: 'codeBlock',
    icon: <IconCurlyBraces />,
    labelKey: 'MilkdownEditor.menu.codeBlock.label',
    descriptionKey: 'MilkdownEditor.menu.codeBlock.description',
  },
  quote: {
    key: 'quote',
    icon: <IconQuote />,
    labelKey: 'MilkdownEditor.menu.quote.label',
    descriptionKey: 'MilkdownEditor.menu.quote.description',
  },
  highLight: {
    key: 'highLight',
    icon: <OutlineLightbulbIcon />,
    labelKey: 'MilkdownEditor.menu.highLight.label',
    descriptionKey: 'MilkdownEditor.menu.highLight.description',
  },
  file: {
    key: 'file',
    icon: <OutlinePaperclipIcon />,
    labelKey: 'MilkdownEditor.menu.file.label',
    descriptionKey: 'MilkdownEditor.menu.file.description',
  },
  divider: {
    key: 'divider',
    icon: <IconFlipVertical />,
    labelKey: 'MilkdownEditor.menu.divider.label',
    descriptionKey: 'MilkdownEditor.menu.divider.description',
  },
}

const MilkdownMenuKey = Object.keys(MilkdownMenu)
/**基础菜单中的key集合 */
export type MilkdownMenuType = keyof typeof MilkdownMenu

export const MilkdownMenuKeyEnum = Object.fromEntries(
  MilkdownMenuKey.map((item) => [item.charAt(0).toUpperCase() + item.slice(1), item]),
) as {
  [K in MilkdownMenuType as Capitalize<K>]: K
}
/**
 * 根据传的key生成对应的工具菜单，按key的顺序
 * @param {MilkdownMenuType[]} keys
 * */
export const createMilkdownMenuListByKey = (t: TFunction, keys: MilkdownMenuType[]) => {
  return keys.map((ele) => ({
    ...MilkdownMenu[ele],
    key: ele,
    label: t(MilkdownMenu[ele].labelKey),
    description: t(MilkdownMenu[ele].descriptionKey),
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
  MilkdownMenuKeyEnum.Divider,
]
/**显示常用菜单 Key值 */
export const onlineCommonSlashKey: MilkdownMenuType[] = [
  MilkdownMenuKeyEnum.Task,
  MilkdownMenuKeyEnum.HighLight,
  MilkdownMenuKeyEnum.File,
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
  MilkdownMenuKeyEnum.Divider,
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
  MilkdownMenuKeyEnum.Divider,
]
//#endregion
//#region Tooltip
export const tooltipKey: (MilkdownMenuType | 'key-divider')[] = [
  MilkdownMenuKeyEnum.Text,
  MilkdownMenuKeyEnum.Heading1,
  MilkdownMenuKeyEnum.Heading2,
  MilkdownMenuKeyEnum.Heading3,
  'key-divider',
  MilkdownMenuKeyEnum.OrderedList,
  MilkdownMenuKeyEnum.UnorderedList,
  MilkdownMenuKeyEnum.Task,
  'key-divider',
  MilkdownMenuKeyEnum.CodeBlock,
  MilkdownMenuKeyEnum.Quote,
]
//#endregion
