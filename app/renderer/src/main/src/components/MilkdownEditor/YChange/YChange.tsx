import {SolidXIcon} from "@/assets/icon/solid"
import classNames from "classnames"
import {getYChangeType} from "../utils/historyPlugin"
import styles from "./YChange.module.scss"
import {YChangeProps} from "./YChangeType"

export const YChange: React.FC<YChangeProps> = (props) => {
    const {user, color, type} = props

    return user ? (
        <>
            <span className='ychange-hover' style={{backgroundColor: color?.dark}}>
                {`${user} ${getYChangeType(type)}`}
            </span>

            <div
                contentEditable={false}
                className={classNames(styles["y-change-diff-history"])}
                style={{backgroundColor: color?.light}}
            >
                {type === "removed" && <SolidXIcon />}
            </div>
        </>
    ) : (
        <></>
    )
}
