import React from 'react'
import { Input } from 'antd'
import { FooterBottom } from '@/components/TableVirtualResize/TableVirtualResize'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import type { RangeInputNumberProps } from '../HTTPFlowTable.constants'
import style from '../HTTPFlowTable.module.scss'

export const RangeInputNumberTable: React.FC<RangeInputNumberProps> = React.memo((props) => {
  const { minNumber, setMinNumber, maxNumber, setMaxNumber, extra, onReset, onSure, showFooter, onChangeValued } = props
  return (
    <div className={style['table-body-length-filter']}>
      <Input.Group compact size="small" className={style['input-group']}>
        <YakitInputNumber
          className={style['input-left']}
          placeholder="Minimum"
          min={0}
          value={minNumber}
          onChange={(v) => {
            if (setMinNumber) setMinNumber(v as number)
            onChangeValued?.()
          }}
          size="small"
        />
        <div className={style['input-split']}>~</div>
        <YakitInputNumber
          className={style['input-right']}
          placeholder="Maximum"
          min={minNumber}
          value={maxNumber}
          onChange={(v) => {
            if (setMaxNumber) setMaxNumber(v as number)
            onChangeValued?.()
          }}
          size="small"
        />
        {extra}
      </Input.Group>
      {showFooter !== false && (
        <FooterBottom
          className={style['input-footer']}
          onReset={() => {
            if (onReset) onReset()
          }}
          onSure={() => {
            if (onSure) onSure()
          }}
        />
      )}
    </div>
  )
})

RangeInputNumberTable.displayName = 'RangeInputNumberTable'

export default RangeInputNumberTable
