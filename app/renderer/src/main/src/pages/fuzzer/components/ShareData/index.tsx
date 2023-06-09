import React, {useEffect, useRef, useState} from "react"
import {Button, Modal, Radio, Switch, InputNumber} from "antd"
import {useMemoizedFn, useHover} from "ahooks"
import {useStore} from "@/store"
import {warn, success, failed, yakitNotify} from "@/utils/notification"
import CopyToClipboard from "react-copy-to-clipboard"
import styles from "./index.module.scss"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {CopyableField} from "@/utils/inputUtil"
import {showByCursorMenu} from "@/utils/showByCursor"
import {onImportShare} from "@/pages/fuzzer/components/ShareImport"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ShareIcon} from "@/assets/newIcon"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {HTTPFlowsShareRequest, HTTPFlowsShareResponse, ShareDataProps} from "./shareDataType"
import {Route} from "@/routes/routeSpec"
import {isCommunityEdition} from "@/utils/envfile"

const {ipcRenderer} = window.require("electron")

export const ShareData: React.FC<ShareDataProps> = (props) => {
    const {getShareContent, module} = props
    const getValue = useMemoizedFn(() => {
        getShareContent((content) => {
            const m = showYakitModal({
                title: "导入分享数据",
                content: <ShareModal module={module} shareContent={JSON.stringify(content)} />,
                footer: null
            })
        })
    })

    const rightClick = useMemoizedFn((e: {clientX: number; clientY: number}) => {
        showByRightContext(
            {
                width: 150,
                data: [
                    {key: "share", label: "分享当前 Web Fuzzer"},
                    {key: "import", label: "导入 Web Fuzzer"}
                ],
                onClick: ({key}) => {
                    switch (key) {
                        case "share":
                            getValue()
                            break
                        case "import":
                            onImportShare()
                            break
                        default:
                            break
                    }
                }
            },
            e.clientX,
            e.clientY
        )
    })

    return (
        <>
            <YakitButton
                style={{padding: "4px 0px"}}
                type='text'
                icon={<ShareIcon className={styles["share-icon"]} />}
                onClick={rightClick}
                onContextMenuCapture={rightClick}
            >
                分享 / 导入
            </YakitButton>
        </>
    )
}

