import React, {useEffect, useState, useRef, ReactNode, useMemo} from "react"
import {
    Button,
    Col,
    Empty,
    Form,
    Input,
    List,
    Popconfirm,
    Row,
    Space,
    Tag,
    Tooltip,
    Progress,
    Spin,
    Select,
    Checkbox,
    Dropdown,
    AutoComplete,
    Menu,
    Popover
} from "antd"
import {
    LoadingOutlined,
    FilterOutlined,
    LockOutlined,
    PlusOutlined,
    DeleteOutlined,
    DownloadOutlined,
    PoweroffOutlined,
    CloseOutlined,
    DownOutlined
} from "@ant-design/icons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {UserInfoProps, useStore} from "@/store"
import {useGetState, useMemoizedFn, useDebounce} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {randomString} from "@/utils/randomUtil"
import {findDOMNode} from "react-dom"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {setTimeout} from "timers"
import {isEnpriTraceAgent, isEnterpriseEdition} from "@/utils/envfile"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {ItemSelects} from "@/components/baseTemplate/FormItemUtil"
import {ChevronDownIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {OnlineCloudIcon, SelectIcon, OfficialYakitLogoIcon} from "@/assets/icons"
import {YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {yakitNotify} from "@/utils/notification"
import {showModal} from "@/utils/showModal"
import {formatDate} from "@/utils/timeUtil"
import {DownloadOnlinePluginProps} from "../YakitPluginInfoOnline/YakitPluginInfoOnline"
import {PluginGV} from "@/pages/plugins/builtInData"

import style from "@/components/HTTPFlowTable/HTTPFlowTable.module.scss"
import "../YakitStorePage.scss"

const {Search} = Input
const {Option} = Select
const {ipcRenderer} = window.require("electron")
interface SearchPluginOnlineRequest extends API.GetPluginWhere {
    order_by: string
    order?: string
    page?: number
    limit?: number
}

interface TagsAndType {
    Value: string
    Total: number
}
const typeOnline = "yak,mitm,packet-hack,port-scan,codec,nuclei"
const defQueryOnline: SearchPluginOnlineRequest = {
    keywords: "",
    order_by: "created_at",
    order: "desc",
    plugin_type: typeOnline,
    page: 1,
    limit: 20,
    status: "",
    bind_me: false,
    is_private: "",
    tags: "",
    recycle: false,
    user_id: 0,
    time_search: ""
}

const statusType = {
    "0": "待审核",
    "1": "审核通过",
    "2": "审核不通过"
}

interface YakFilterModuleSelectProps {
    selectedTags: string[]
    setSelectedTags: (v: string[]) => void
}

interface TagValue {
    Name: string
    Total: number
}

// 封装动态select筛选组件
const YakFilterModuleSelect: React.FC<YakFilterModuleSelectProps> = (props) => {
    const {selectedTags, setSelectedTags} = props
    const [allTag, setAllTag] = useState<TagValue[]>([])
    // 下拉框选中tag值
    const selectRef = useRef(null)
    // 用于存储 tag 的搜索与结果
    const [topTags, setTopTags] = useState<TagValue[]>([])
    const [itemSelects, setItemSelects] = useState<string[]>([])
    // 设置本地搜索 tags 的状态
    const [searchTag, setSearchTag] = useState("")
    const [topN, setTopN] = useState(15)
    // 设置最大最小值
    const [minTagWeight, setMinTagWeight] = useState(1)
    const [maxTagWeight, setMaxTagWeight] = useState(2000)
    // 辅助变量
    const [updateTagsSelectorTrigger, setUpdateTagsSelector] = useState(false)

    const [selectLoading, setSelectLoading] = useState<boolean>(true)

    useEffect(() => {
        setTimeout(() => setSelectLoading(false), 300)
    }, [selectLoading])

    useEffect(() => {
        ipcRenderer
            .invoke("GetYakScriptTags", {})
            .then((res) => {
                setAllTag(res.Tag.map((item) => ({Name: item.Value, Total: item.Total})))
            })
            .catch((e) => console.info(e))
            .finally(() => {})
    }, [])

    useEffect(() => {
        let count = 0
        const showTags = allTag.filter((d) => {
            if (
                count <= topN && // 限制数量
                d.Total >= minTagWeight &&
                d.Total <= maxTagWeight &&
                !selectedTags.includes(d.Name) &&
                d.Name.toLowerCase().includes(searchTag.toLowerCase()) // 设置搜索结果
            ) {
                count++
                return true
            }
            return false
        })
        setTopTags([...showTags])
    }, [
        allTag,
        useDebounce(minTagWeight, {wait: 500}),
        useDebounce(maxTagWeight, {wait: 500}),
        useDebounce(searchTag, {wait: 500}),
        useDebounce(selectedTags, {wait: 500}),
        useDebounce(topN, {wait: 500}),
        updateTagsSelectorTrigger
    ])

    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <Spin spinning={selectLoading}>{originNode}</Spin>
            </div>
        )
    })
    return (
        <ItemSelects
            item={{}}
            select={{
                ref: selectRef,
                className: "div-width-100",
                allowClear: true,
                autoClearSearchValue: false,
                maxTagCount: "responsive",
                mode: "multiple",
                size: "small",
                data: topTags,
                optValue: "Name",
                optionLabelProp: "Name",
                renderOpt: (info: TagValue) => {
                    return (
                        <div style={{display: "flex", justifyContent: "space-between"}}>
                            <span>{info.Name}</span>
                            <span>{info.Total}</span>
                        </div>
                    )
                },
                value: itemSelects, // selectedTags
                onSearch: (keyword: string) => setSearchTag(keyword),
                setValue: (value) => {
                    setItemSelects(value)
                },
                onDropdownVisibleChange: (open) => {
                    if (open) {
                        setItemSelects([])
                        setSearchTag("")
                    } else {
                        const filters = itemSelects.filter((item) => !selectedTags.includes(item))
                        setSelectedTags(selectedTags.concat(filters))
                        setItemSelects([])
                        setSearchTag("")
                    }
                },
                onPopupScroll: (e) => {
                    const {target} = e
                    const ref: HTMLDivElement = target as unknown as HTMLDivElement
                    if (ref.scrollTop + ref.offsetHeight + 20 >= ref.scrollHeight) {
                        setSelectLoading(true)
                        setTopN(topN + 10)
                    }
                },
                dropdownRender: (originNode: React.ReactNode) => selectDropdown(originNode)
            }}
        />
    )
}

interface TagsProps {
    Value: string
    Total: number
}

interface YakFilterModuleList {
    TYPE?: string
    tag: string[]
    searchType: string
    setTag: (v: string[]) => void
    tagsLoading?: boolean
    refresh: boolean
    setRefresh: (v: boolean) => void
    onDeselect: () => void
    tagsList?: TagsProps[]
    setSearchType: (v: any) => void
    setSearchKeyword: (v: string) => void
    checkAll: boolean
    checkList: string[]
    multipleCallBack: (v: string[]) => void
    onCheckAllChange: (v: any) => void
    setCheckAll?: (v: boolean) => void
    commonTagsSelectRender?: boolean
    TagsSelectRender?: () => any
    settingRender?: () => any
}

