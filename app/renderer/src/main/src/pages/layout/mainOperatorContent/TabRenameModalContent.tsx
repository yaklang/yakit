import React, {useState} from "react"
import styles from "./TabRenameModalContent.module.scss"
import {RemoveIcon} from "@/assets/newIcon"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

interface TabRenameModalProps {
    title: string
    onClose: () => void
    name: string
    onOk: (s: string) => void
}
const TabRenameModalContent: React.FC<TabRenameModalProps> = React.memo((props) => {
    const {title, onClose, name, onOk} = props
    const [value, setValue] = useState<string>(name)
    return (
        <div className={styles["subMenu-edit-modal"]}>
            <div className={styles["subMenu-edit-modal-heard"]}>
                <div className={styles["subMenu-edit-modal-title"]}>{title}</div>
                <div className={styles["close-icon"]} onClick={() => onClose()}>
                    <RemoveIcon />
                </div>
            </div>
            <div className={styles["subMenu-edit-modal-body"]}>
                <YakitInput.TextArea
                    autoSize={{minRows: 3, maxRows: 3}}
                    showCount
                    value={value}
                    maxLength={50}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        // 限制enter换行
                        const keyCode = e.keyCode ? e.keyCode : e.key
                        if (keyCode === 13) {
                            e.stopPropagation()
                            e.preventDefault()
                        }
                    }}
                />
            </div>
            <div className={styles["subMenu-edit-modal-footer"]}>
                <YakitButton
                    type='outline2'
                    onClick={() => {
                        onClose()
                        setValue("")
                    }}
                >
                    取消
                </YakitButton>
                <YakitButton type='primary' onClick={() => onOk(value)}>
                    确定
                </YakitButton>
            </div>
        </div>
    )
})

export default TabRenameModalContent
