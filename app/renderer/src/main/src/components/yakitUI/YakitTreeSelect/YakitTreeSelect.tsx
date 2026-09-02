import type React from 'react'
import { TreeSelect, type TreeSelectProps } from 'antd'
import classNames from 'classnames'
import styles from './YakitTreeSelect.module.scss'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'

export interface YakitTreeSelectProp extends TreeSelectProps {
  wrapperClassName?: string
}
export const YakitTreeSelect: React.FC<YakitTreeSelectProp> = (props) => {
  const {
    wrapperClassName,
    dropdownClassName,
    classNames: treeClassNames,
    dropdownRender,
    popupRender,
    onDropdownVisibleChange,
    onOpenChange,
    ...resetProps
  } = props

  return (
    <div className={classNames(styles['yakit-tree-select-wrapper'], wrapperClassName)}>
      <TreeSelect
        {...resetProps}
        switcherIcon={
          <ChevronDownOutlined className={styles['yakit-tree-select-switcher-icon']} color="currentColor" />
        }
        classNames={{
          ...treeClassNames,
          popup: {
            ...treeClassNames?.popup,
            root: classNames(styles['yakit-tree-select-dropdown'], dropdownClassName, treeClassNames?.popup?.root),
          },
        }}
        popupRender={popupRender ?? dropdownRender}
        onOpenChange={(open) => {
          onOpenChange?.(open)
          onDropdownVisibleChange?.(open)
        }}
      />
    </div>
  )
}
