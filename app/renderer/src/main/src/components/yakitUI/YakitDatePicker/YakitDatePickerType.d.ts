import { type CSSProperties } from 'react'
import type { DatePickerProps } from 'antd'
import type { RangePickerProps } from 'antd/es/date-picker'
import type { Moment } from 'moment'
import type { YakitSizeType } from '../YakitInputNumber/YakitInputNumberType'

export type MomentDisabledDate = (
  current: Moment,
  info: Parameters<NonNullable<DatePickerProps['disabledDate']>>[1],
) => boolean

export interface YakitDatePickerProps extends Omit<
  DatePickerProps,
  'size' | 'value' | 'defaultValue' | 'onChange' | 'disabledDate'
> {
  size?: YakitSizeType
  wrapperClassName?: string
  wrapperStyle?: CSSProperties
  value?: Moment | null
  defaultValue?: Moment | null
  onChange?: (value: Moment | null, dateString: string | string[]) => void
  disabledDate?: MomentDisabledDate
}

export interface YakitRangePickerProps extends Omit<
  RangePickerProps,
  'size' | 'value' | 'defaultValue' | 'onChange' | 'disabledDate' | 'onCalendarChange' | 'ranges'
> {
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
