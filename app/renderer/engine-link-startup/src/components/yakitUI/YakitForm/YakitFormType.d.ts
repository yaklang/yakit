import { ReactNode } from 'react'
import type { YakitSizeType } from '../YakitInputNumber/YakitInputNumberType'
import { InputProps } from 'antd'

/**拖拽属性 */
export interface FileDraggerProps {
  /**禁用 */
  disabled?: boolean
  /**是否允许多选 */
  multiple?: boolean
  className?: string
  children?: ReactNode
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
}

/**拖拽/点击文件,回显文件路径组件props */
export interface YakitDraggerProps extends FileDraggerProps {
  size?: YakitSizeType
  inputProps?: InputProps
  /**@description selectType为file,该属性才有效*/
  setContent?: (s: string) => void
  uploadFileText?: string
  uploadFolderText?: string
  help?: ReactDOM
  showExtraHelp?: ReactDOM
  showDefHelp?: boolean
  showUploadBtn?: boolean
  /**回显的文本值 */
  value?: string
  /**回显的文本回调事件 */
  onChange?: (s: string) => void
  /**all:支持上传文件和文件夹,不支持accept; file:只支持文件; folder:只支持文件夹;a */
  selectType?: 'file' | 'folder' | 'all'
  /** 展示组件 input|textarea|autoComplete */
  renderType?: 'input' | 'textarea' | 'autoComplete'
  /** autoComplete的props */
  autoCompleteProps?: YakitAutoCompleteProps
  /** textarea的props */
  textareaProps?: InternalTextAreaProps
  /**是否显示路径数量 */
  isShowPathNumber?: boolean

  /**接受的文件类型 */
  accept?: string
  /**文件类型是否后缀一定存在 */
  fileExtensionIsExist?: boolean

  /** 缓存文件所选路径Key */
  cacheFilePathKey?: string
  /** 缓存文件夹所选路径Key */
  cacheFolderPathKey?: string

  helpClassName?: string
}
