import React, {useEffect, useRef, useState} from "react"
import styles from "./TabRenameModalContent.module.scss"
import {RemoveIcon} from "@/assets/newIcon"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {TextAreaRef} from "antd/lib/input/TextArea"
import {useMemoizedFn} from "ahooks"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {QueryFuzzerConfigRequest} from "./utils"
import {APIFunc} from "@/apiUtils/type"
import {genDefaultPagination} from "@/pages/invoker/schema"
interface TabRenameModalProps {
    title: string
    onClose: () => void
    name: string
    onOk: (s: string) => void
}
const TabRenameModalContent: React.FC<TabRenameModalProps> = React.memo((props) => {
    const {title, onClose, name, onOk} = props
    const [value, setValue] = useState<string>(name)
    const textareaRef = useRef<TextAreaRef>(null)
    useEffect(() => {
        if (textareaRef.current) {
            const textArea = textareaRef.current.resizableTextArea?.textArea
            if (textArea) {
                // textArea.focus();
                textArea.select()
            }
        }
    }, [])
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
                    ref={textareaRef}
                    autoSize={{minRows: 3, maxRows: 3}}
                    isShowResize={false}
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

interface RestoreTabContentProps {
    onClose: () => void
    onRestore: APIFunc<QueryFuzzerConfigRequest, null>
}
export const RestoreTabContent: React.FC<RestoreTabContentProps> = React.memo((props) => {
    const {onClose, onRestore} = props
    const [number, setNumber] = useState<number>(20)
    const [loading, setLoading] = useState<boolean>(false)
    const onOK = useMemoizedFn(() => {
        setLoading(true)
        const query: QueryFuzzerConfigRequest = {
            Pagination: {
                ...genDefaultPagination(),
                Limit: number
            }
        }
        onRestore(query).finally(() => {
            setTimeout(() => {
                setLoading(false)
            }, 200)
            onClose()
        })
    })
    return (
        <div className={styles["restore-tab-content"]}>
            <div className={styles["item"]}>
                <span>恢复最近</span>
                <YakitInputNumber
                    min={1}
                    max={100}
                    style={{width: 350}}
                    value={number}
                    onChange={(v) => setNumber(v as number)}
                />
                <span>个标签页</span>
            </div>
            <div className={styles["item-tip"]}>恢复标签页不能超过100个</div>
            <div className={styles["footer"]}>
                <YakitButton type='outline2' onClick={onClose}>
                    取消
                </YakitButton>
                <YakitButton type='primary' onClick={onOK} loading={loading}>
                    确定
                </YakitButton>
            </div>
        </div>
    )
})
