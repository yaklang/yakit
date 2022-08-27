import React, {useEffect, useRef, useState} from "react"
import {Button, Modal, Radio, Switch, Tooltip} from "antd"
import {ShareIcon} from "@/assets/icons"
import {useMemoizedFn, useHover} from "ahooks"
import {useStore} from "@/store"
import {warn, success, failed} from "@/utils/notification"
import CopyToClipboard from "react-copy-to-clipboard"
import "./index.scss"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {CopyableField} from "@/utils/inputUtil";
import {showByCursorMenu} from "@/utils/showByCursor";
import {onImportShare} from "@/pages/fuzzer/components/ShareImport";

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
    }
    const onShare = useMemoizedFn(() => {
        const params: API.ShareRequest = {
            expired_time: expiredTime,
            share_content: shareContent,
            module,
            pwd
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
    return (
        <>
            <Tooltip title={"左键设置参数，右键可通过ID导入资源"}>
                <Button type='default' icon={<ShareIcon/>} onClick={getValue} onContextMenuCapture={e => {
                    showByCursorMenu({
                        content: [
                            {
                                title: "通过 ID 导入资源", onClick: () => {
                                    onImportShare()
                                }
                            },
                            {title: "通过 ID 分享资源", onClick: getValue}
                        ],
                    }, e.clientX, e.clientY)
                }}>
                    分享
                </Button>
            </Tooltip>
            <Modal title='分享' visible={isModalVisible} onCancel={handleCancel} footer={null}>
                <div className='content-value'>
                    <span className='label-text'>设置有效期：</span>
                    <Radio.Group value={expiredTime} onChange={(e) => setExpiredTime(e.target.value)}>
                        <Radio.Button value={5}>5分钟</Radio.Button>
                        <Radio.Button value={15}>15分钟</Radio.Button>
                        <Radio.Button value={60}>1小时</Radio.Button>
                        <Radio.Button value={1440}>1天</Radio.Button>
                    </Radio.Group>
                </div>
                <div className='content-value'>
                    <span className='label-text'>密码：</span>
                    <Switch checked={pwd} onChange={(checked) => setPwd(checked)}/>
                </div>
                {shareResData.share_id && (
                    <div className='content-value'>
                        <span className='label-text'>分享id：</span>
                        <span><CopyableField text={shareResData.share_id}></CopyableField></span>
                    </div>
                )}
                {shareResData.extract_code && (
                    <div className='content-value'>
                        <span className='label-text'>密码：</span>
                        <span>{shareResData.extract_code}</span>
                    </div>
                )}
                <div className='btn-footer'>
                    <Button type='primary'
                            onClick={onShare} loading={shareLoading}
                            disabled={!!shareResData?.share_id}
                    >
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
                            <Button type={!!shareResData?.share_id ? "primary" : "default"}>复制分享</Button>
                        </CopyToClipboard>
                    )}
                </div>
            </Modal>
        </>
    )
}
