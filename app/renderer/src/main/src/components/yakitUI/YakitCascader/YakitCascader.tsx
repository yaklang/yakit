import React from 'react'
import { Cascader } from 'antd'
import styles from './YakitCascader.module.scss'

type YakitCascaderProps = React.ComponentProps<typeof Cascader>

const YakitCascader = (props: YakitCascaderProps) => {
  return (
    <div className={styles['yakit-cascader']}>
      <Cascader {...props} dropdownClassName={styles['yakit-cascader-popup']} />
    </div>
  )
}

export default YakitCascader
