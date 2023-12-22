import React, {useEffect, useRef, useState} from "react"
import {Checkbox, Input} from "antd"
import {DownOutlined} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./NewCodecUIStore.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {CheckboxValueType} from "antd/lib/checkbox/Group"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {OutlineSearchIcon} from "@/assets/icon/outline"
const {ipcRenderer} = window.require("electron")
export interface NewCodecInputUIProps {
    extra?: React.ReactNode
    // 是否仅可读
    readOnly?: boolean
    // 是否为必填
    require?: boolean
    // 左右布局时 border圆角方向
    direction?: "left" | "right"
}
export const NewCodecInputUI: React.FC<NewCodecInputUIProps> = (props) => {
    const {extra, readOnly, require, direction} = props
    const inputRef = useRef<any>(null)
    const onFocusInput = useMemoizedFn(() => {
        if (inputRef.current) {
            console.log("onFocusInput", inputRef.current)
            inputRef.current.focus()
        }
    })
    return (
        <div
            className={classNames(styles["new-codec-input-ui"], {
                [styles["new-codec-left-border-input-ui"]]: direction === "left"
            })}
            onClick={onFocusInput}
        >
            <div className={styles["main"]}>
                <div className={styles["header"]}>
                    <div className={styles["title"]}>校验规则</div>
                    {require && <div className={styles["icon"]}>*</div>}
                </div>
                {readOnly ? (
                    <div className={styles["read-only"]}>A-Za-z0-9+/=</div>
                ) : (
                    <div className={styles["content"]}>
                        {/* 此处使用Input而不使用YakitInput原因为ref无法获取 */}
                        <Input ref={inputRef} placeholder='请输入...' />
                    </div>
                )}
            </div>
            {extra && <div className={styles["extra"]}>{extra}</div>}
        </div>
    )
}

export interface NewCodecCheckUIProps {}
export const NewCodecCheckUI: React.FC<NewCodecCheckUIProps> = (props) => {
    const onChange = (checkedValues: CheckboxValueType[]) => {}
    return (
        <div className={styles["new-codec-check-ui"]}>
            <Checkbox.Group
                // value={[]}
                onChange={onChange}
            >
                {["严格校验", "自动丢弃不合规片段"].map((item) => (
                    <YakitCheckbox key={item} value={item}>
                        <div className={styles["text"]}>{item}</div>
                    </YakitCheckbox>
                ))}
            </Checkbox.Group>
        </div>
    )
}

export interface NewCodecSelectUIProps {
    // 标题
    title?: string
    // 是否为必填
    require?: boolean
    // 是否可搜索
    showSearch?: boolean
    // 左右布局时 border圆角方向
    direction?: "left" | "right"
}
// 当前控件样式仅适配此尺寸 - 如需更多尺寸请扩展
export const NewCodecSelectUI: React.FC<NewCodecSelectUIProps> = (props) => {
    const {require, title, showSearch, direction} = props
    const [show, setShow] = useState<boolean>(false)
    return (
        <div
            className={classNames(styles["new-codec-select-ui"], {
                [styles["new-codec-title-select-ui"]]: title,
                [styles["new-codec-no-title-select-ui"]]: !title,
                [styles["new-codec-search-select-ui"]]: showSearch,
                [styles["new-codec-right-border-select-ui"]]: direction === "right"
            })}
        >
            {title && (
                <div className={styles["header"]}>
                    <div className={styles["title"]}>{title}</div>
                    {require && <div className={styles["icon"]}>*</div>}
                </div>
            )}
            <YakitSelect
                showSearch={showSearch}
                // value={"B"}
                onSelect={(val) => {}}
                placeholder='请选择...'
                suffixIcon={
                    showSearch ? (
                        <div className={styles["search-icon"]}>
                            <OutlineSearchIcon />
                            {/* <DownOutlined /> */}
                        </div>
                    ) : undefined
                }
                onDropdownVisibleChange={(v) => setShow(v)}
                // wrapperClassName={style["unit-select"]}
            >
                <YakitSelect value='B'>B</YakitSelect>
                <YakitSelect value='K'>
                    KdsffffffffffffffffffssssssssssssssssssKdsffffffffffffffffffssssssssssssssssssKdsffffffffffffffffffssssssssssssssssssKdsffffffffffffffffffssssssssssssssssssKdsffffffffffffffffffssssssssssssssssss
                </YakitSelect>
                <YakitSelect value='M'>M</YakitSelect>
            </YakitSelect>
        </div>
    )
}
