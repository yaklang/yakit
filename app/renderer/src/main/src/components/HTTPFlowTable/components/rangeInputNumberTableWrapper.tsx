import React, { useRef, useState } from 'react'
import { Divider } from 'antd'
import { useInViewport, useMemoizedFn, useUpdateEffect } from 'ahooks'
import classNames from 'classnames'
import { OutlineArrownarrowdownIcon, OutlineArrownarrowupIcon, OutlineFilterIcon } from '@/assets/icon/outline'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { RangeInputNumberTableWrapperProps } from '../HTTPFlowTable.constants'
import RangeInputNumberTable from './rangeInputNumberTable'
import style from '../HTTPFlowTable.module.scss'

export const RangeInputNumberTableWrapper: React.FC<RangeInputNumberTableWrapperProps> = React.memo((props) => {
  const ref = useRef<HTMLDivElement>(null)
  const {
    showSort = false,
    bodyLengthSort,
    onBodyLengthSort,
    checkBodyLength,
    onCheckThan0,
    minNumber,
    maxNumber,
    onSure,
    onReset,
    ...reset
  } = props
  const { t, i18n } = useI18nNamespaces(['history', 'yakitUi'])
  const [show, setShow] = useState<boolean>(false)

  // valueChanged判断用户输入值 点击其他区域触发筛选列表
  const [_, setValueChanged, getValueChanged] = useGetSetState<boolean>(false)

  const onChangeValued = useMemoizedFn(() => {
    setValueChanged(true)
  })

  const [inViewport] = useInViewport(ref)

  useUpdateEffect(() => {
    if (!inViewport && getValueChanged()) {
      onSure?.()
    }
    !inViewport && setShow(false)
  }, [inViewport])

  return (
    <div
      className={style['rangeInputNumberTableWrapper']}
      style={{ padding: show ? undefined : '0 8px 8px' }}
      ref={ref}
    >
      {show ? (
        <RangeInputNumberTable
          {...reset}
          minNumber={minNumber}
          maxNumber={maxNumber}
          onSure={() => {
            setValueChanged(false)
            onSure?.()
          }}
          onReset={() => {
            setValueChanged(false)
            onReset?.()
          }}
          onChangeValued={onChangeValued}
        />
      ) : (
        <>
          {showSort && (
            <>
              <div
                className={classNames(style['body-length-filter'], {
                  [style['body-length-filter-active']]: bodyLengthSort === 'asc',
                })}
                onClick={() => {
                  onBodyLengthSort?.('asc')
                }}
              >
                <OutlineArrownarrowupIcon className={style['outlineFilterIcon']} /> {t('YakitTable.asc')}
              </div>
              <div
                className={classNames(style['body-length-filter'], {
                  [style['body-length-filter-active']]: bodyLengthSort === 'desc',
                })}
                onClick={() => {
                  onBodyLengthSort?.('desc')
                }}
              >
                <OutlineArrownarrowdownIcon className={style['outlineFilterIcon']} /> {t('YakitTable.desc')}
              </div>
            </>
          )}
          <div
            className={classNames(style['body-length-filter'], {
              [style['body-length-filter-active']]: typeof minNumber === 'number' || typeof maxNumber === 'number',
            })}
            onClick={() => {
              setShow(true)
            }}
          >
            <OutlineFilterIcon className={style['outlineFilterIcon']} /> {t('RangeInputNumberTableWrapper.filter')}
          </div>
          <Divider style={{ margin: '4px 0' }}></Divider>
          <div className={style['body-length-checkbox']}>
            <span className={style['tip']}>{t('RangeInputNumberTableWrapper.greaterThanZeroOnly')}</span>
            <YakitCheckbox checked={checkBodyLength} onChange={(e) => onCheckThan0(e.target.checked)} />
          </div>
        </>
      )}
    </div>
  )
})

RangeInputNumberTableWrapper.displayName = 'RangeInputNumberTableWrapper'

export default RangeInputNumberTableWrapper
