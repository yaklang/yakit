import {SolidXIcon} from "@/assets/icon/solid"
import classNames from "classnames"
import {getYChangeType} from "../utils/historyPlugin"
import styles from "./YChange.module.scss"
import {YChangeProps} from "./YChangeType"

export const YChange: React.FC<YChangeProps> = (props) => {
    const {user, color, type, diffWrapStyle = {}, diffWrapClassName = ""} = props

    return type ? (
        <>
            <span className='ychange-hover' style={{backgroundColor: color?.dark}}>
                {`${user} ${getYChangeType(type)}`}
            </span>

            <div
                contentEditable={false}
                className={classNames(styles["y-change-diff-history"], diffWrapClassName)}
                style={{backgroundColor: color?.light, ...diffWrapStyle}}
            >
                {type === "removed" && <SolidXIcon />}
            </div>
        </>
    ) : (
        <></>
    )
}
