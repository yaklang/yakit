import { type YakitFormDraggerProps } from '@/components/yakitUI/YakitForm/YakitFormType'
import { type YakitInputProps } from '@/components/yakitUI/YakitInput/YakitInputType'
import { type YakitInputNumberProps } from '@/components/yakitUI/YakitInputNumber/YakitInputNumberType'
import { type TextAreaProps } from 'antd/lib/input'
import { type CSSProperties, type ReactNode } from 'react'
import type { LiteralUnion } from 'antd/lib/_util/type'

interface ItemProps {
  label?: string | ReactNode
  help?: ReactNode
  formItemStyle?: CSSProperties
  required?: boolean
}

export interface ItemInputProps extends ItemProps {
  placeholder?: string
  disable?: boolean
  width?: string | number
  allowClear?: boolean
  type?: LiteralUnion<
    | 'button'
    | 'checkbox'
    | 'color'
    | 'date'
    | 'datetime-local'
    | 'email'
    | 'file'
    | 'hidden'
    | 'image'
    | 'month'
    | 'number'
    | 'password'
    | 'radio'
    | 'range'
    | 'reset'
    | 'search'
    | 'submit'
    | 'tel'
    | 'text'
    | 'time'
    | 'url'
    | 'week',
    string
  >

  prefix?: React.ReactNode
  suffix?: React.ReactNode

  // 是否阻止事件冒泡
  isBubbing?: boolean

  value?: string
  setValue?: (value: string) => any
}

export interface ItemTextAreaProps extends ItemProps {
  placeholder?: string
  disable?: boolean
  width?: string | number
  allowClear?: boolean
  textareaRow?: number
  autoSize?: TextAreaProps['autoSize']

  // 是否阻止事件冒泡
  isBubbing?: boolean

  value?: string
  setValue?: (value: string) => any
}

export interface ItemAutoCompleteProps extends ItemProps {
  placeholder?: string
  disable?: boolean
  width?: string | number
  allowClear?: boolean
  autoComplete?: string[]

  // 是否阻止事件冒泡
  isBubbing?: boolean

  value?: string
  setValue?: (value: string) => any
}

export interface ItemInputIntegerProps extends ItemProps {
  width?: string | number
  size?: YakitInputNumberProps['size']
  min?: number
  max?: number
  defaultValue?: number
  disable?: boolean
  value?: number
  setValue?: (value: number) => any
}
export interface ItemInputFloatProps extends ItemInputIntegerProps {
  precision?: number
}

export interface ItemInputDraggerPathProps extends ItemProps {
  /** 展示组件 输入框|文本域 */
  renderType?: YakitFormDraggerProps['renderType']
  /** 选择类型 文件|文件夹 */
  selectType?: YakitFormDraggerProps['selectType']

  placeholder?: string
  disable?: boolean
  width?: string | number
  allowClear?: boolean

  // input
  /** 仅input组件有效 */
  size?: YakitInputProps['size']

  // textarea
  textareaRow?: number
  autoSize?: TextAreaProps['autoSize']

  value?: string
  setValue?: (value: string) => any
}
