import React, {useEffect, useRef, useState} from "react"
import {Button, Modal, Radio} from "antd"
import {ShareIcon} from "@/assets/icons"
import {useMemoizedFn} from "ahooks"
import {useStore} from "@/store"
import {warn} from "@/utils/notification"
import "./index.scss"

interface ShareData {
    module: string //路由的key值
    getShareContent: (callback: any) => void
}

interface ShareDataResProps {
    share_id: string
    extract_code: string
}

export const ShareData: React.FC<ShareData> = (props) => {
    const {getShareContent, module} = props
    const [shareContent, setShareContent] = useState<string>()
    const [expiredTime, setExpiredTime] = useState<number>(3)
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false)
    const [shareResData, setShareResData] = useState<ShareDataResProps>()
    // 全局监听登录状态
    const {userInfo} = useStore()
    const getValue = useMemoizedFn(() => {
        // if (!userInfo.isLogin) {
        //     warn("请先登录")
        //     return
        // }
        getShareContent((content) => {
            console.log("content", content)
            setShareContent(JSON.stringify(content))
            setIsModalVisible(true)
        })
    })
    const handleCancel = () => {
        setIsModalVisible(false)
    }
    const onShare = useMemoizedFn(() => {
        const params = {
            expired_time: expiredTime,
            share_content: shareContent,
            module
        }
        setTimeout(() => {
            setShareResData({
                share_id: "5550",
                extract_code: "888"
            })
        }, 2000)
        console.log("params", params)
    })
    return (
        <>
            <Button type='primary' size='small' icon={<ShareIcon />} onClick={getValue}>
                分享
            </Button>
            <Modal title='分享' visible={isModalVisible} onCancel={handleCancel} footer={null}>
                <div className='content-value'>
                    <span className='label'>设置有效期：</span>
                    <Radio.Group value={expiredTime} onChange={(e) => setExpiredTime(e.target.value)}>
                        <Radio.Button value={1}>1天</Radio.Button>
                        <Radio.Button value={3}>3天</Radio.Button>
                        <Radio.Button value={5}>5天</Radio.Button>
                        <Radio.Button value={7}>7天</Radio.Button>
                    </Radio.Group>
                </div>
                {shareResData && (
                    <>
                        <div className='content-value'>
                            <span className='label'>分享id：</span>
                            <span>{shareResData.share_id}</span>
                        </div>
                        <div className='content-value'>
                            <span className='label'>密码：</span>
                            <span>{shareResData.extract_code}</span>
                        </div>
                    </>
                )}
                <div className='btn-footer'>
                    <Button type='primary' onClick={onShare}>
                        生成分享密令
                    </Button>
                </div>
            </Modal>
        </>
    )
}
