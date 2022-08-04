import React, {ReactNode} from "react"
import {GithubOutlined, QqOutlined, WechatOutlined, SearchOutlined} from "@ant-design/icons"
import "./index.scss"

const PlatformIcon: {[key: string]: ReactNode} = {
    github: <GithubOutlined />,
    wechat: <WechatOutlined />,
    qq: <QqOutlined />
}

export const OnlineUserItem = (props) => {
    const {info} = props
    return (
        <div className='select-opt'>
            <img src={info.head_img} className='opt-img' />
            <div className='opt-author'>
                <div className='author-name content-ellipsis'>{info.name}</div>
                <div className='author-platform'>{PlatformIcon[info.from_platform]}</div>
            </div>
        </div>
    )
}
