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
        showByCursorMenu(
            {
                content: [
                    {title: "分享当前 Web Fuzzer", onClick: getValue},
                    {title: "导入 Web Fuzzer", onClick: onImportShare}
                ]
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
            <Modal title='分享' visible={isModalVisible} onCancel={handleCancel} footer={null}>
                <div className='content-value'>
                    <span className='label-text'>设置有效期：</span>
                    <Radio.Group
                        disabled={disabled}
                        value={expiredTime}
                        onChange={(e) => setExpiredTime(e.target.value)}
                    >
                        <Radio.Button value={5}>5分钟</Radio.Button>
                        <Radio.Button value={15}>15分钟</Radio.Button>
                        <Radio.Button value={60}>1小时</Radio.Button>
                        <Radio.Button value={1440}>1天</Radio.Button>
                    </Radio.Group>
                </div>
                <div className='content-value'>
                    <span className='label-text'>密码：</span>
                    <Switch disabled={disabled} checked={pwd} onChange={(checked) => setPwd(checked)} />
                </div>
                <div className='content-value'>
                    <span className='label-text'>限制分享次数：</span>
                    <Switch disabled={disabled} checked={shareNumber} onChange={(checked) => setShareNumber(checked)} />
                    &emsp;
                    {shareNumber && (
                        <InputNumber
                            min={1}
                            value={limit_num}
                            onChange={(v) => setLimit_num(v as number)}
                            size='small'
                            formatter={(value) => `${value}次`}
                        />
                    )}
                </div>
                {shareResData.share_id && (
                    <div className='content-value'>
                        <span className='label-text'>分享id：</span>
                        <span>
                            <CopyableField text={shareResData.share_id}></CopyableField>
                        </span>
                    </div>
                )}
                {shareResData.extract_code && (
                    <div className='content-value'>
                        <span className='label-text'>密码：</span>
                        <span>{shareResData.extract_code}</span>
                    </div>
                )}
                <div className='btn-footer'>
                    <Button type='primary' onClick={onShare} loading={shareLoading} disabled={disabled}>
                        生成分享密令
                    </Button>
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
                            <Button type={disabled ? "primary" : "default"}>复制分享</Button>
                        </CopyToClipboard>
                    )}
                </div>
            </Modal>
        </>
    )
}
