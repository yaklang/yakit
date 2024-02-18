import React from "react"
import {Button, Col, Row, Checkbox} from "antd"
import {useGetState} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {SelectIcon} from "@/assets/icons"
import {yakitNotify} from "@/utils/notification"

import "../YakitStorePage.scss"

interface PluginGroupPostProps {
    groupName: string[]
    pluginUuid?: string[]
    pluginWhere?: API.GetPluginWhere
}

const setPluginGroup = (obj, onRefList, onClose, msg) => {
    NetWorkApi<PluginGroupPostProps, API.ActionSucceeded>({
        method: "post",
        url: "yakit/plugin/group",
        data: obj
    })
        .then((res) => {
            if (res.ok) {
                yakitNotify("success", msg)
                onRefList()
                onClose()
            }
        })
        .catch((err) => {})
}

export const RemovePluginGroup: React.FC<SetPluginGroupProps> = (props) => {
    const {selectedRowKeysRecordOnline, onRefList, onClose, queryOnline, isSelectAllOnline} = props

    const selectItemType: string[] = Array.from(
        new Set(
            selectedRowKeysRecordOnline
                .map((item) => (item.group ? JSON.parse(item.group) : []))
                .reduce((pre, current) => {
                    return [...pre, ...current]
                }, [])
        )
    )

    const filterNonUnique = (arr) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))

    const [_, setSelectItem, getSelectItem] = useGetState<string[]>(selectItemType)

    const submit = () => {
        let obj: PluginGroupPostProps = {
            groupName: []
        }
        obj.groupName = [...getSelectItem()].filter((item) => item !== "漏洞扫描")
        obj.pluginWhere = {...queryOnline, bind_me: false}
        // 全选
        if (!isSelectAllOnline) {
            obj.pluginUuid = selectedRowKeysRecordOnline.map((item) => item.uuid)
        }
        setPluginGroup(obj, onRefList, onClose, "编辑分组成功")
    }
    return (
        <div>
            <div>编辑分组</div>
            <div style={{fontSize: 12, color: "gray", marginBottom: 10}}>已勾选的分组为当前所在分组</div>
            <div style={{display: "flex", justifyContent: "flex-start", flexWrap: "wrap"}}>
                {pluginGroupArr.map((item) => (
                    <div
                        style={{
                            width: 130,
                            position: "relative",
                            margin: "0 20px 10px 0",
                            padding: "10px 22px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            border: "1px solid rgba(0,0,0,.06)",
                            borderRadius: "2px",
                            textAlign: "center"
                        }}
                    >
                        {item}
                        <SelectIcon
                            //  @ts-ignore
                            className={`icon-select  ${getSelectItem().includes(item) && "icon-select-active"}`}
                            onClick={(e) => {
                                e.stopPropagation()
                                setSelectItem(filterNonUnique([...getSelectItem(), item]))
                            }}
                        />
                    </div>
                ))}
            </div>
            <div style={{textAlign: "center", marginTop: 10}}>
                <Button
                    onClick={(e) => {
                        e.stopPropagation()
                        submit()
                    }}
                    type='primary'
                >
                    确定
                </Button>
            </div>
        </div>
    )
}

interface SetPluginGroupProps {
    selectedRowKeysRecordOnline: API.YakitPluginDetail[]
    isSelectAllOnline: boolean
    queryOnline: API.GetPluginWhere
    onClose: () => void
    onRefList: () => void
}
const pluginGroupArr: string[] = [
    "基础扫描",
    "操作系统类漏洞",
    "WEB中间件漏洞",
    "WEB应用漏洞",
    "网络安全设备漏洞",
    "OA产品漏洞",
    "CMS产品漏洞",
    "弱口令",
    "CVE合规漏洞"
]
export const AddPluginGroup: React.FC<SetPluginGroupProps> = (props) => {
    const {selectedRowKeysRecordOnline, isSelectAllOnline, queryOnline, onClose, onRefList} = props
    const [_, setGroupName, getGroupName] = useGetState<string[]>([])

    const submit = () => {
        let obj: PluginGroupPostProps = {
            groupName: []
        }
        obj.groupName = [...getGroupName()]
        obj.pluginWhere = {...queryOnline, bind_me: false}
        // 全选
        if (!isSelectAllOnline) {
            obj.pluginUuid = selectedRowKeysRecordOnline.map((item) => item.uuid)
        }
        setPluginGroup(obj, onRefList, onClose, "加入分组成功")
    }
    const onChange = (checkedValues) => {
        setGroupName(checkedValues)
    }
    return (
        <div>
            <div>加入分组</div>
            <div style={{fontSize: 12, color: "gray"}}>可选择加入多个分组</div>
            <Checkbox.Group style={{width: "100%"}} onChange={onChange}>
                <Row>
                    {pluginGroupArr.map((item) => (
                        <Col span={8} style={{marginTop: 10}}>
                            <Checkbox value={item} key={item}>
                                {item}
                            </Checkbox>
                        </Col>
                    ))}
                </Row>
                {/* <div style={{display: "flex", flexDirection: "row", marginTop: 10}}>
                    <div style={{paddingRight: 16}}>扫描模式</div>
                    <div style={{flex: 1}}>
                        <Row>
                            <Col span={8}>
                                <Checkbox value='基础扫描'>基础扫描</Checkbox>
                            </Col>
                            <Col span={8}>
                                <Checkbox value='深度扫描'>深度扫描</Checkbox>
                            </Col>
                        </Row>
                    </div>
                </div>
                <div style={{display: "flex", flexDirection: "row", marginTop: 10}}>
                    <div style={{paddingRight: 16}}>功能类型</div>
                    <div style={{flex: 1}}>
                        <Row>
                            <Col span={8}>
                                <Checkbox value='弱口令'>弱口令</Checkbox>
                            </Col>
                            <Col span={8}>
                                <Checkbox value='网络设备扫描'>网络设备扫描</Checkbox>
                            </Col>
                            <Col span={8}>
                                <Checkbox value='合规检测'>合规检测</Checkbox>
                            </Col>
                        </Row>
                    </div>
                </div> */}
            </Checkbox.Group>
            <div style={{textAlign: "center", marginTop: 10}}>
                <Button
                    onClick={(e) => {
                        e.stopPropagation()
                        submit()
                    }}
                    type='primary'
                    disabled={getGroupName().length === 0}
                >
                    确定
                </Button>
            </div>
        </div>
    )
}
