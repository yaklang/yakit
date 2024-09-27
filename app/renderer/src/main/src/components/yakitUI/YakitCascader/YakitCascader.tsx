import {Cascader, CascaderProps} from "antd"
import styles from "./YakitCascader.module.scss"
import {BaseOptionType, DefaultOptionType} from "antd/lib/cascader"

type YakitCascaderProps<OptionType> = CascaderProps<OptionType> & {}
const YakitCascader = <OptionType extends DefaultOptionType | BaseOptionType = DefaultOptionType>(
    props: YakitCascaderProps<OptionType>
) => {
    return (
        <div className={styles['yakit-cascader']}>
            <Cascader {...props} dropdownClassName={styles["yakit-cascader-popup"]} />
        </div>
    )
}

export default YakitCascader
