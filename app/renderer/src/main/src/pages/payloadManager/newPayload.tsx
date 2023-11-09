import React, {useEffect, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./NewPayload.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineClouddownloadIcon} from "@/assets/icon/outline"
import {OutlineAddPayloadIcon} from "./icon"
const {ipcRenderer} = window.require("electron")

export interface NewPayloadTableProps {}
export const NewPayloadTable: React.FC<NewPayloadTableProps> = (props) => {
    return <div className={styles["new-payload-table"]}></div>
}

export interface NewPayloadListProps {}
export const NewPayloadList: React.FC<NewPayloadListProps> = (props) => {
    return <div className={styles["new-payload-list"]}></div>
}

export interface NewPayloadProps {}
export const NewPayload: React.FC<NewPayloadProps> = (props) => {
    return (
        <div className={styles["new-payload"]}>
            <YakitEmpty
                style={{paddingTop: 48}}
                title='暂无 Payload 字典'
                description='可一键获取官方内置字典，或新建字典'
                children={
                    <>
                        <YakitButton style={{marginRight: 8}} type='outline1' icon={<OutlineClouddownloadIcon />}>
                            一键获取
                        </YakitButton>
                        <YakitButton icon={<OutlineAddPayloadIcon />}>新建字典</YakitButton>
                    </>
                }
            />
        </div>
    )
}
