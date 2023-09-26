import {OutlineRefreshIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {useNetwork, useMemoizedFn} from "ahooks"
import React, {forwardRef, useState, useImperativeHandle, useEffect, useMemo} from "react"
import {OnlineJudgmentProps, OnlineResponseStatusProps} from "./OnlineJudgmentType"
import Online from "../online/online.png"
import styles from "./OnlineJudgment.module.scss"
import axios from "axios"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export const OnlineJudgment: React.FC<OnlineJudgmentProps> = React.memo(
    forwardRef((props, ref) => {
        const networkState = useNetwork()
        const [initLoading, setInitLoading] = useState<boolean>(true)
        const [loading, setLoading] = useState<boolean>(true)
        const [onlineResponseStatus, setOnlineResponseStatus] = useState<OnlineResponseStatusProps>({
            code: 200,
            message: ""
        })

        useImperativeHandle(
            ref,
            () => {
                return {
                    onlineResponseStatus
                }
            },
            [onlineResponseStatus]
        )

        useEffect(() => {
            if (networkState.online) {
                getNetWork()
            } else {
                setInitLoading(false)
                setLoading(false)
                setOnlineResponseStatus({
                    code: -1,
                    message: ""
                })
            }
        }, [networkState.online])

        const getNetWork = useMemoizedFn(() => {
            setLoading(true)
            ipcRenderer
                .invoke("fetch-netWork-status-by-request-interface")
                .then((res) => {
                    if (res.code === -1) {
                        yakitNotify("error", res.message)
                    }
                    setOnlineResponseStatus({
                        code: res.code,
                        message: res.message || ""
                    })
                })
                .catch((error) => {
                    yakitNotify("error", error)
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                        setInitLoading(false)
                    }, 200)
                )
        })
        const errorNode = useMemo(() => {
            switch (onlineResponseStatus.code) {
                case 500:
                    break
                case 502:
                    break
                case 401:
                    break
                case 200:
                    break
                default:
                    return (
                        <YakitEmpty
                            image={<img src={Online} alt='' />}
                            imageStyle={{width: 300, height: 210, marginBottom: 16}}
                            title='请检查私有域配置与网络连接'
                            description='连网后才可访问 Yakit 插件商店'
                        />
                    )
            }
        }, [onlineResponseStatus])
        return initLoading ? (
            <YakitSpin wrapperClassName={styles["online-spin"]} />
        ) : (
            <>
                {onlineResponseStatus.code !== -1 ? (
                    props.children
                ) : (
                    <YakitSpin spinning={loading}>
                        <div className={styles["online-network"]}>
                            {errorNode}
                            <YakitButton
                                className={styles["refresh-button"]}
                                type='outline1'
                                icon={<OutlineRefreshIcon />}
                                onClick={getNetWork}
                            >
                                刷新页面
                            </YakitButton>
                        </div>
                    </YakitSpin>
                )}
            </>
        )
    })
)
