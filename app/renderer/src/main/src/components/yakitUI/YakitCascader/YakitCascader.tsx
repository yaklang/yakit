import React from 'react'
import { Cascader } from 'antd'
import styles from './YakitCascader.module.scss'
import classNames from 'classnames'

type YakitCascaderProps = React.ComponentProps<typeof Cascader>

const YakitCascader = (props: YakitCascaderProps) => {
  return (
    <div className={styles['yakit-cascader']}>
      <Cascader
        {...props}
        classNames={{
          popup: {
            root: classNames(styles['yakit-cascader-popup'], props.classNames?.popup?.root),
          },
        }}
      />
    </div>
  )
}

export default YakitCascader
