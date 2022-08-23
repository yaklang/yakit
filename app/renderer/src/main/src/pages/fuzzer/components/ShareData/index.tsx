import React, {useEffect, useRef, useState} from "react"
import {Button, Modal, Radio} from "antd"
import {ShareIcon} from "@/assets/icons"
import {useMemoizedFn, useHover} from "ahooks"
import {useStore} from "@/store"
import {warn, success} from "@/utils/notification"
import CopyToClipboard from "react-copy-to-clipboard"
import "./index.scss"

interface ShareDataProps {
    module: string //路由的key值
    getShareContent: (callback: any) => void
}

export interface ShareDataResProps {
    share_id: string
    extract_code: string
}

export const ShareData: React.FC<ShareDataProps> = (props) => {
    const {getShareContent, module} = props
    const [shareContent, setShareContent] = useState<string>()
    const [expiredTime, setExpiredTime] = useState<number>(3)
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false)
    const [shareLoading, setShareLoading] = useState<boolean>(false)
    const [shareResData, setShareResData] = useState<ShareDataResProps>()

    // 全局监听登录状态
    const {userInfo} = useStore()
    const getValue = useMemoizedFn(() => {
        // if (!userInfo.isLogin) {
        //     warn("请先登录")
        //     return
        // }
        getShareContent((content) => {
            setShareContent(JSON.stringify(content))
            setIsModalVisible(true)
        })
    })
    const handleCancel = () => {
        setShareResData(undefined)
        setIsModalVisible(false)
    }
    const onShare = useMemoizedFn(() => {
        const params = {
            expired_time: expiredTime,
            share_content: shareContent,
            module
        }
        // console.log("params", params)
        setShareLoading(true)
        setTimeout(() => {
            setShareResData({
                share_id: "5550",
                extract_code: "888"
            })
            setShareLoading(false)
        }, 2000)
    })
    return (
        <>
            <Button type='primary' size='small' icon={<ShareIcon />} onClick={getValue}>
                分享
            </Button>
            <Modal title='分享' visible={isModalVisible} onCancel={handleCancel} footer={null}>
                <div className='content-value'>
                    <span className='label-text'>设置有效期：</span>
                    <Radio.Group value={expiredTime} onChange={(e) => setExpiredTime(e.target.value)}>
                        <Radio.Button value={3}>3天</Radio.Button>
                        <Radio.Button value={5}>5天</Radio.Button>
                        <Radio.Button value={7}>7天</Radio.Button>
                    </Radio.Group>
                </div>
                {shareResData && (
                    <>
                        <div className='content-value'>
                            <span className='label-text'>分享id：</span>
                            <span>{shareResData.share_id}</span>
                        </div>
                        <div className='content-value'>
                            <span className='label-text'>密码：</span>
                            <span>{shareResData.extract_code}</span>
                        </div>
                    </>
                )}
                <div className='btn-footer'>
                    <Button type='primary' onClick={onShare} loading={shareLoading}>
                        生成分享密令
                    </Button>
                    {shareResData && (
                        <CopyToClipboard
                            text={`分享id：${shareResData.share_id}\r\n密码：${shareResData.extract_code}`}
                            onCopy={(text, ok) => {
                                if (ok) success("已复制到粘贴板")
                            }}
                        >
                            <Button>复制分享</Button>
                        </CopyToClipboard>
                    )}
                </div>
            </Modal>
        </>
    )
}
