import React, {useEffect, useRef, useState} from "react"
import styles from "./TabRenameModalContent.module.scss"
import {RemoveIcon} from "@/assets/newIcon"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {TextAreaRef} from "antd/lib/input/TextArea"
import {useControllableValue, useMemoizedFn} from "ahooks"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {QueryFuzzerConfigRequest} from "./utils"
import {APIFunc} from "@/apiUtils/type"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {getRemoteValue} from "@/utils/kv"
import {GlobalConfigRemoteGV} from "@/enums/globalConfig"
import {yakitNotify} from "@/utils/notification"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
interface TabRenameModalProps {
    title: string
    onClose: () => void
    name: string
    onOk: (s: string) => void
}
const TabRenameModalContent: React.FC<TabRenameModalProps> = React.memo((props) => {
    const {title, onClose, name, onOk} = props
    const {t} = useI18nNamespaces(["layout"])
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
                    {t("TabRenameModalContent.cancel")}
                </YakitButton>
                <YakitButton type='primary' onClick={() => onOk(value)}>
                    {t("TabRenameModalContent.confirm")}
                </YakitButton>
            </div>
        </div>
    )
})

export default TabRenameModalContent

export type RecoveryModel = "coverage" | "new"
interface RestoreTabContentProps {
    setRecoveryModel: React.Dispatch<React.SetStateAction<RecoveryModel>>
    setSecondaryTabsNum: React.Dispatch<React.SetStateAction<number>>
    onClose: () => void
    onRestore: APIFunc<QueryFuzzerConfigRequest, null>
}
export const RestoreTabContent: React.FC<RestoreTabContentProps> = React.memo((props) => {
    const {setRecoveryModel, onClose, onRestore} = props
    const {t} = useI18nNamespaces(["layout"])
    const [number, setNumber] = useState<number>(20)
    const [loading, setLoading] = useState<boolean>(false)
    const onOK = useMemoizedFn(() => {
        if (number > secondaryTabsNum) {
            yakitNotify("info", t("TabRenameModalContent.restoreLimitExceeded", {count: number}))
            return
        }
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
    const [secondaryTabsNum, setSecondaryTabsNum] = useControllableValue<number>(props, {
        defaultValue: 100,
        valuePropName: "secondaryTabsNum",
        trigger: "setSecondaryTabsNum"
    })
    useEffect(() => {
        getRemoteValue(GlobalConfigRemoteGV.SecondaryTabsNum).then((set) => {
            if (set) {
                setSecondaryTabsNum(Number(set))
            }
        })
    }, [])
    return (
        <div className={styles["restore-tab-content"]}>
            <div className={styles["item"]}>
                <span>{t("TabRenameModalContent.restoreRecent")}</span>
                <YakitInputNumber
                    min={1}
                    max={secondaryTabsNum}
                    style={{width: 350}}
                    value={number}
                    onChange={(v) => setNumber(v as number)}
                />
                <span>{t("TabRenameModalContent.tabPage")}</span>
            </div>
            <div className={styles["item-tip"]}>{t("TabRenameModalContent.restoreLimitExceeded", {count: secondaryTabsNum})}</div>
            <div className={styles["item"]}>
                <span>{t("TabRenameModalContent.restoreMode")}</span>
                <YakitRadioButtons
                    buttonStyle='solid'
                    defaultValue='coverage'
                    options={[
                        {value: "coverage", label: t("TabRenameModalContent.overwriteCurrentTab")},
                        {value: "new", label: t("TabRenameModalContent.addRestoreTab")}
                    ]}
                    onChange={(e) => {
                        setRecoveryModel(e.target.value)
                    }}
                ></YakitRadioButtons>
            </div>
            <div className={styles["footer"]}>
                <YakitButton type='outline2' onClick={onClose}>
                    {t("TabRenameModalContent.cancel")}
                </YakitButton>
                <YakitButton type='primary' onClick={onOK} loading={loading}>
                    {t("TabRenameModalContent.confirm")}
                </YakitButton>
            </div>
        </div>
    )
})