interface ShareModalProps {
    module: string
    shareContent: string
}
export const ShareModal: React.FC<ShareModalProps> = React.memo((props) => {
    const {module, shareContent} = props
    const [expiredTime, setExpiredTime] = useState<number>(15)
    const [pwd, setPwd] = useState<boolean>(false)
    const [shareNumber, setShareNumber] = useState<boolean>(false)
    const [limit_num, setLimit_num] = useState<number>(1)
    const [shareResData, setShareResData] = useState<API.ShareResponse>({
        share_id: "",
        extract_code: ""
    })

    const [shareLoading, setShareLoading] = useState<boolean>(false)
    const {userInfo} = useStore()
    /**
     * @description 一般分享，无特殊处理情况，例如web Fuzzer
     */
    const onShareOrdinary = useMemoizedFn(() => {
        const params: API.ShareRequest = {
            expired_time: expiredTime,
            share_content: shareContent,
            module,
            pwd,
            token: userInfo.token
        }
        if (shareNumber) {
            params.limit_num = limit_num
        }
        if (shareResData.share_id) {
            params.share_id = shareResData.share_id
        }

        setShareLoading(true)
        NetWorkApi<API.ShareRequest, API.ShareResponse>({
            url: "module/share",
            method: "post",
            data: params
        })
            .then((res) => {
                setShareResData({
                    ...res
                })
            })
            .catch((err) => {
                yakitNotify("error", "分享失败：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setShareLoading(false)
                }, 200)
            })
    })
    const onShareHttpHistory = useMemoizedFn(() => {
        try {
            if (!isCommunityEdition() && !userInfo.token) {
                yakitNotify("error", "请登录后分享")
                return
            }
            const ids = JSON.parse(shareContent)

            const shareHttpHistoryParams: HTTPFlowsShareRequest = {
                Ids: ids,
                ExpiredTime: expiredTime,
                Pwd: pwd,
                Token: userInfo.token,
                Module: module
            }
            if (shareNumber) {
                shareHttpHistoryParams.LimitNum = limit_num
            }
            if (shareResData.share_id) {
                shareHttpHistoryParams.ShareId = shareResData.share_id
            }
            console.log('shareHttpHistoryParams',shareHttpHistoryParams)
            setShareLoading(true)
            ipcRenderer
                .invoke("HTTPFlowsShare", shareHttpHistoryParams)
                .then((res: HTTPFlowsShareResponse) => {
                    console.log("res", res)
                    setShareResData({
                        share_id: res.ShareId,
                        extract_code: res.ExtractCode
                    })
                })
                .catch((err) => {
                    console.log("err", err)
                    yakitNotify("error", "分享失败:" + err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setShareLoading(false)
                    }, 200)
                })
        } catch (error) {
            yakitNotify("error", "分享数据转换失败:" + error)
        }
    })
    const onShare = useMemoizedFn(() => {
        switch (module) {
            case Route.HTTPHacker:
                onShareHttpHistory()
                break
            default:
                onShareOrdinary()
                break
        }
    })
    const disabled = !!shareResData?.share_id
    return (
        <div style={{padding: 24}}>
            <div className={styles["content-value"]}>
                <span className={styles["label-text"]}>设置有效期：</span>
                <YakitRadioButtons
                    disabled={disabled}
                    value={expiredTime}
                    onChange={(e) => setExpiredTime(e.target.value)}
                    options={[
                        {
                            label: "5分钟",
                            value: 5
                        },
                        {
                            label: "15分钟",
                            value: 15
                        },
                        {
                            label: "1小时",
                            value: 60
                        },
                        {
                            label: "1天",
                            value: 1440
                        }
                    ]}
                />
            </div>
            <div className={styles["content-value"]}>
                <span className={styles["label-text"]}>密码：</span>
                <YakitSwitch disabled={disabled} checked={pwd} onChange={(checked) => setPwd(checked)} />
            </div>
            <div className={styles["content-value"]}>
                <span className={styles["label-text"]}>限制分享次数：</span>
                <YakitSwitch
                    disabled={disabled}
                    checked={shareNumber}
                    onChange={(checked) => setShareNumber(checked)}
                />
                &emsp;
                {shareNumber && (
                    <YakitInputNumber
                        min={1}
                        value={limit_num}
                        onChange={(v) => setLimit_num(v as number)}
                        size='small'
                        formatter={(value) => `${value}次`}
                        disabled={disabled}
                    />
                )}
            </div>
            {shareResData.share_id && (
                <div className={styles["content-value"]}>
                    <span className={styles["label-text"]}>分享id：</span>
                    <span className={styles["display-flex"]}>
                        {shareResData.share_id} <CopyComponents copyText={shareResData.share_id} />
                    </span>
                </div>
            )}
            {shareResData.extract_code && (
                <div className={styles["content-value"]}>
                    <span className={styles["label-text"]}>密码：</span>
                    <span>{shareResData.extract_code}</span>
                </div>
            )}
            <div className={styles["btn-footer"]}>
                <YakitButton type='primary' onClick={onShare} loading={shareLoading} disabled={disabled}>
                    生成分享密令
                </YakitButton>
                {shareResData.share_id && (
                    <CopyToClipboard
                        text={
                            shareResData.extract_code
                                ? `${shareResData.share_id}\r\n密码：${shareResData.extract_code}`
                                : `${shareResData.share_id}`
                        }
                        onCopy={(text, ok) => {
                            if (ok) success("已复制到粘贴板")
                        }}
                    >
                        <YakitButton type={disabled ? "primary" : "outline1"}>复制分享</YakitButton>
                    </CopyToClipboard>
                )}
            </div>
        </div>
    )
})
