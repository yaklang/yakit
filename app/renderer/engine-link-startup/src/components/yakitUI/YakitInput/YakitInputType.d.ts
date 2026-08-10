import type { InputProps } from 'antd'

import type { PasswordProps, SearchProps, TextAreaProps } from 'antd/lib/input'
import type { CSSProperties } from 'react'

import type { YakitSizeType } from '../YakitInputNumber/YakitInputNumberType'

/**
 * @description YakitInputNumberProps 的属性
 * @augments InputProps 继承antd的Input默认属性
 * @param {YakitSizeType} size  默认middle
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export interface YakitInputProps extends Omit<InputProps, 'size'> {
  size?: YakitSizeType
  wrapperClassName?: string
  wrapperStyle?: CSSProperties
}
/**
 * @description YakitInputSearchProps 的属性
 * @augments InputProps 继承antd的Input SearchProps 默认属性
 * @param {YakitSizeType} size  默认middle
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export interface YakitInputSearchProps extends Omit<SearchProps, 'size'> {
  size?: YakitSizeType
  wrapperClassName?: string
  wrapperStyle?: CSSProperties
}
/**
 * @description InternalTextAreaProps 的属性
 * @augments InternalTextAreaProps 继承antd的Input TextAreaProps 默认属性
 * @param {string} wrapperClassName
 * @param {string} resizeClassName
 * @param {CSSProperties} wrapperStyle
 * @param {boolean} isShowResize 是否显示右下角的拖拽icon，false时,icon和功能都会消失
 */
export interface InternalTextAreaProps extends TextAreaProps {
  wrapperClassName?: string
  resizeClassName?: string
  wrapperStyle?: React.CSSProperties
  isShowResize?: boolean
}

/**
 * @description InternalInputPasswordProps 的属性
 * @augments InternalInputPasswordProps 继承antd的Input PasswordProps 默认属性
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export interface InternalInputPasswordProps extends Omit<PasswordProps, 'size'> {
  wrapperClassName?: string
  size?: YakitSizeType
  wrapperStyle?: React.CSSProperties
}