const YakFilterModuleList: React.FC<YakFilterModuleList> = (props) => {
    const {
        // 控件来源
        TYPE,
        // 当前为tags或者input
        searchType,
        // 更改tags或者input回调
        setSearchType,
        // tags更改回调函数
        setTag,
        // tags控件加载控件
        tagsLoading = false,
        // 获取boolean用于更新列表
        refresh,
        // 更新函数
        setRefresh,
        // tags清空的回调函数
        onDeselect,
        // tag 选中的value值
        tag,
        // 展示的tag list
        tagsList = [],
        // input输入框回调
        setSearchKeyword,
        // 是否全选
        checkAll,
        // 全选回调MITM
        onCheckAllChange,
        // 当前选中的check list
        checkList,
        // 插件组选中项回调
        multipleCallBack,
        // 是否动态加载公共TAGS控件
        commonTagsSelectRender = false,
        // 外部TAGS组件渲染
        TagsSelectRender,
        // 动态加载设置项
        settingRender
    } = props
    const FILTER_CACHE_LIST_DATA = PluginGV.Fetch_Local_Plugin_Group
    const [form] = Form.useForm()
    const layout = {
        labelCol: {span: 5},
        wrapperCol: {span: 19}
    }
    const itemLayout = {
        labelCol: {span: 5},
        wrapperCol: {span: 16}
    }
    const [menuList, setMenuList] = useState<YakFilterRemoteObj[]>([])
    const nowData = useRef<YakFilterRemoteObj[]>([])
    // 此处存储读取是一个异步过程 可能存在存储后读取的数据不为最新值
    // const [reload, setReload] = useState<boolean>(false)
    // // 引入公共Select组件数据
    // const [selectedTags, setSelectedTags] = useState<string[]>([])
    useEffect(() => {
        getRemoteValue(FILTER_CACHE_LIST_DATA).then((data: string) => {
            if (!!data) {
                const cacheData: YakFilterRemoteObj[] = JSON.parse(data)
                setMenuList(cacheData)
            }
        })
    }, [])

    const menuClick = (value: string[]) => {
        if (TYPE === "MITM") {
            // 移除插件组 关闭全选
            ipcRenderer.invoke("mitm-remove-hook", {
                HookName: [],
                RemoveHookID: checkList
            } as any)
        }
        // setCheckAll && setCheckAll(false)
        multipleCallBack(value)
    }

    const deletePlugIn = (e, name: string) => {
        e.stopPropagation()
        const newArr: YakFilterRemoteObj[] = menuList.filter((item) => item.name !== name)
        setRemoteValue(FILTER_CACHE_LIST_DATA, JSON.stringify(newArr))
        nowData.current = newArr
        setMenuList(nowData.current)
        // setReload(!reload)
    }

    const plugInMenu = () => {
        return menuList.map((item: YakFilterRemoteObj) => (
            <div key={item.name} style={{display: "flex"}} onClick={() => menuClick(item.value)}>
                <div className='content-ellipsis' style={{width: 100}}>
                    {item.name}
                </div>
                <div style={{width: 10, margin: "0px 10px"}}>{item.value.length}</div>
                <DeleteOutlined
                    style={{position: "relative", top: 5, marginLeft: 4}}
                    onClick={(e) => deletePlugIn(e, item.name)}
                />
            </div>
        ))
    }
    const AddPlugIn = (props) => {
        const {onClose} = props
        const onFinish = useMemoizedFn((value) => {
            getRemoteValue(FILTER_CACHE_LIST_DATA)
                .then((data: string) => {
                    let obj = {
                        name: value.name,
                        value: checkList
                    }
                    if (!!data) {
                        const cacheData: YakFilterRemoteObj[] = JSON.parse(data)
                        const index: number = cacheData.findIndex((item) => item.name === value.name)
                        // 本地中存在插件组名称
                        if (index >= 0) {
                            cacheData[index].value = Array.from(new Set([...cacheData[index].value, ...checkList]))
                            nowData.current = cacheData
                            setRemoteValue(FILTER_CACHE_LIST_DATA, JSON.stringify(cacheData))
                        } else {
                            const newArr = [...cacheData, obj]
                            nowData.current = newArr
                            setRemoteValue(FILTER_CACHE_LIST_DATA, JSON.stringify(newArr))
                        }
                    } else {
                        nowData.current = [obj]
                        setRemoteValue(FILTER_CACHE_LIST_DATA, JSON.stringify([obj]))
                    }
                })
                .finally(() => {
                    // setReload(!reload)
                    setMenuList(nowData.current)
                    yakitNotify("info", "添加插件组成功")
                    onClose()
                })
        })
        return (
            <div>
                <Form {...layout} form={form} name='add-plug-in' onFinish={onFinish}>
                    <Form.Item
                        {...itemLayout}
                        name='name'
                        label='名称'
                        rules={[{required: true, message: "该项为必填"}]}
                    >
                        <AutoComplete
                            options={menuList.map((item) => ({value: item.name}))}
                            placeholder='请输入插件组名'
                            filterOption={(inputValue, option) =>
                                option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                            }
                        />
                    </Form.Item>
                    <Form.Item {...itemLayout} label='插件'>
                        <div style={{maxHeight: 460, overflow: "auto"}}>
                            {checkList.map((item) => (
                                <span style={{paddingRight: 12}} key={item}>
                                    {item};
                                </span>
                            ))}
                        </div>
                    </Form.Item>
                    <div style={{textAlign: "right"}}>
                        <Space>
                            <Button onClick={() => onClose()}>取消</Button>
                            <Button type='primary' htmlType='submit'>
                                添加
                            </Button>
                        </Space>
                    </div>
                </Form>
            </div>
        )
    }
    return (
        <div style={{minHeight: 47}}>
            <Input.Group compact>
                <Select
                    style={{width: "27%"}}
                    value={searchType}
                    size='small'
                    onSelect={(v) => {
                        if (v === "Keyword") {
                            setTag([])
                        }
                        v === "Tags" && setSearchKeyword("")
                        setSearchType(v)
                    }}
                >
                    <Select.Option value='Tags'>Tag</Select.Option>
                    <Select.Option value='Keyword'>关键字</Select.Option>
                </Select>
                {(searchType === "Tags" && (
                    <>
                        {/* 当有外部组件 与公共组件使用并存优先使用外部组件 */}
                        {commonTagsSelectRender || TagsSelectRender ? (
                            <div
                                style={{
                                    display: "inline-block",
                                    width: "73%",
                                    minHeight: "auto",
                                    height: 24,
                                    position: "relative",
                                    top: -4
                                }}
                            >
                                {TagsSelectRender ? (
                                    TagsSelectRender()
                                ) : (
                                    <YakFilterModuleSelect selectedTags={tag} setSelectedTags={setTag} />
                                )}
                            </div>
                        ) : (
                            <Select
                                mode='tags'
                                size='small'
                                onChange={(e) => {
                                    setTag(e as string[])
                                }}
                                placeholder='选择Tag'
                                style={{width: "73%"}}
                                loading={tagsLoading}
                                onBlur={() => {
                                    setRefresh(!refresh)
                                }}
                                onDeselect={onDeselect}
                                maxTagCount='responsive'
                                value={tag}
                                allowClear={true}
                            >
                                {tagsList.map((item) => (
                                    <Select.Option key={item.Value} value={item.Value}>
                                        <div className='mitm-card-select-option'>
                                            <span>{item.Value}</span>
                                            <span>{item.Total}</span>
                                        </div>
                                    </Select.Option>
                                ))}
                            </Select>
                        )}
                    </>
                )) || (
                    <Input.Search
                        onSearch={() => {
                            setRefresh(!refresh)
                        }}
                        placeholder='搜索插件'
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        size='small'
                        style={{width: "73%"}}
                    />
                )}
            </Input.Group>
            <div className='plug-in-menu-box'>
                <div className='check-box'>
                    <Checkbox onChange={(e) => onCheckAllChange(e.target.checked)} checked={checkAll}>
                        全选
                    </Checkbox>
                </div>
                <div style={{marginLeft: 12}}>
                    <Dropdown overlay={<Space direction={"vertical"}>{plugInMenu()}</Space>} disabled={checkAll}>
                        <a
                            onClick={(e) => {
                                e.preventDefault()
                                if (menuList.length === 0) {
                                    yakitNotify("info", "请先新建插件组")
                                }
                            }}
                        >
                            <Space>
                                插件组
                                <DownOutlined />
                            </Space>
                        </a>
                    </Dropdown>
                </div>
                <div
                    className='add-icon'
                    onClick={() => {
                        if (checkList.length === 0) {
                            yakitNotify("info", "选中数据未获取")
                            return
                        }
                        let m = showModal({
                            title: "添加插件组",
                            width: 520,
                            content: <AddPlugIn onClose={() => m.destroy()} />
                        })
                        return m
                    }}
                >
                    <PlusOutlined />
                </div>
                <div style={{marginLeft: 12}}>{settingRender && settingRender()}</div>
            </div>
            <div style={{whiteSpace: "initial"}}>
                {tag.map((i) => {
                    return (
                        <Tag
                            key={i}
                            style={{marginBottom: 2}}
                            color={"blue"}
                            onClose={() => {
                                let arr = tag.filter((element) => i !== element)
                                setTag(arr)
                            }}
                            closable={true}
                        >
                            {i}
                        </Tag>
                    )
                })}
            </div>
        </div>
    )
}

