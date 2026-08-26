import { type CSSProperties } from 'react'
import type { DatePickerProps, RangePickerProps } from 'antd'

import type { YakitSizeType } from '../YakitInputNumber/YakitInputNumberType'

// antd 的 DatePickerProps/RangePickerProps 是联合类型，普通 Omit 只保留各分支共有属性，会丢失 showTime 等仅在部分分支存在的属性
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never

/**
 * @description YakitInputSearchProps 的属性
 * @augments DatePickerProps 继承antd的Input SearchProps 默认属性
 * @param {YakitSizeType} size  默认middle
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 * @param {boolean} showExtraFooter 是否显示自定义底部操作栏；为 true 时会隐藏 antd 默认的【此刻】和【确定】按钮，并渲染 YakitButton 风格的“此刻/确定”按钮；也可通过 renderExtraFooter 传入自定义内容
 */
export type YakitDatePickerProps = DistributiveOmit<DatePickerProps, 'size'> & {
  size?: YakitSizeType
  wrapperClassName?: string
  wrapperStyle?: CSSProperties
  showExtraFooter?: boolean
}

/**
 * @description YakitInputSearchProps 的属性
 * @augments DatePickerProps 继承antd的Input SearchProps 默认属性
 * @param {YakitSizeType} size  默认middle
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export type YakitRangePickerProps = DistributiveOmit<RangePickerProps, 'size'> & {
  size?: YakitSizeType
  wrapperClassName?: string
  wrapperStyle?: CSSProperties
}
