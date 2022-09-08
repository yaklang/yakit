import React, {useMemo, useState} from "react"
import {Table, Button, Switch, Select, Spin} from "antd"
import {FullscreenOutlined, FullscreenExitOutlined, SearchOutlined} from "@ant-design/icons"
import {CopyableField} from "../../utils/inputUtil"
import {useDebounce, useGetState} from "ahooks"

import "./reverseTable.scss"

const DefaultType: {label: string; value: string}[] = [
    {value: "rmi", label: "RMI连接"},
    {value: "rmi-handshake", label: "RMI握手"},
    {value: "http", label: "HTTP"},
    {value: "https", label: "HTTPS"},
    {value: "tcp", label: "TCP"},
    {value: "tls", label: "TLS"},
    {value: "ldap_flag", label: "LDAP"}
]
const DefaultTypeClassName: {[key: string]: string} = {
    http: "red",
    ldap_flag: "blue",
    rmi: "orange",
    "rmi-handshake": "primary",
    https: "magenta",
    tcp: "purple",
    tls: "volcano"
}

export interface ReverseNotification {
    uuid: string
    type: string
    remote_addr: string
    raw?: Uint8Array
    token?: string
    response_info?: string
    connect_hash: string
    timestamp?: number
}
export interface ReverseTableProps {
    data: ReverseNotification[]
    isExtra: boolean
    setIsExtra: (boolean) => any
    clearData: () => any
}

export const ReverseTable: React.FC<ReverseTableProps> = (props) => {
    const {data, isExtra, setIsExtra, clearData} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [hasToken, setHasToken] = useState<boolean>(false)
    const [types, setTypes, getTypes] = useGetState<string>("")

    let newData: ReverseNotification[] = useMemo(() => {
        setLoading(true)
        let lists = [...data]
        if (hasToken) lists = lists.filter((item) => !!item.token)
        if (types) {
            const typeArr = types.split(",")
            lists = lists.filter((i) => typeArr.includes(i.type))
        }

        setTimeout(() => setLoading(false), 200)
        return lists
    }, [data, hasToken, useDebounce(types, {wait: 1000})])

    return (
        <div className='reverse-table-wrapper'>
            <div className='reverse-table-header'>
                <div className='header-title'>反连列表</div>
                <Spin spinning={!!loading}>
                    <div className='header-extra'>
                        <div className='extra-opt'>
                            <div className='opt-title'>只看Token</div>
                            <Switch checked={hasToken} onChange={(check) => setHasToken(check)} />
                        </div>

                        <div className='extra-opt'>
                            <div className='opt-title'>类型</div>
                            <Select
                                mode='multiple'
                                style={{width: 200}}
                                value={!types ? [] : types.split(",")}
                                allowClear={true}
                                options={DefaultType}
                                onChange={(newValue: string[]) => {
                                    setTypes(newValue.length === 0 ? "" : newValue.join(","))
                                }}
                                maxTagCount='responsive'
                            />
                        </div>
                        <Button className='extra-opt' onClick={clearData}>
                            清空
                        </Button>
                        <Button
                            className='extra-opt'
                            type='link'
                            icon={isExtra ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={() => setIsExtra(!isExtra)}
                        />
                    </div>
                </Spin>
            </div>

            <Table<ReverseNotification>
                dataSource={newData}
                bordered={true}
                pagination={false}
                rowKey={(i) => i.uuid}
                columns={[
                    {
                        width: 120,
                        title: "反连类型",
                        render: (i: ReverseNotification) => {
                            const selectTag = DefaultType.filter((item) => item.value === i.type)
                            let label = ""
                            if (selectTag.length !== 0) label = selectTag[0].label
                            return (
                                <div className={`tag-wrapper tag-${!label ? "blue" : DefaultTypeClassName[i.type]}`}>
                                    {!label ? i.type : label}
                                </div>
                            )
                        },
                        filterIcon: () => <SearchOutlined style={{color: !!getTypes() ? "#1890ff" : undefined}} />,
                        filterDropdown: () => (
                            <div style={{padding: 8}}>
                                <Select
                                    mode='multiple'
                                    style={{width: 200}}
                                    value={!types ? [] : types.split(",")}
                                    allowClear={true}
                                    options={DefaultType}
                                    onChange={(newValue: string[]) =>
                                        setTypes(newValue.length === 0 ? "" : newValue.join(","))
                                    }
                                    maxTagCount='responsive'
                                />
                            </div>
                        )
                    },
                    {
                        title: "连接来源",
                        render: (i: ReverseNotification) => (
                            <CopyableField text={i.remote_addr} noCopy={!i.remote_addr} />
                        )
                    },
                    {
                        title: "TOKEN",
                        render: (i: ReverseNotification) => <CopyableField text={i.token} noCopy={!i.token} />
                    },
                    {
                        title: "响应",
                        render: (i: ReverseNotification) => i.response_info
                    }
                ]}
            ></Table>
        </div>
    )
}
