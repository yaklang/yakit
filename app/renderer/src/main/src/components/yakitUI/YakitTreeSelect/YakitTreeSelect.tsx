import type React from 'react'
import TreeSelect, { type TreeSelectProps } from 'antd/lib/tree-select'
import classNames from 'classnames'
import styles from './YakitTreeSelect.module.scss'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'

export interface YakitTreeSelectProp extends TreeSelectProps {
  wrapperClassName?: string
}
export const YakitTreeSelect: React.FC<YakitTreeSelectProp> = (props) => {
  const { wrapperClassName, dropdownClassName, ...resetProps } = props

  return (
    <div className={classNames(styles['yakit-tree-select-wrapper'], wrapperClassName)}>
      <TreeSelect
        dropdownClassName={classNames(styles['yakit-tree-select-dropdown'], dropdownClassName)}
        switcherIcon={
          <ChevronDownOutlined className={styles['yakit-tree-select-switcher-icon']} color="currentColor" />
        }
        {...resetProps}
      ></TreeSelect>
    </div>
  )
}
