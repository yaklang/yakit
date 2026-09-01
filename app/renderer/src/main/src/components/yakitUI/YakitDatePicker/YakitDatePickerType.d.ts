import { type CSSProperties } from 'react'
import type { DatePickerProps } from 'antd'
import type { RangePickerProps } from 'antd/es/date-picker'
import type { Moment } from 'moment'
import type { YakitSizeType } from '../YakitInputNumber/YakitInputNumberType'

export type MomentDisabledDate = (
  current: Moment,
  info: Parameters<NonNullable<DatePickerProps['disabledDate']>>[1],
) => boolean

// antd 的 DatePickerProps/RangePickerProps 是联合类型，普通 Omit 只保留各分支共有属性，会丢失 showTime 等仅在部分分支存在的属性
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never

/**
 * @description YakitInputSearchProps 的属性
 * @augments DatePickerProps 继承antd的Input SearchProps 默认属性
 * @param {YakitSizeType} size  默认middle
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export type YakitDatePickerProps = DistributiveOmit<
  DatePickerProps,
  'size' | 'value' | 'defaultValue' | 'onChange' | 'disabledDate' | 'onSelect'
> & {
  size?: YakitSizeType
  wrapperClassName?: string
  wrapperStyle?: CSSProperties
  value?: Moment | null
  defaultValue?: Moment | null
  onChange?: (value: Moment | null, dateString: string | string[]) => void
  disabledDate?: MomentDisabledDate
  onSelect?: (value: Moment | null) => void
}

/**
 * @description YakitInputSearchProps 的属性
 * @augments DatePickerProps 继承antd的Input SearchProps 默认属性
 * @param {YakitSizeType} size  默认middle
 * @param {string} wrapperClassName
 * @param {CSSProperties} wrapperStyle
 */
export type YakitRangePickerProps = DistributiveOmit<
  RangePickerProps,
  'size' | 'value' | 'defaultValue' | 'onChange' | 'disabledDate' | 'onCalendarChange' | 'ranges'
> & {
  size?: YakitSizeType
  wrapperClassName?: string
  wrapperStyle?: CSSProperties
  value?: [Moment | null, Moment | null] | null
  defaultValue?: [Moment | null, Moment | null] | null
  onChange?: (value: [Moment | null, Moment | null] | null, dateString: [string, string]) => void
  onCalendarChange?: (
    value: [Moment | null, Moment | null],
    dateString: [string, string],
    info: { range?: 'start' | 'end' },
  ) => void
  disabledDate?: MomentDisabledDate
  ranges?: Record<string, [Moment, Moment] | (() => [Moment, Moment])>
}
