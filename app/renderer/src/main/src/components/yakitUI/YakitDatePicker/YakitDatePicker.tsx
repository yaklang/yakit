import { DatePicker } from 'antd'
import React from 'react'
import { YakitDatePickerProps, YakitRangePickerProps } from './YakitDatePickerType'
import classNames from 'classnames'
import styles from './YakitDatePicker.module.scss'
import { OutlineClockIcon } from '@/assets/icon/outline'
import zhCN from 'antd/es/date-picker/locale/zh_CN'
import zhTW from 'antd/es/date-picker/locale/zh_TW'
import enUS from 'antd/es/date-picker/locale/en_US'
import i18n from '@/i18n/i18n'

import moment from 'moment'
import 'moment/locale/zh-cn'
import 'moment/locale/zh-tw'
import 'moment/locale/en-gb'

const { RangePicker } = DatePicker

// 语言到 antd locale 的映射
const antdLocaleMap: Record<string, any> = {
  zh: zhCN,
  'zh-TW': zhTW,
  en: enUS,
}

// 语言到 moment locale 的映射
const momentLocaleMap: Record<string, string> = {
  zh: 'zh-cn',
  'zh-TW': 'zh-tw',
  en: 'en-gb',
}

const getAntdLocale = (lang: string) => antdLocaleMap[lang] ?? zhCN
const getMomentLocale = (lang: string) => momentLocaleMap[lang] ?? 'zh-cn'

const InternalDatePicker: React.FC<YakitDatePickerProps> = (props) => {
  const { size, wrapperClassName, className, popupClassName, wrapperStyle, ...restProps } = props
  const lang = i18n.language

  // 设置 moment 语言
  moment.locale(getMomentLocale(lang))

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
        locale={getAntdLocale(lang)}
        suffixIcon={
          <div className={styles['picker-icon']}>
            <OutlineClockIcon />
          </div>
        }
        popupClassName={classNames(styles['yakit-data-picker-dropdaown'], { popupClassName })}
        className={classNames(styles['yakit-picker'], {
          [styles['yakit-picker-large']]: size === 'large',
          [styles['yakit-picker-small']]: size === 'small',
          className,
        })}
      />
    </div>
  )
}

const InternalRangePicker: React.FC<YakitRangePickerProps> = (props) => {
  const { size, wrapperClassName, className, popupClassName, wrapperStyle, ...restProps } = props
  const lang = i18n.language

  moment.locale(getMomentLocale(lang))

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
        locale={getAntdLocale(lang)}
        suffixIcon={
          <div className={styles['picker-icon']}>
            <OutlineClockIcon />
          </div>
        }
        popupClassName={classNames(styles['yakit-range-picker-dropdaown'], { popupClassName })}
        className={classNames(styles['yakit-range-picker'], {
          [styles['yakit-range-picker-large']]: size === 'large',
          [styles['yakit-range-picker-small']]: size === 'small',
          className,
        })}
      />
    </div>
  )
}

type CompoundedComponent = React.ForwardRefExoticComponent<YakitDatePickerProps> & {
  RangePicker: typeof InternalRangePicker
}

/**
 * @description: 日期选择
 * @augments DatePickerProps 继承antd的DatePicker默认属性
 */
export const YakitDatePicker = InternalDatePicker as CompoundedComponent

YakitDatePicker.RangePicker = InternalRangePicker
