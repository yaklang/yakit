import type React from 'react'
import { memo } from 'react'
import { Form } from 'antd'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import type { ItemRadioProps } from './RadioAndCheckboxtype'

import '../demoStyle.scss'

const { Item } = Form

/** @name 表单项-单选按钮组 */
export const DemoItemRadioButton: React.FC<ItemRadioProps> = memo((p) => {
  const { label, help, formItemStyle, required, disabled, size, value, setValue, data } = p

  return (
    <Item label={label} help={help} style={{ ...formItemStyle }} required={required}>
      <YakitRadioButtons
        className="demo-item-radio-button-wrapper"
        disabled={disabled}
        size={size}
        value={value}
        onChange={(e) => setValue && setValue(e.target.value)}
        buttonStyle="solid"
        options={data}
      />
    </Item>
  )
})
