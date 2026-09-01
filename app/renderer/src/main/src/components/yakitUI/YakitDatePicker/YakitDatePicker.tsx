import { DatePicker, type DatePickerProps } from 'antd'
import React, { useEffect } from 'react'
import type { YakitDatePickerProps, YakitRangePickerProps } from './YakitDatePickerType'
import classNames from 'classnames'
import styles from './YakitDatePicker.module.scss'
import { OutlineClockIcon } from '@/assets/icon/outline'
import zhCN from 'antd/es/date-picker/locale/zh_CN'
import zhTW from 'antd/es/date-picker/locale/zh_TW'
import enUS from 'antd/es/date-picker/locale/en_US'
import i18n from '@/i18n/i18n'
import dayjs, { type Dayjs } from 'dayjs'
import moment, { type Moment } from 'moment'
import 'moment/locale/zh-cn'
import 'moment/locale/zh-tw'
import 'moment/locale/en-gb'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/zh-tw'
import 'dayjs/locale/en-gb'

const { RangePicker } = DatePicker

const antdLocaleMap: Record<string, typeof zhCN> = {
  zh: zhCN,
  'zh-TW': zhTW,
  en: enUS,
}

const momentLocaleMap: Record<string, string> = {
  zh: 'zh-cn',
  'zh-TW': 'zh-tw',
  en: 'en-gb',
}

const getAntdLocale = (lang: string) => antdLocaleMap[lang] ?? zhCN
const getMomentLocale = (lang: string) => momentLocaleMap[lang] ?? 'zh-cn'

const toDayjs = (value?: Moment | Dayjs | null) => {
  if (value == null) return value
  if (dayjs.isDayjs(value)) return value
  return dayjs((value as Moment).valueOf())
}

const toMoment = (value?: Dayjs | null): Moment | null => {
  if (!value) return null
  return moment(value.valueOf())
}

const toDayjsRange = (value?: [Moment | null, Moment | null] | null) => {
  if (value == null) return value
  return [toDayjs(value[0]) ?? null, toDayjs(value[1]) ?? null] as [Dayjs | null, Dayjs | null]
}

const InternalDatePicker: React.FC<YakitDatePickerProps> = (props) => {
  const {
    size,
    wrapperClassName,
    className,
    dropdownClassName,
    wrapperStyle,
    classNames: pickerClassNames,
    value,
    defaultValue,
    onChange,
    disabledDate,
    ...restProps
  } = props
  const lang = i18n.language

  useEffect(() => {
    moment.locale(getMomentLocale(lang))
    dayjs.locale(getMomentLocale(lang))
  }, [lang])

  return (
    <div
      className={classNames(
        styles['yakit-date-picker-wrapper'],
        {
          [styles['yakit-date-picker-large']]: size === 'large',
          [styles['yakit-date-picker-small']]: size === 'small',
        },
        wrapperClassName,
      )}
      style={{ ...(wrapperStyle || {}) }}
    >
      <DatePicker
        {...restProps}
        value={toDayjs(value) as DatePickerProps['value']}
        defaultValue={toDayjs(defaultValue) as DatePickerProps['defaultValue']}
        onChange={(next, dateString) => {
          onChange?.(toMoment(next), dateString)
        }}
        disabledDate={
          disabledDate
            ? (current, info) => (current ? disabledDate(moment(current.valueOf()), info) : false)
            : undefined
        }
        locale={getAntdLocale(lang)}
        suffixIcon={
          <div className={styles['picker-icon']}>
            <OutlineClockIcon />
          </div>
        }
        classNames={{
          ...pickerClassNames,
          popup: {
            ...pickerClassNames?.popup,
            root: classNames(styles['yakit-data-picker-dropdaown'], dropdownClassName, pickerClassNames?.popup?.root),
          },
        }}
        className={classNames(
          styles['yakit-picker'],
          {
            [styles['yakit-picker-large']]: size === 'large',
            [styles['yakit-picker-small']]: size === 'small',
          },
          className,
        )}
      />
    </div>
  )
}

const InternalRangePicker: React.FC<YakitRangePickerProps> = (props) => {
  const {
    size,
    wrapperClassName,
    className,
    dropdownClassName,
    wrapperStyle,
    classNames: pickerClassNames,
    value,
    defaultValue,
    onChange,
    onCalendarChange,
    disabledDate,
    ranges,
    ...restProps
  } = props
  const lang = i18n.language

  useEffect(() => {
    moment.locale(getMomentLocale(lang))
    dayjs.locale(getMomentLocale(lang))
  }, [lang])

  const convertedPresets = ranges
    ? Object.entries(ranges).map(([label, item]) => {
        if (typeof item === 'function') {
          return {
            label,
            value: () => {
              const result = item()
              return [toDayjs(result[0]), toDayjs(result[1])] as [Dayjs, Dayjs]
            },
          }
        }
        return {
          label,
          value: [toDayjs(item[0]), toDayjs(item[1])] as [Dayjs, Dayjs],
        }
      })
    : undefined

  return (
    <div
      className={classNames(
        styles['yakit-range-picker-wrapper'],
        {
          [styles['yakit-range-picker-wrapper-large']]: size === 'large',
          [styles['yakit-range-picker-wrapper-small']]: size === 'small',
        },
        wrapperClassName,
      )}
      style={{ ...(wrapperStyle || {}) }}
    >
      <RangePicker
        {...restProps}
        value={toDayjsRange(value) as any}
        defaultValue={toDayjsRange(defaultValue) as any}
        presets={convertedPresets}
        onChange={(next, dateString) => {
          onChange?.(next ? [toMoment(next[0]), toMoment(next[1])] : null, dateString)
        }}
        onCalendarChange={(next, dateString, info) => {
          onCalendarChange?.(next ? [toMoment(next[0]), toMoment(next[1])] : [null, null], dateString, info as any)
        }}
        disabledDate={
          disabledDate
            ? (current, info) => (current ? disabledDate(moment(current.valueOf()), info) : false)
            : undefined
        }
        locale={getAntdLocale(lang)}
        suffixIcon={
          <div className={styles['picker-icon']}>
            <OutlineClockIcon />
          </div>
        }
        classNames={{
          ...pickerClassNames,
          popup: {
            ...pickerClassNames?.popup,
            root: classNames(styles['yakit-range-picker-dropdaown'], dropdownClassName, pickerClassNames?.popup?.root),
          },
        }}
        className={classNames(
          styles['yakit-range-picker'],
          {
            [styles['yakit-range-picker-large']]: size === 'large',
            [styles['yakit-range-picker-small']]: size === 'small',
          },
          className,
        )}
      />
    </div>
  )
}

type CompoundedComponent = React.FC<YakitDatePickerProps> & {
  RangePicker: typeof InternalRangePicker
}

/**
 * @description: 日期选择。对外仍使用 moment，内部转换为 antd 5 的 dayjs。
 */
export const YakitDatePicker = InternalDatePicker as CompoundedComponent

YakitDatePicker.RangePicker = InternalRangePicker
