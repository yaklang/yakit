import { DatePicker } from 'antd'
import React, { useEffect } from 'react'
import type { YakitDatePickerProps, YakitRangePickerProps } from './YakitDatePickerType'
import classNames from 'classnames'
import styles from './YakitDatePicker.module.scss'
import { OutlineClockIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import zhCN from 'antd/es/date-picker/locale/zh_CN'
import zhTW from 'antd/es/date-picker/locale/zh_TW'
import enUS from 'antd/es/date-picker/locale/en_US'
import i18n from '@/i18n/i18n'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useControllableValue, useMemoizedFn } from 'ahooks'

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

interface DatePickerExtraFooterProps {
  onNow: () => void
  onOk: () => void
}

const DatePickerExtraFooter: React.FC<DatePickerExtraFooterProps> = React.memo(({ onNow, onOk }) => {
  const { t } = useI18nNamespaces(['yakitUi'])
  return (
    <div className={styles['yakit-date-picker-extra-footer']}>
      <YakitButton type="text" onClick={onNow}>
        {t('YakitDatePicker.now')}
      </YakitButton>
      <YakitButton type="primary" onClick={onOk}>
        {t('YakitDatePicker.confirm')}
      </YakitButton>
    </div>
  )
})

const InternalDatePicker: React.FC<YakitDatePickerProps> = (props) => {
  const {
    size,
    wrapperClassName,
    className,
    dropdownClassName,
    wrapperStyle,
    showExtraFooter,
    renderExtraFooter,
    ...restProps
  } = props
  const lang = i18n.language
  const [currentValue, setCurrentValue] = useControllableValue<moment.Moment | null>(restProps, {
    defaultValue: restProps.defaultValue ?? null,
    // useControllableValue 默认 trigger 为 onChange，但只会传 value；
    // antd DatePicker 的 onChange 签名为 (value, dateString)。
    // 这里禁用自动触发，改由 handleChange 手动调用 restProps.onChange(value, dateString)。
    trigger: 'onInternalValueChange',
  })
  const [currentOpen, setCurrentOpen] = useControllableValue<boolean>(restProps, {
    defaultValue: restProps.defaultOpen ?? false,
    valuePropName: 'open',
    trigger: 'onOpenChange',
  })

  const handleChange = useMemoizedFn((value: moment.Moment | null, dateString: string) => {
    setCurrentValue(value)
    restProps.onChange?.(value, dateString)
  })

  const handleSelect = useMemoizedFn((value: moment.Moment | null) => {
    // showTime 面板中点击时/分列只触发 onSelect 不触发 onChange（原生确定按钮已被隐藏），
    // 这里补提交选中值，保证点“确定”后生效的是面板内最新选择的时间
    if (showExtraFooter && value && !value.isSame(currentValue)) {
      handleChange(value, value.format('YYYY-MM-DD HH:mm'))
    }
    if (!!value) restProps.onSelect?.(value)
  })

  const handleNow = useMemoizedFn(() => {
    const now = moment()
    handleChange(now, now.format('YYYY-MM-DD HH:mm'))
    setCurrentOpen(false)
  })

  const handleOk = useMemoizedFn(() => {
    setCurrentOpen(false)
  })

  useEffect(() => {
    moment.locale(getMomentLocale(lang))
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
        value={currentValue}
        open={currentOpen}
        onChange={handleChange}
        onSelect={handleSelect}
        onOpenChange={setCurrentOpen}
        renderExtraFooter={
          showExtraFooter
            ? renderExtraFooter || (() => <DatePickerExtraFooter onNow={handleNow} onOk={handleOk} />)
            : renderExtraFooter
        }
        locale={getAntdLocale(lang)}
        suffixIcon={
          <div className={styles['picker-icon']}>
            <OutlineClockIcon />
          </div>
        }
        dropdownClassName={classNames(
          styles['yakit-data-picker-dropdaown'],
          { [styles['yakit-date-picker-hide-default-footer']]: showExtraFooter },
          dropdownClassName,
        )}
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
  const { size, wrapperClassName, className, dropdownClassName, wrapperStyle, ...restProps } = props
  const lang = i18n.language

  useEffect(() => {
    moment.locale(getMomentLocale(lang))
  }, [lang])

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
        dropdownClassName={classNames(styles['yakit-range-picker-dropdaown'], { dropdownClassName })}
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
