import React, {useEffect, useRef, useState} from "react"
import {Avatar} from "antd"
import {PlusOutlined} from "@ant-design/icons"
import {useGetState} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./HTTPFuzzerEditorMenu.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {DragSortIcon, TrashIcon} from "@/assets/newIcon"
import {YakitSegmented} from "@/components/yakitUI/YakitSegmented/YakitSegmented"
const {ipcRenderer} = window.require("electron")
export interface HTTPFuzzerClickEditorMenuProps {
    close: () => void
}
export const HTTPFuzzerClickEditorMenu: React.FC<HTTPFuzzerClickEditorMenuProps> = (props) => {
    const {close} = props
    const addLabel = () => {
        console.log("addLabel")
    }
    const insertLabel = () => {
        console.log("insertLabel")
        close()
    }
    const delLabel = () => {
        console.log("delLabel")
    }
    return (
        <div className={styles["http-fuzzer-click-editor-menu"]}>
            <div className={styles["menu-header"]}>
                <div className={styles["menu-header-left"]}>
                    常用标签
                    <span className={styles["menu-header-left-count"]}>20</span>
                </div>
                <div className={styles["menu-header-opt"]}>
                    <YakitButton type='text' onClick={() => addLabel()}>
                        添加 <PlusOutlined className={styles["add-icon"]} />
                    </YakitButton>
                </div>
            </div>
            <div className={styles["menu-list"]}>
                <div className={styles["menu-list-item"]} onClick={() => insertLabel()}>
                    <div className={styles["menu-list-item-info"]}>
                        <DragSortIcon className={styles["drag-sort-icon"]} />
                        <div className={styles["title"]}>4 位验证码</div>
                        <div className={styles["sub-title"]}>{`{{int(0000-9999|4)}}`}</div>
                    </div>
                    <div className={styles["menu-list-item-opt"]}>
                        <TrashIcon
                            className={styles["trash-icon"]}
                            onClick={(e) => {
                                e.stopPropagation()
                                delLabel()
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export interface DecodeComponentProps {}
interface decodeDataProps {
    color: string
    avatar: string
    title: string
    sub_title: string
}
export const DecodeComponent: React.FC<DecodeComponentProps> = (props) => {
    const decodeData = useRef<decodeDataProps[]>([
        {
            color: "rgba(136, 99, 247, 0.6)",
            avatar: "m",
            title: "Md5 编码",
            sub_title: "md5"
        }
    ])
    return (
        <div className={styles["decode-box"]}>
            {decodeData.current.map((item) => {
                return (
                    <div className={styles["decode-item"]}>
                        <Avatar size={16} style={{color: "rgba(49, 52, 63, 1)", backgroundColor: item.color}}>
                            {item.avatar}
                        </Avatar>
                        <div className={styles["title"]}>{item.title}</div>
                        <div className={styles["sub-title"]}>{item.sub_title}</div>
                    </div>
                )
            })}
        </div>
    )
}

export interface EncodeComponentProps {}
export const EncodeComponent: React.FC<EncodeComponentProps> = (props) => {
    return <div className={styles["encode-box"]}></div>
}

export interface HTTPFuzzerRangeEditorMenuProps {}
export const HTTPFuzzerRangeEditorMenu: React.FC<HTTPFuzzerRangeEditorMenuProps> = (props) => {
    const [segmentedType, setSegmentedType] = useState<"decode" | "encode">("decode")
    return (
        <div className={styles["http-fuzzer-range-editor-menu"]}>
            <div className={styles["menu-header"]}>
                <YakitSegmented
                    className={styles["segmented-type"]}
                    value={segmentedType}
                    onChange={(v) => {
                        // @ts-ignore
                        setSegmentedType(v)
                    }}
                    options={[
                        {
                            label: "编码",
                            value: "decode"
                        },
                        {
                            label: "智能解码",
                            value: "encode"
                        }
                    ]}
                />
            </div>
            <div className={styles["menu-content"]}>
                {segmentedType === "decode" ? <DecodeComponent /> : <EncodeComponent />}
            </div>
        </div>
    )
}
