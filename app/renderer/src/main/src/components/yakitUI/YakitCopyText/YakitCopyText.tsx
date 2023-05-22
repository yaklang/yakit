import styles from "./YakitCopyText.module.scss"
import {CopyComponents} from "../YakitTag/YakitTag"
import {YakitCopyTextProps} from "./YakitCopyTextPropsType"

export const YakitCopyText: React.FC<YakitCopyTextProps> = (props) => {
    const {showText, copyText, iconColor, onAfterCopy} = props

    return (
        <div className={styles["yakit-copy-text"]}>
            <span>{showText}</span>
            <CopyComponents iconColor={iconColor} onAfterCopy={onAfterCopy} copyText={copyText || showText} />
        </div>
    )
}
