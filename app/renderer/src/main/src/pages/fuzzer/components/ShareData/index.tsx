import React, {useEffect, useRef, useState} from "react"
import {Button, Modal, Radio, Switch, InputNumber} from "antd"
import {useMemoizedFn, useHover} from "ahooks"
import {useStore} from "@/store"
import {warn, success, failed} from "@/utils/notification"
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

interface ShareDataProps {
    module: string // 新建tab类型
    getShareContent: (callback: any) => void
}

export const ShareData: React.FC<ShareDataProps> = (props) => {
    const {getShareContent, module} = props
    const [shareContent, setShareContent] = useState<string>("")
    const [expiredTime, setExpiredTime] = useState<number>(15)
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false)
    const [shareLoading, setShareLoading] = useState<boolean>(false)
    const [pwd, setPwd] = useState<boolean>(false)
    const [shareNumber, setShareNumber] = useState<boolean>(false)
    const [limit_num, setLimit_num] = useState<number>(1)

    const [shareResData, setShareResData] = useState<API.ShareResponse>({
        share_id: "",
        extract_code: ""
    })
    const getValue = useMemoizedFn(() => {
        setShareLoading(false)
        getShareContent((content) => {
            setShareContent(JSON.stringify(content))
            setIsModalVisible(true)
        })
    })
    const handleCancel = () => {
        setShareResData({
            share_id: "",
            extract_code: ""
        })
        setIsModalVisible(false)
        setExpiredTime(15)
        setPwd(false)
        setShareNumber(false)
        setLimit_num(1)
    }
    const onShare = useMemoizedFn(() => {
        const params: API.ShareRequest = {
            expired_time: expiredTime,
            share_content: shareContent,
            module,
            pwd
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
                failed("分享失败：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setShareLoading(false)
                }, 200)
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

    const disabled = !!shareResData?.share_id

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
            <YakitModal title='分享' visible={isModalVisible} onCancel={handleCancel} footer={null} closable={true}>
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
            </YakitModal>
        </>
    )
}
