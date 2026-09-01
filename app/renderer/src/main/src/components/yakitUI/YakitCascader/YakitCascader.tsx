import { Cascader, type CascaderAutoProps } from 'antd'
import classNames from 'classnames'
import styles from './YakitCascader.module.scss'
import type { BaseOptionType, DefaultOptionType } from 'antd/lib/cascader'

const YakitCascader = <OptionType extends DefaultOptionType | BaseOptionType = DefaultOptionType>(
  props: CascaderAutoProps<OptionType>,
) => {
  const {
    classNames: cascaderClassNames,
    dropdownClassName,
    dropdownRender,
    popupRender,
    onDropdownVisibleChange,
    onOpenChange,
    ...restProps
  } = props
  return (
    <div className={styles['yakit-cascader']}>
      <Cascader
        {...restProps}
        classNames={{
          ...cascaderClassNames,
          popup: {
            ...cascaderClassNames?.popup,
            root: classNames(styles['yakit-cascader-popup'], dropdownClassName, cascaderClassNames?.popup?.root),
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

export default YakitCascader
