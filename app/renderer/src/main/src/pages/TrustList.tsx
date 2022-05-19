import React, {memo, ReactNode, useEffect, useRef, useState} from "react"
import {Button, Input, List, Tag} from "antd"
import {GithubOutlined, QqOutlined, WechatOutlined, SearchOutlined} from "@ant-design/icons"
import {ItemSelects} from "@/components/baseTemplate/FormItemUtil"

import "./TrustList.scss"
import {useMemoizedFn} from "ahooks"

const {ipcRenderer} = window.require("electron")

const PlatformIcon: {[key: string]: ReactNode} = {
    git: <GithubOutlined />,
    wechat: <WechatOutlined />,
    qq: <QqOutlined />
}

export interface TrustListProp {}
interface UserInfoProps{
    id:number
    head_img:string
    from_platform:string
    user_verbose:string
}


export const TrustList: React.FC<TrustListProp> = memo((props) => {
    const [userList, setUserList] = useState()

    const getUserList = useMemoizedFn((str: string) => {
        ipcRenderer
            .invoke("fetch-user-list", {keywords: str})
            .then((res) => {
                console.log(123, res)
            })
            .catch((err) => {})
        // .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const getTrustUserList = useMemoizedFn(() => {
        const param = {
            page: 1,
            limit: 20,
            keywords: "all"
        }

        ipcRenderer
            .invoke("fetch-trust-user-list", param)
            .then((res) => {
                console.log(321, JSON.parse(res.from))
            })
            .catch((err) => {})
        // .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        // getUserList()
        getTrustUserList()
    }, [])

    return (
        <div className='trust-list-container'>
            <div className='add-account-body'>
                <span>添加用户</span>
                <ItemSelects
                    isItem={false}
                    select={{
                        size: "small",
                        style: {width: 360},
                        className: "add-select",
                        allowClear: true,
                        data: [
                            {
                                name: "123123123123123123123123123123123123123123123123123123123123123123123123",
                                type: "git",
                                img: "https://profile-avatar.csdnimg.cn/87dc7bdc769b44fd9b82afb51946be1a_freeb1rd.jpg"
                            },
                            {
                                name: "321",
                                type: "wechat",
                                img: "https://profile-avatar.csdnimg.cn/87dc7bdc769b44fd9b82afb51946be1a_freeb1rd.jpg"
                            },
                            {
                                name: "132",
                                type: "qq",
                                img: "https://profile-avatar.csdnimg.cn/87dc7bdc769b44fd9b82afb51946be1a_freeb1rd.jpg"
                            }
                        ],
                        optValue: "name",
                        placeholder: "请输入完整的用户名",
                        optionLabelProp: "name",
                        value: undefined,
                        onChange: (value, option: any) => {},
                        onSearch: getUserList,
                        renderOpt: (info) => {
                            return (
                                <div className='select-opt'>
                                    <div>
                                        <img src={info.img} className='opt-img' />
                                    </div>

                                    <div className='opt-author'>
                                        <div className='author-name content-ellipsis'>{info.name}</div>
                                        <div className='author-platform'>{PlatformIcon[info.type]}</div>
                                    </div>
                                </div>
                            )
                        }
                    }}
                ></ItemSelects>
                <Button className='add-btn' size='small' type='primary'>
                    添加
                </Button>
            </div>

            <div className='added-account-body'>
                <div className='added-header'>
                    <span className='header-title'>信任用户列表</span>
                    <Input.Group style={{width: 390}} className='header-input' compact>
                        <Input
                            style={{width: 360}}
                            size='small'
                            placeholder='请输入完整的用户名'
                            allowClear={true}
                            onChange={(e) => {}}
                        ></Input>
                        <Button size='small' icon={<SearchOutlined />} />
                    </Input.Group>
                </div>

                <div className='added-list'>
                    <List
                        grid={{gutter: 12, column: 4}}
                        dataSource={[
                            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
                            26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41
                        ]}
                        pagination={{
                            size: "small",
                            current: 1,
                            pageSize: 50,
                            showSizeChanger: false,
                            total: 23,
                            showTotal: (total, rang) => <Tag>{`Total ${23}`}</Tag>,
                            onChange: (page, pageSize) => {}
                        }}
                        renderItem={(item, index) => {
                            return (
                                <List.Item key={item}>
                                    <div className='list-opt'>
                                        <div>
                                            <img
                                                src='https://profile-avatar.csdnimg.cn/87dc7bdc769b44fd9b82afb51946be1a_freeb1rd.jpg'
                                                className='opt-img'
                                            />
                                        </div>
                                        <div className='opt-author'>
                                            <div className='author-name content-ellipsis' title={"dadqdwqfqfq123123"}>
                                                dadqdwqfqfq123123
                                            </div>
                                            <div className='author-icon'>
                                                {PlatformIcon[["git", "qq", "wechat"][index % 3]]}
                                            </div>
                                        </div>
                                        <div>
                                            <Button className='opt-remove' type='link' danger onClick={() => {}}>
                                                移除
                                            </Button>
                                        </div>
                                    </div>
                                </List.Item>
                            )
                        }}
                    ></List>
                </div>
            </div>
        </div>
    )
})
