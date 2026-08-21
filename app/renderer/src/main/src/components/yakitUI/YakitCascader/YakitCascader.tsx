import { Cascader, type CascaderProps } from 'antd'
import classNames from 'classnames'
import styles from './YakitCascader.module.scss'

const YakitCascader = (props: CascaderProps) => {
  const { classNames: cascaderClassNames, dropdownClassName, dropdownRender, popupRender, ...restProps } = props
  return (
    <div className={styles['yakit-cascader']}>
      <Cascader
        {...(restProps as CascaderProps<any, any, any>)}
        classNames={{
          ...cascaderClassNames,
          popup: {
            ...cascaderClassNames?.popup,
            root: classNames(styles['yakit-cascader-popup'], dropdownClassName, cascaderClassNames?.popup?.root),
          },
        }}
        popupRender={popupRender ?? dropdownRender}
      />
    </div>
  )
}

export default YakitCascader