const PluginType = {
    yak: "YAK 插件",
    mitm: "MITM 插件",
    "packet-hack": "数据包扫描",
    "port-scan": "端口扫描插件",
    codec: "CODEC插件",
    nuclei: "YAML POC"
}
const PluginTypeText = (type) => {
    switch (type) {
        case "yak":
            return <div className='plugin-type plugin-yak'>{PluginType[type]}</div>
        case "mitm":
            return <div className='plugin-type plugin-mitm'>{PluginType[type]}</div>
        case "packet-hack":
            return <div className='plugin-type plugin-packet-hack'>{PluginType[type]}</div>
        case "port-scan":
            return <div className='plugin-type plugin-port-scan'>{PluginType[type]}</div>
        case "codec":
            return <div className='plugin-type plugin-codec'>{PluginType[type]}</div>
        case "nuclei":
            return <div className='plugin-type plugin-nuclei'>{PluginType[type]}</div>
        default:
            break
    }
}

interface DownloadOnlinePluginAllResProps {
    Progress: number
    Log: string
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
                            justifyContent:"center",
                            alignItems:"center",
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
const pluginGroupArr:string[] = ["基础扫描","操作系统类漏洞","WEB中间件漏洞","WEB应用漏洞","网络安全设备漏洞","OA产品漏洞","CMS产品漏洞", "弱口令", "CVE合规漏洞"]
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
                    {pluginGroupArr.map((item)=><Col span={8} style={{marginTop: 10}}>
                        <Checkbox value={item} key={item}>{item}</Checkbox>
                    </Col>)}
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

interface PluginGroupProps {
    size: "small" | "middle"
    selectedRowKeysRecordOnline: API.YakitPluginDetail[]
    isSelectAllOnline: boolean
    queryOnline: API.GetPluginWhere
    onRefList: () => void
}

interface PluginGroupPostProps {
    groupName: string[]
    pluginUuid?: string[]
    pluginWhere?: API.GetPluginWhere
}

const PluginGroup: React.FC<PluginGroupProps> = (props) => {
    const {size, selectedRowKeysRecordOnline, isSelectAllOnline, queryOnline, onRefList} = props

    const menuData = [
        {
            title: "加入分组",
            number: 10,
            onClickBatch: () => {
                const m = showModal({
                    width: "40%",
                    content: (
                        <AddPluginGroup
                            onRefList={onRefList}
                            onClose={() => m.destroy()}
                            selectedRowKeysRecordOnline={selectedRowKeysRecordOnline}
                            isSelectAllOnline={isSelectAllOnline}
                            queryOnline={queryOnline}
                        />
                    )
                })
                return m
            }
        },
        {
            title: "编辑分组",
            number: 10,
            onClickBatch: () => {
                const n = showModal({
                    width: "35%",
                    content: (
                        <RemovePluginGroup
                            onRefList={onRefList}
                            onClose={() => n.destroy()}
                            selectedRowKeysRecordOnline={selectedRowKeysRecordOnline}
                            isSelectAllOnline={isSelectAllOnline}
                            queryOnline={queryOnline}
                        />
                    )
                })
                return n
            }
        }
    ]

    return (
        <div>
            {size === "middle" && (
                <>
                    {selectedRowKeysRecordOnline.length === 0 ? (
                        <Button
                            style={{margin: "0 12px 0 0"}}
                            size='small'
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                            disabled={true}
                        >
                            插件分组
                            <ChevronDownIcon style={{color: "#85899E"}} />
                        </Button>
                    ) : (
                        <Popover
                            overlayClassName={style["http-history-table-drop-down-popover"]}
                            content={
                                <Menu className={style["http-history-table-drop-down-batch"]}>
                                    {menuData.map((m) => {
                                        return (
                                            <Menu.Item
                                                onClick={() => {
                                                    m.onClickBatch()
                                                }}
                                                key={m.title}
                                            >
                                                {m.title}
                                            </Menu.Item>
                                        )
                                    })}
                                </Menu>
                            }
                            trigger='click'
                            placement='bottomLeft'
                        >
                            <Button
                                style={{margin: "0 12px 0 0"}}
                                size='small'
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                            >
                                插件分组
                                <ChevronDownIcon style={{color: "#85899E"}} />
                            </Button>
                        </Popover>
                    )}
                </>
            )}
        </div>
    )
}

interface AddAllPluginProps {
    setListLoading: (a: boolean) => void
    selectedRowKeysRecord: API.YakitPluginDetail[]
    user: boolean
    userInfo: UserInfoProps
    onFinish: () => void
    oneImport?: boolean
    size?: "middle" | "small"
    query?: SearchPluginOnlineRequest
    isSelectAll?: boolean
}

interface DownloadOnlinePluginByIdsRequest {
    OnlineIDs: number[]
    UUID: string[]
}

interface DownloadOnlinePluginByTokenRequest {
    isAddToken: boolean
    BindMe: boolean
    Keywords?: string
    PluginType?: string
    Status?: string
    IsPrivate?: string
    UserName?: string
    UserId?: number
    TimeSearch?: string
    Group?: string
    Tags?: string
}

const AddAllPlugin: React.FC<AddAllPluginProps> = (props) => {
    const {selectedRowKeysRecord, setListLoading, user, userInfo, onFinish, oneImport, size, query, isSelectAll} = props
    const [taskToken, setTaskToken] = useState(randomString(40))
    // 全部添加进度条
    const [addLoading, setAddLoading] = useState<boolean>(false)
    const [percent, setPercent, getPercent] = useGetState<number>(0)
    useEffect(() => {
        if (!taskToken) {
            return
        }
        ipcRenderer.on(`${taskToken}-data`, (_, data: DownloadOnlinePluginAllResProps) => {
            const p = Math.floor(data.Progress * 100)
            setPercent(p)
        })
        ipcRenderer.on(`${taskToken}-end`, () => {
            setTimeout(() => {
                setAddLoading(false)
                setPercent(0)
                onFinish()
                ipcRenderer.invoke("change-main-menu")
            }, 500)
        })
        ipcRenderer.on(`${taskToken}-error`, (_, e) => {
            yakitNotify("error", "插件下载失败:" + e)
        })
        return () => {
            ipcRenderer.removeAllListeners(`${taskToken}-data`)
            ipcRenderer.removeAllListeners(`${taskToken}-error`)
            ipcRenderer.removeAllListeners(`${taskToken}-end`)
        }
    }, [taskToken])
    const AddAllPlugin = useMemoizedFn(() => {
        if (user && !userInfo.isLogin) {
            yakitNotify("warning", "我的插件需要先登录才能下载，请先登录")
            return
        }
        if (selectedRowKeysRecord.length === 0 || isSelectAll) {
            // 全部添加
            setAddLoading(true)
            let addParams: DownloadOnlinePluginByTokenRequest = {isAddToken: true, BindMe: user}
            // 一键导入不加条件，其他要加
            if (!oneImport) {
                addParams = {
                    ...addParams,
                    Keywords: query?.keywords,
                    PluginType: query?.plugin_type,
                    Status: query?.status,
                    IsPrivate: query?.is_private,
                    UserId: query?.user_id,
                    UserName: query?.user_name,
                    TimeSearch: query?.time_search,
                    Group: query?.group,
                    Tags: query?.tags
                }
            }

            ipcRenderer
                .invoke("DownloadOnlinePluginAll", addParams, taskToken)
                .then(() => {})
                .catch((e) => {
                    yakitNotify("error", `添加失败:${e}`)
                })
        } else {
            // 批量添加
            const uuIds: string[] = []
            const onlineIDs: number[] = []
            selectedRowKeysRecord.forEach((item) => {
                uuIds.push(item.uuid)
                onlineIDs.push(item.id)
            })
            setListLoading(true)
            ipcRenderer
                .invoke("DownloadOnlinePluginByIds", {
                    UUID: uuIds,
                    OnlineIDs: onlineIDs
                } as DownloadOnlinePluginByIdsRequest)
                .then(() => {
                    yakitNotify("success", `共添加${selectedRowKeysRecord.length}条数据到本地`)
                    onFinish()
                })
                .catch((e) => {
                    yakitNotify("error", `添加失败:${e}`)
                })
                .finally(() => {
                    setTimeout(() => {
                        setListLoading(false)
                    }, 200)
                })
        }
    })
    const StopAllPlugin = () => {
        setAddLoading(false)
        ipcRenderer.invoke("cancel-DownloadOnlinePluginAll", taskToken).catch((e) => {
            yakitNotify("error", `停止添加失败:${e}`)
        })
    }
    return (
        <>
            {addLoading && (
                <div className='filter-opt-progress'>
                    <Progress
                        size='small'
                        status={!addLoading && percent !== 0 ? "exception" : undefined}
                        percent={percent}
                    />
                </div>
            )}
            {addLoading ? (
                <>
                    {(size === "small" && <PoweroffOutlined className='filter-opt-btn' onClick={StopAllPlugin} />) || (
                        <Button size='small' type='primary' danger onClick={StopAllPlugin}>
                            停止
                        </Button>
                    )}
                </>
            ) : (
                <>
                    {(oneImport && (
                        <Popconfirm
                            title={user ? "确定将我的插件所有数据导入到本地吗?" : "确定将插件商店所有数据导入到本地吗?"}
                            onConfirm={AddAllPlugin}
                            okText='Yes'
                            cancelText='No'
                            placement={size === "small" ? "top" : "topRight"}
                        >
                            {/* <div className='operation-text'>一键导入</div> */}
                            {(size === "small" && <></>) || (
                                <Button type='primary' size='small'>
                                    一键导入
                                </Button>
                            )}
                        </Popconfirm>
                    )) || (
                        <>
                            {(selectedRowKeysRecord.length === 0 && !(user && !userInfo.isLogin) && (
                                <Popconfirm
                                    title={
                                        user
                                            ? "确定将我的插件所有数据导入到本地吗"
                                            : "确定将插件商店所有数据导入到本地吗?"
                                    }
                                    onConfirm={AddAllPlugin}
                                    okText='Yes'
                                    cancelText='No'
                                    placement={size === "small" ? "top" : "topRight"}
                                >
                                    {(size === "small" && (
                                        <Tooltip title='下载'>
                                            <DownloadOutlined className='operation-icon ' />
                                        </Tooltip>
                                    )) || (
                                        <Button type='primary' size='small'>
                                            下载
                                        </Button>
                                    )}
                                </Popconfirm>
                            )) || (
                                <>
                                    {(size === "small" && (
                                        <Tooltip title='下载'>
                                            <DownloadOutlined className='operation-icon ' onClick={AddAllPlugin} />
                                        </Tooltip>
                                    )) || (
                                        <Button type='primary' size='small' onClick={AddAllPlugin}>
                                            下载
                                        </Button>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </>
    )
}

interface StarsOperation {
    id: number
    operation: string
}

interface PluginUserInfoOnlineProps {
    head_img: string
    user_id: number
}

interface YakModuleOnlineProps {
    plugin?: API.YakitPluginDetail
    setPlugin: (u?: API.YakitPluginDetail) => void
    userInfo: UserInfoProps
    isRefList: boolean
    publicKeyword: string
    deletePluginRecordOnline?: API.YakitPluginDetail
    updatePluginRecordOnline?: API.YakitPluginDetail
    setListLoading: (l: boolean) => void
    size: "middle" | "small"
    numberOnline?: number
    setNumberOnline: (n: number) => void
    setStatisticsQueryOnline: (q: SearchPluginOnlineRequest) => void
    statisticsQueryOnline: SearchPluginOnlineRequest
    isShowFilter: boolean
    searchType: "userName" | "keyword"
    onRefList: () => void
}

const YakModuleOnline: React.FC<YakModuleOnlineProps> = (props) => {
    const {
        plugin,
        setPlugin,
        userInfo,
        publicKeyword,
        isRefList,
        deletePluginRecordOnline,
        setListLoading,
        updatePluginRecordOnline,
        size,
        numberOnline,
        setNumberOnline,
        statisticsQueryOnline,
        setStatisticsQueryOnline,
        isShowFilter,
        searchType,
        onRefList
    } = props
    const [queryOnline, setQueryOnline] = useState<SearchPluginOnlineRequest>({
        ...statisticsQueryOnline
    })
    const [isFilter, setIsFilter] = useState(false)
    const [selectedRowKeysRecordOnline, setSelectedRowKeysRecordOnline] = useState<API.YakitPluginDetail[]>([])
    const [totalUserOnline, setTotalOnline] = useState<number>(0)
    const [refresh, setRefresh] = useState(false)
    const [visibleQuery, setVisibleQuery] = useState<boolean>(false)
    const [isSelectAllOnline, setIsSelectAllOnline] = useState<boolean>(false)
    const [userInfoOnline, setUserInfoOnline] = useState<PluginUserInfoOnlineProps>({
        head_img: "",
        user_id: 0
    })
    useEffect(() => {
        if (searchType === "keyword") {
            setQueryOnline({
                ...queryOnline,
                keywords: publicKeyword,
                user_name: ""
            })
        } else {
            setQueryOnline({
                ...queryOnline,
                keywords: "",
                user_name: publicKeyword
            })
        }
    }, [searchType, publicKeyword])
    useEffect(() => {
        const newQuery = {
            ...queryOnline,
            ...statisticsQueryOnline
        }
        if (!statisticsQueryOnline.tags) {
            delete newQuery.tags
        }
        if (statisticsQueryOnline.user_id === 0) {
            setUserInfoOnline({
                head_img: "",
                user_id: 0
            })
        }
        setQueryOnline(newQuery)
        onResetList()
    }, [statisticsQueryOnline])
    useEffect(() => {
        if (!userInfo.isLogin) onSelectAllOnline(false)
    }, [userInfo])
    useEffect(() => {
        if (
            !queryOnline.is_private &&
            queryOnline.order_by === "created_at" &&
            queryOnline.order === "desc" &&
            queryOnline.plugin_type === typeOnline &&
            !queryOnline.status &&
            queryOnline.bind_me === false
        ) {
            setIsFilter(false)
        } else {
            setIsFilter(true)
        }
    }, [queryOnline])
    const isRefListRef = useRef(true)
    useEffect(() => {
        if (isRefListRef.current) {
            isRefListRef.current = false
        } else {
            // 初次不执行
            onResetList()
            setPlugin()
        }
    }, [isRefList])
    const onSelectAllOnline = useMemoizedFn((checked) => {
        setIsSelectAllOnline(checked)
        if (!checked) {
            setSelectedRowKeysRecordOnline([]) // 清除本地
        }
    })
    const onResetList = useMemoizedFn(() => {
        setRefresh(!refresh)
        onSelectAllOnline(false)
    })
    const onSetUser = useMemoizedFn((item: PluginUserInfoOnlineProps) => {
        setStatisticsQueryOnline({
            ...queryOnline,
            user_id: item.user_id
        })
        setUserInfoOnline(item)
        onSelectAllOnline(false)
        setTimeout(() => {
            setRefresh(!refresh)
        }, 100)
    })

    /**
     * plugin-store batch del related logic
     */
    const isShowDelBtn = useMemo(() => {
        if (["admin", "superAdmin"].includes(userInfo.role || "")) return true
        if (userInfo.showStatusSearch) return true
        return false
    }, [userInfo])
    const delDisabled = useMemo(() => {
        if (isSelectAllOnline) return false
        if (selectedRowKeysRecordOnline.length > 0) return false
        return true
    }, [isSelectAllOnline, selectedRowKeysRecordOnline])
    const [batchDelShow, setBatchDelShow] = useState<boolean>(false)
    const onBatchDel = useMemoizedFn((isDel: boolean) => {
        let params: API.GetPluginWhere = {bind_me: false, recycle: false}

        if (isSelectAllOnline) {
            params = {...params, ...queryOnline, delete_dump: isDel}
            NetWorkApi<API.GetPluginWhere, API.ActionSucceeded>({
                method: "delete",
                url: "yakit/plugin",
                data: params
            })
                .then((res) => {
                    onResetList()
                })
                .catch((err) => {
                    yakitNotify("error", "删除失败:" + err)
                })
                .finally(() => {
                    setBatchDelShow(false)
                })
        } else {
            if (selectedRowKeysRecordOnline.length > 0) {
                params = {
                    ...params,
                    delete_uuid: selectedRowKeysRecordOnline.map((item) => item.uuid),
                    delete_dump: isDel
                }

                NetWorkApi<API.GetPluginWhere, API.ActionSucceeded>({
                    method: "delete",
                    url: "yakit/plugin",
                    data: params
                })
                    .then((res) => {
                        onResetList()
                    })
                    .catch((err) => {
                        yakitNotify("error", "删除失败:" + err)
                    })
                    .finally(() => {
                        setBatchDelShow(false)
                    })
            }
        }
    })

    return (
        <div className='height-100'>
            <Row className='row-body' gutter={12}>
                <Col span={16} className='col'>
                    <Checkbox checked={isSelectAllOnline} onChange={(e) => onSelectAllOnline(e.target.checked)}>
                        全选
                    </Checkbox>
                    {selectedRowKeysRecordOnline.length > 0 && (
                        <Tag color='blue'>
                            已选{isSelectAllOnline ? totalUserOnline : selectedRowKeysRecordOnline.length}条
                        </Tag>
                    )}
                    <Tag>Total:{totalUserOnline}</Tag>
                    {userInfoOnline.head_img && (
                        <div className='plugin-headImg'>
                            <img alt='' src={userInfoOnline.head_img} />
                            <div
                                className='img-mask'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (onSetUser)
                                        onSetUser({
                                            user_id: 0,
                                            head_img: ""
                                        })
                                }}
                            >
                                <CloseOutlined className='img-mask-icon' />
                            </div>
                        </div>
                    )}
                    {statisticsQueryOnline.time_search && statisticsQueryOnline.time_search?.length > 0 && (
                        <YakitTag
                            closable
                            color='blue'
                            onClose={() => {
                                setStatisticsQueryOnline({...statisticsQueryOnline, time_search: ""})
                            }}
                        >
                            {statisticsQueryOnline.time_search === "week" ? "本周新增" : "今日新增"}
                        </YakitTag>
                    )}
                </Col>
                <Col span={8} className='col-flex-end'>
                    {isEnpriTraceAgent() && (
                        <PluginGroup
                            onRefList={onRefList}
                            size={size}
                            queryOnline={queryOnline}
                            selectedRowKeysRecordOnline={selectedRowKeysRecordOnline}
                            isSelectAllOnline={isSelectAllOnline}
                        />
                    )}
                    {isShowFilter && (
                        <PluginFilter
                            visibleQuery={visibleQuery}
                            setVisibleQuery={setVisibleQuery}
                            queryChildren={
                                <QueryComponentOnline
                                    onClose={() => setVisibleQuery(false)}
                                    userInfo={userInfo}
                                    queryOnline={queryOnline}
                                    setQueryOnline={(e) => {
                                        setStatisticsQueryOnline(e)
                                        // onResetList()
                                    }}
                                    user={false}
                                />
                            }
                            size={size}
                            isFilter={isFilter}
                        />
                    )}
                    {isShowDelBtn && (
                        <YakitButton colors="danger" disabled={delDisabled} onClick={() => setBatchDelShow(true)}>
                            删除
                        </YakitButton>
                    )}
                    <AddAllPlugin
                        selectedRowKeysRecord={selectedRowKeysRecordOnline}
                        setListLoading={setListLoading}
                        user={false}
                        userInfo={userInfo}
                        onFinish={() => {
                            onSelectAllOnline(false)
                        }}
                        size={size}
                        isSelectAll={isSelectAllOnline}
                        query={queryOnline}
                    />
                    <AddAllPlugin
                        oneImport={true}
                        size={size}
                        selectedRowKeysRecord={[]}
                        setListLoading={setListLoading}
                        user={false}
                        userInfo={userInfo}
                        onFinish={() => {}}
                    />
                </Col>
            </Row>
            <div className='list-height'>
                <YakModuleOnlineList
                    number={numberOnline}
                    size={size}
                    currentId={plugin?.id || 0}
                    queryOnline={queryOnline}
                    selectedRowKeysRecord={selectedRowKeysRecordOnline}
                    onSelectList={setSelectedRowKeysRecordOnline}
                    isSelectAll={isSelectAllOnline}
                    setIsSelectAll={setIsSelectAllOnline}
                    setTotal={setTotalOnline}
                    setIsRequest={setListLoading}
                    onClicked={(info, index) => {
                        if (size === "middle") {
                            setNumberOnline(index || 0)
                        }
                        setPlugin(info)
                    }}
                    userInfo={userInfo}
                    bind_me={false}
                    refresh={refresh}
                    deletePluginRecord={deletePluginRecordOnline}
                    updatePluginRecord={updatePluginRecordOnline}
                    onSetUser={onSetUser}
                />
            </div>
            <YakitHint
                visible={batchDelShow}
                title='删除插件'
                content={
                    <>
                        {`是否需要彻底删除插件,彻底删除后将`}
                        <span style={{color: "var(--yakit-danger-5)"}}>无法恢复</span>
                    </>
                }
                okButtonText='放入回收站'
                cancelButtonText='删除'
                footerExtra={
                    <YakitButton size='max' type='outline2' onClick={() => setBatchDelShow(false)}>
                        取消
                    </YakitButton>
                }
                onOk={() => onBatchDel(false)}
                onCancel={() => onBatchDel(true)}
            />
        </div>
    )
}

interface YakModuleOnlineListProps {
    currentId: number
    queryOnline: SearchPluginOnlineRequest
    setTotal: (m: number) => void
    selectedRowKeysRecord: API.YakitPluginDetail[]
    onSelectList: (m: API.YakitPluginDetail[]) => void
    onClicked: (m?: API.YakitPluginDetail, i?: number) => void
    userInfo: UserInfoProps
    isSelectAll: boolean
    setIsSelectAll: (b: boolean) => void
    bind_me: boolean
    refresh: boolean
    deletePluginRecord?: API.YakitPluginDetail
    updatePluginRecord?: API.YakitPluginDetail
    size: "middle" | "small"
    number?: number
    renderRow?: (data: API.YakitPluginDetail, index: number) => ReactNode
    onSetUser?: (u: PluginUserInfoOnlineProps) => void
    setIsRequest?: (b: boolean) => void
}

const YakModuleOnlineList: React.FC<YakModuleOnlineListProps> = (props) => {
    const {
        queryOnline,
        setTotal,
        selectedRowKeysRecord,
        onSelectList,
        isSelectAll,
        onClicked,
        currentId,
        userInfo,
        bind_me,
        deletePluginRecord,
        updatePluginRecord,
        refresh,
        size,
        number,
        setIsSelectAll,
        renderRow,
        onSetUser,
        setIsRequest
    } = props
    const [response, setResponse] = useState<API.YakitPluginListResponse>({
        data: [],
        pagemeta: {
            limit: 20,
            page: 1,
            total: 0,
            total_page: 1
        }
    })
    const [loading, setLoading] = useState(false)
    const [isAdmin, setIsAdmin] = useState<boolean>(true)
    const [hasMore, setHasMore] = useState(false)
    const [isRef, setIsRef] = useState(false)
    const [listBodyLoading, setListBodyLoading] = useState(false)
    const [recalculation, setRecalculation] = useState(false)
    const [baseUrl, setBaseUrl] = useState<string>("")
    const numberOnlineUser = useRef(0) // 我的插件 选择的插件index
    const numberOnline = useRef(0) // 插件商店 选择的插件index
    // 获取私有域
    useEffect(() => {
        getRemoteValue("httpSetting").then((setting) => {
            const values = JSON.parse(setting)
            const baseUrl: string = values.BaseUrl
            setBaseUrl(baseUrl)
        })
    }, [])
    useEffect(() => {
        if (!updatePluginRecord) return
        const index = response.data.findIndex((ele) => ele.id === updatePluginRecord.id)
        if (index === -1) return
        response.data[index] = {...updatePluginRecord}
        setResponse({
            ...response,
            data: [...response.data]
        })
        setTimeout(() => {
            setRecalculation(!recalculation)
        }, 100)
    }, [updatePluginRecord])
    useEffect(() => {
        if (!deletePluginRecord) return
        if (bind_me) {
            response.data.splice(numberOnlineUser.current, 1)
        } else {
            response.data.splice(numberOnline.current, 1)
        }
        setResponse({
            ...response,
            data: [...response.data]
        })
        setTimeout(() => {
            setRecalculation(!recalculation)
        }, 100)
        onClicked()
    }, [deletePluginRecord?.id])
    useEffect(() => {
        if (isSelectAll) {
            onSelectList([...response.data])
        }
    }, [isSelectAll])
    useEffect(() => {
        const boolAdmin = ["admin", "superAdmin"].includes(userInfo.role || "")
        setIsAdmin(boolAdmin)
    }, [userInfo.role])
    useEffect(() => {
        setListBodyLoading(true)
        if (!userInfo.isLogin && (bind_me || queryOnline.recycle)) {
            setTotal(0)
        } else {
            search(1)
        }
    }, [bind_me, refresh, userInfo.isLogin])
    const search = useMemoizedFn((page: number) => {
        let url = "yakit/plugin/unlogged"
        if (userInfo.isLogin) {
            url = "yakit/plugin"
        }
        const payload = {
            ...queryOnline,
            page,
            bind_me
        }
        if (!bind_me) {
            delete payload.is_private
        }
        setLoading(true)
        NetWorkApi<SearchPluginOnlineRequest, API.YakitPluginListResponse>({
            method: "get",
            url,
            params: {
                page: payload.page,
                order_by: payload.order_by,
                limit: payload.limit,
                order: payload.order,
                bind_me: payload.bind_me,
                recycle: payload.recycle
            },
            data: payload
        })
            .then((res) => {
                if (!res.data) {
                    res.data = []
                }
                const data = page === 1 ? res.data : response.data.concat(res.data)
                const isMore = res.data.length < res.pagemeta.limit || data.length === response.pagemeta.total
                setHasMore(!isMore)
                if (payload.page > 1 && isSelectAll) {
                    onSelectList(data)
                }
                setResponse({
                    ...res,
                    data: [...data]
                })
                if (page === 1) {
                    setTotal(res.pagemeta.total)
                    setIsRef(!isRef)
                }
            })
            .catch((err) => {
                yakitNotify("error", "插件列表获取失败:" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                    setListBodyLoading(false)
                    if (setIsRequest) setIsRequest(false)
                }, 200)
            })
    })
    const loadMoreData = useMemoizedFn(() => {
        if (hasMore) search(response.pagemeta.page + 1)
    })
    const onSelect = useMemoizedFn((item: API.YakitPluginDetail) => {
        const index = selectedRowKeysRecord.findIndex((ele) => ele.id === item.id)
        if (index === -1) {
            selectedRowKeysRecord.push(item)
        } else {
            selectedRowKeysRecord.splice(index, 1)
        }
        setIsSelectAll(false)
        onSelectList([...selectedRowKeysRecord])
    })
    const addLocalLab = useMemoizedFn((info: API.YakitPluginDetail, callback) => {
        const params: DownloadOnlinePluginProps = {
            OnlineID: info.id,
            UUID: info.uuid
        }
        ipcRenderer
            .invoke("DownloadOnlinePluginById", params)
            .then(() => {
                yakitNotify("success", "添加成功")
                ipcRenderer.invoke("change-main-menu")
            })
            .catch((e) => {
                yakitNotify("error", `添加失败:${e}`)
            })
            .finally(() => {
                if (callback) callback()
            })
    })
    const starredPlugin = useMemoizedFn((info: API.YakitPluginDetail) => {
        if (!userInfo.isLogin) {
            yakitNotify("warning", "请先登录")
            return
        }
        const prams: StarsOperation = {
            id: info?.id,
            operation: info.is_stars ? "remove" : "add"
        }
        NetWorkApi<StarsOperation, API.ActionSucceeded>({
            method: "post",
            url: "yakit/plugin/stars",
            params: prams
        })
            .then((res) => {
                if (!res.ok) return
                const index: number = response.data.findIndex((ele: API.YakitPluginDetail) => ele.id === info.id)
                if (index !== -1) {
                    if (info.is_stars) {
                        response.data[index].stars -= 1
                        response.data[index].is_stars = false
                    } else {
                        response.data[index].stars += 1
                        response.data[index].is_stars = true
                    }
                    setResponse({
                        ...response,
                        data: [...response.data]
                    })
                }
            })
            .catch((err) => {
                yakitNotify("error", "点星:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    if (!userInfo.isLogin && (bind_me || queryOnline.recycle)) {
        return (
            <List
                dataSource={[]}
                locale={{emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='未登录,请先登录' />}}
            />
        )
    }

    if (!userInfo.isLogin && isEnterpriseEdition() && !baseUrl.startsWith("https://www.yaklang.com")) {
        return (
            <List
                dataSource={[]}
                locale={{emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='未登录,请先登录' />}}
            />
        )
    }
    return (
        <Spin spinning={listBodyLoading}>
            <RollingLoadList<API.YakitPluginDetail>
                numberRoll={number}
                isRef={isRef}
                recalculation={recalculation}
                data={response.data}
                page={response.pagemeta.page}
                hasMore={hasMore}
                loading={loading}
                loadMoreData={() => loadMoreData()}
                rowKey='id'
                isGridLayout={size === "middle"}
                defItemHeight={170}
                classNameRow='plugin-list'
                classNameList='plugin-list-body'
                renderRow={(data: API.YakitPluginDetail, index: number) =>
                    (renderRow && renderRow(data, index)) || (
                        <PluginItemOnline
                            currentId={currentId}
                            isAdmin={isAdmin}
                            info={data}
                            selectedRowKeysRecord={selectedRowKeysRecord}
                            onSelect={onSelect}
                            onClick={(info) => {
                                if (bind_me) {
                                    numberOnlineUser.current = index
                                } else {
                                    numberOnline.current = index
                                }
                                onClicked(info, index)
                            }}
                            onDownload={addLocalLab}
                            onStarred={starredPlugin}
                            bind_me={bind_me}
                            onSetUser={onSetUser}
                        />
                    )
                }
            />
        </Spin>
    )
}

const TagColor: {[key: string]: string} = {
    failed: "color-bgColor-red|审核不通过",
    success: "color-bgColor-green|审核通过",
    not: "color-bgColor-blue|待审核"
}

interface PluginListOptProps {
    currentId: number
    isAdmin: boolean
    info: API.YakitPluginDetail
    onClick: (info: API.YakitPluginDetail) => any
    onDownload?: (info: API.YakitPluginDetail, callback) => any
    onStarred?: (info: API.YakitPluginDetail) => any
    onSelect: (info: API.YakitPluginDetail) => any
    selectedRowKeysRecord: API.YakitPluginDetail[]
    bind_me: boolean
    extra?: ReactNode
    onSetUser?: (u: PluginUserInfoOnlineProps) => any
}

const PluginItemOnline: React.FC<PluginListOptProps> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const {
        isAdmin,
        info,
        onClick,
        onDownload,
        onStarred,
        onSelect,
        selectedRowKeysRecord,
        currentId,
        bind_me,
        extra,
        onSetUser
    } = props
    const tags: string[] = info.tags ? JSON.parse(info.tags) : []
    const [status, setStatus] = useState<number>(info.status)
    useEffect(() => {
        setStatus(info.status)
    }, [info.status, info.id])
    const add = useMemoizedFn(async () => {
        if (onDownload) {
            setLoading(true)
            onDownload(info, () => {
                setLoading(false)
            })
        }
    })
    // 全局登录状态
    const {userInfo} = useStore()
    const isShowAdmin =
        (isAdmin && !bind_me) || (bind_me && !info.is_private) || (userInfo.showStatusSearch && !bind_me)
    const tagsString = (tags && tags.length > 0 && tags.join(",")) || ""
    return (
        <div className={`plugin-item ${currentId === info.id && "plugin-item-active"}`} onClick={() => onClick(info)}>
            <div className={`plugin-item-heard ${currentId === info.id && "plugin-item-heard-active"}`}>
                <div className='plugin-item-left'>
                    <div
                        title={info.script_name}
                        className={`text-style content-ellipsis ${isShowAdmin && "max-width-70"}`}
                    >
                        {info.script_name}
                    </div>
                    <div className='icon-body'>
                        <div className='text-icon'>
                            {isShowAdmin && !info.is_private && (
                                <div
                                    className={`text-icon-admin ${
                                        TagColor[["not", "success", "failed"][status]].split("|")[0]
                                    } vertical-center`}
                                >
                                    {TagColor[["not", "success", "failed"][status]].split("|")[1]}
                                </div>
                            )}
                            {!bind_me && info.official && (
                                // @ts-ignore
                                <OfficialYakitLogoIcon className='text-icon-style' />
                            )}
                            {!bind_me && <>{info.is_private && <LockOutlined style={{paddingLeft: 5}} />}</>}
                            {bind_me && <>{(info.is_private && <LockOutlined />) || <OnlineCloudIcon />}</>}
                        </div>
                    </div>
                </div>
                <div className='plugin-item-right'>
                    {(extra && extra) || (
                        <>
                            {(loading && <LoadingOutlined className='plugin-down' />) || (
                                <div
                                    className='plugin-down'
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        add()
                                    }}
                                    title='添加到插件仓库'
                                >
                                    <DownloadOutlined className='operation-icon ' />
                                </div>
                            )}
                        </>
                    )}
                </div>
                <SelectIcon
                    //  @ts-ignore
                    className={`icon-select  ${
                        selectedRowKeysRecord.findIndex((ele) => ele.id === info.id) !== -1 && "icon-select-active"
                    }`}
                    onClick={(e) => {
                        e.stopPropagation()
                        onSelect(info)
                    }}
                />
            </div>
            <div className='plugin-item-content'>
                <div className='plugin-help content-ellipsis' title={info.help}>
                    {info.help || "No Description about it."}
                </div>
                <div className='plugin-type-body'>
                    {PluginTypeText(info.type)}
                    {tags && tags.length > 0 && (
                        <div className='plugin-tag' title={tagsString}>
                            TAG:{tagsString}
                        </div>
                    )}
                </div>

                <div className='plugin-item-footer'>
                    <div
                        className='plugin-item-footer-left'
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    >
                        {info.head_img && (
                            <img
                                alt=''
                                src={info.head_img}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (onSetUser)
                                        onSetUser({
                                            user_id: info.user_id || 0,
                                            head_img: info.head_img
                                        })
                                }}
                            />
                        )}
                        <div className='plugin-item-author content-ellipsis'>{info.authors || "anonymous"}</div>
                    </div>
                    <div className='plugin-item-time'>{formatDate(info.created_at)}</div>
                </div>
            </div>
        </div>
    )
}

interface QueryComponentOnlineProps {
    onClose: () => void
    userInfo: UserInfoProps
    setQueryOnline: (q: SearchPluginOnlineRequest) => void
    queryOnline: SearchPluginOnlineRequest
    user: boolean
}

const QueryComponentOnline: React.FC<QueryComponentOnlineProps> = (props) => {
    const {onClose, userInfo, queryOnline, setQueryOnline, user} = props
    const [isShowStatus, setIsShowStatus] = useState<boolean>(queryOnline.is_private === "true")
    const [isAdmin, setIsAdmin] = useState(["admin", "superAdmin"].includes(userInfo.role || ""))
    const [form] = Form.useForm()
    const refTest = useRef<any>()
    useEffect(() => {
        const boolAdmin = ["admin", "superAdmin"].includes(userInfo.role || "")
        setIsAdmin(boolAdmin)
    }, [userInfo.role])
    useEffect(() => {
        document.addEventListener("mousedown", (e) => handleClickOutside(e), true)
        return () => {
            document.removeEventListener("mousedown", (e) => handleClickOutside(e), true)
        }
    }, [])
    useEffect(() => {
        form.setFieldsValue({
            order_by: queryOnline.order_by,
            plugin_type: queryOnline.plugin_type ? queryOnline.plugin_type.split(",") : [],
            status: !queryOnline.status ? "all" : queryOnline.status,
            is_private: queryOnline.is_private === "" ? "" : `${queryOnline.is_private === "true"}`
        })
        if (queryOnline.is_private !== "") {
            setIsShowStatus(queryOnline.is_private === "false")
        }
    }, [queryOnline])
    const handleClickOutside = (e) => {
        // 组件已挂载且事件触发对象不在div内
        const dom = findDOMNode(refTest.current)
        if (!dom) return
        const result = dom.contains(e.target)
        if (!result) {
            onClose()
        }
    }
    const onReset = () => {
        setQueryOnline({
            ...queryOnline,
            order_by: "created_at",
            plugin_type: defQueryOnline.plugin_type,
            status: "",
            is_private: ""
        })
        form.setFieldsValue({
            order_by: "created_at",
            plugin_type: defQueryOnline.plugin_type,
            status: "all",
            is_private: ""
        })
    }
    const onFinish = useMemoizedFn((value) => {
        const query: SearchPluginOnlineRequest = {
            ...queryOnline,
            ...value,
            status: value.status === "all" ? "" : value.status,
            plugin_type: value.plugin_type.join(",")
        }
        setQueryOnline({...query})
    })
    const onSelect = useMemoizedFn((key) => {
        setIsShowStatus(key === "false")
    })
    return (
        <div ref={refTest} className='query-form-body'>
            <Form layout='vertical' form={form} name='control-hooks' onFinish={onFinish}>
                {!user && (
                    <Form.Item name='order_by' label='排序顺序'>
                        <Select size='small' getPopupContainer={() => refTest.current}>
                            <Option value='created_at'>按时间</Option>
                            <Option value='stars'>按热度</Option>
                        </Select>
                    </Form.Item>
                )}
                <Form.Item name='plugin_type' label='插件类型'>
                    <Select size='small' getPopupContainer={() => refTest.current} mode='multiple'>
                        {Object.keys(PluginType).map((key) => (
                            <Option value={key} key={key}>
                                {PluginType[key]}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                {user && (
                    <Form.Item name='is_private' label='私密/公开'>
                        <Select size='small' getPopupContainer={() => refTest.current} onSelect={onSelect}>
                            <Option value='true'>私密</Option>
                            <Option value='false'>公开</Option>
                        </Select>
                    </Form.Item>
                )}
                {((!user && isAdmin) || (user && isShowStatus) || (!user && userInfo.showStatusSearch)) && (
                    <Form.Item name='status' label='审核状态'>
                        <Select size='small' getPopupContainer={() => refTest.current}>
                            <Option value='all'>全部</Option>
                            {Object.keys(statusType).map((key) => (
                                <Option value={key} key={key}>
                                    {statusType[key]}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}
                <div className='form-btns'>
                    <Button type='primary' htmlType='submit' size='small'>
                        设置查询条件
                    </Button>
                    <Button size='small' onClick={onReset}>
                        重置搜索
                    </Button>
                </div>
            </Form>
        </div>
    )
}

interface PluginFilterProps {
    queryChildren: ReactNode
    size: "middle" | "small"
    isFilter: boolean
    visibleQuery: boolean
    setVisibleQuery: (b: boolean) => void
}

const PluginFilter: React.FC<PluginFilterProps> = (props) => {
    const {queryChildren, size, isFilter, visibleQuery, setVisibleQuery} = props
    // const [visibleQuery, setVisibleQuery] = useState<boolean>(false)
    return (
        <Popconfirm
            title={queryChildren}
            placement='bottomLeft'
            icon={null}
            overlayClassName='pop-confirm'
            visible={visibleQuery}
        >
            {(size === "small" && (
                <Tooltip title='查询'>
                    <FilterOutlined
                        className={`operation-icon ${isFilter && "operation-icon-active"}`}
                        onClick={() => setVisibleQuery(true)}
                    />
                </Tooltip>
            )) || (
                <div
                    className={`full-filter  ${isFilter && "operation-icon-active"}`}
                    onClick={() => setVisibleQuery(true)}
                >
                    <FilterOutlined className='filter-icon' />
                    筛选
                </div>
            )}
        </Popconfirm>
    )
}
