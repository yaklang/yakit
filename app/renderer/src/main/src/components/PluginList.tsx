import React, {useEffect, useRef, useState} from "react"
import {Button, Checkbox, Form, Input, Popover, Space, Tag, Tooltip, Typography} from "antd"
import {CodeOutlined, QuestionCircleOutlined, SettingOutlined, UserOutlined} from "@ant-design/icons"
import {YakScript} from "../pages/invoker/schema"
import {AutoCard, AutoCardProps} from "./AutoCard"
import ReactResizeDetector from "react-resize-detector"
import {useVirtualList} from "ahooks"
import {showModal} from "../utils/showModal"
import {InputInteger, OneLine} from "../utils/inputUtil"
import {YakFilterModuleList} from "@/pages/yakitStore/YakitStorePage"
import "./PluginList.css"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor";

export interface PluginListProp extends AutoCardProps {
    loading: boolean
    lists: YakScript[]
    getLists: () => YakScript[]
    total: number
    selected: string[]
    allSelectScript: (flag: boolean) => any
    manySelectScript: (v: string[]) => void
    selectScript: (info: YakScript) => any
    onClickScript?: (info: YakScript) => any
    unSelectScript: (info: YakScript) => any
    search: (params: {limit: number; keyword: string}, tag: string[]) => any
    extra?: React.ReactNode
    disabled?: boolean
    readOnly?: boolean
    sourceType?: string
    singleSelectMode?: boolean
}

interface YakScriptCheckboxProp {
    info: YakScript
    vlistWidth: string | number | any
    selected: string[]
    selectScript: (i: YakScript) => any
    unSelectScript: (i: YakScript) => any
    onClickScript?: (i: YakScript) => any
    disabled?: boolean
    readOnly?: boolean
}

const YakScriptCheckbox: React.FC<YakScriptCheckboxProp> = React.memo((props) => {
    const {info, selected, vlistWidth, selectScript, unSelectScript} = props

    return (
        <div key={info.ScriptName} className='list-opt' onClick={()=>{
            if (props.onClickScript) {
                props.onClickScript(props.info)
            }
        }}>
            {props.readOnly ? (
                <OneLine width={vlistWidth} overflow={"hidden"}>
                    <div>{info.ScriptName}</div>
                </OneLine>
            ) : (
                <Checkbox
                    disabled={props.disabled}
                    checked={selected.includes(info.ScriptName)}
                    onChange={(r) => {
                        if (r.target.checked) selectScript(info)
                        else unSelectScript(info)
                    }}
                >
                    <OneLine width={vlistWidth} overflow={"hidden"}>
                        <div>{info.ScriptName}</div>
                    </OneLine>
                </Checkbox>
            )}
            <div style={{flex: 1, textAlign: "right"}}>
                {info.Help && (
                    <a
                        onClick={() => {
                            showModal({
                                width: "40%",
                                title: "Help",
                                content: <>{info.Help}</>
                            })
                        }}
                        href={"#"}
                        style={{marginLeft: 2, marginRight: 2}}
                    >
                        <QuestionCircleOutlined />
                    </a>
                )}
                {info.Author && (
                    <Tooltip title={info.Author}>
                        <a href={"#"} style={{marginRight: 2, marginLeft: 2}}>
                            <UserOutlined />
                        </a>
                    </Tooltip>
                )}
                {!!info.Content && props.readOnly && (
                    <a
                        href={"#"}
                        style={{marginRight: 2, marginLeft: 2}}
                        onClick={() => {
                            showModal({
                                title: info.ScriptName,
                                width: "60%",
                                content: (
                                    <div style={{height: 400}}>
                                        <YakitEditor
                                            type={info.Type === "nuclei" ? "yaml" : "yak"}
                                            readOnly={true}
                                            value={info.Content}
                                        />
                                    </div>
                                )
                            })
                        }}
                    >
                        <CodeOutlined />
                    </a>
                )}
            </div>
        </div>
    )
})

export const PluginList: React.FC<PluginListProp> = React.memo((props) => {
    const {
        loading,
        lists,
        getLists,
        total,
        selected,
        allSelectScript,
        manySelectScript,
        selectScript,
        unSelectScript,
        onClickScript,
        disabled,
        search,
        extra,
        sourceType,
        ...restCard
    } = props

    const [limit, setLimit] = useState(200)
    const [keyword, setKeyword] = useState("")
    const [indeterminate, setIndeterminate] = useState(false)
    const [checked, setChecked] = useState(false)
    const [tag, setTag] = useState<string[]>([])
    const containerRef = useRef()
    const wrapperRef = useRef()
    const [list] = useVirtualList(getLists(), {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 40,
        overscan: 20
    })
    const [vlistWidth, setVListWidth] = useState(260)
    const [vlistHeigth, setVListHeight] = useState(600)

    const [searchType, setSearchType] = useState<"Tags" | "Keyword">("Tags")
    const [refresh, setRefresh] = useState<boolean>(true)
    const [searchKeyword,setSearchKeyword] = useState<string>("")
    let isRefresh = useRef<boolean>(false)
    useEffect(()=>{
        if(isRefresh.current){
            search({limit: limit, keyword: searchKeyword.trim()}, tag)
        }
        isRefresh.current = true
    },[refresh])

    useEffect(() => {
        const totalYakScript = lists.length
        const filterArr = lists.filter((item) => selected.indexOf(item.ScriptName) > -1)

        const IndeterminateFlag =
            (filterArr.length > 0 && filterArr.length < totalYakScript && selected.length !== 0) ||
            (filterArr.length === 0 && selected.length !== 0)
        const checkedFlag = filterArr.length === totalYakScript && selected.length !== 0

        setIndeterminate(IndeterminateFlag)
        setChecked(checkedFlag)
    }, [selected, lists])

    const settingRender = () => (
        <Popover
            title={"额外设置"}
            trigger={["click"]}
            content={
                <div>
                    <Form
                        size={"small"}
                        onSubmitCapture={(e) => {
                            e.preventDefault()
                            search({limit: limit, keyword: keyword}, tag)
                        }}
                    >
                        <InputInteger
                            label={"插件展示数量"}
                            value={limit}
                            setValue={setLimit}
                            formItemStyle={{marginBottom: 4}}
                        />
                        <Form.Item colon={false} label={""} style={{marginBottom: 10}}>
                            <Button type='primary' htmlType='submit'>
                                刷新
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            }
        >
            <Button size={"small"} icon={<SettingOutlined />} type={"link"} />
        </Popover>
    )
    return (
        <div className='plugin-list-body'>
            <AutoCard
                size='small'
                bordered={false}
                {...restCard}
                title={
                    !props.readOnly && (
                        <>
                            {sourceType?
                            <YakFilterModuleList
                            TYPE={sourceType}
                            tag={tag}
                            setTag={(v) => {
                                setTag(v)
                                search({limit: limit, keyword: keyword}, v)
                            }}
                            checkAll={checked}
                            onCheckAllChange={allSelectScript}
                            setSearchKeyword={(value) => {
                                setSearchKeyword(value)
                            }}
                            checkList={selected}
                            searchType={searchType}
                            setSearchType={setSearchType}
                            refresh={refresh}
                            setRefresh={setRefresh}
                            onDeselect={() => {}}
                            multipleCallBack={(value) => {
                                manySelectScript(value)
                            }}
                            settingRender={settingRender}
                            // 加载动态tags公共列表
                            commonTagsSelectRender={true}
                        />:<Space>
                                <Input.Search
                                    onSearch={(value) => {
                                        search({limit: limit, keyword: value.trim()}, tag)
                                    }}
                                    size={"small"}
                                    style={{width: 140}}
                                />
                                <Popover
                                    title={"额外设置"}
                                    trigger={["click"]}
                                    content={
                                        <div>
                                            <Form
                                                size={"small"}
                                                onSubmitCapture={(e) => {
                                                    e.preventDefault()
                                                    search({limit: limit, keyword: keyword}, tag)
                                                }}
                                            >
                                                <InputInteger
                                                    label={"插件展示数量"}
                                                    value={limit}
                                                    setValue={setLimit}
                                                    formItemStyle={{marginBottom: 4}}
                                                />
                                                <Form.Item colon={false} label={""} style={{marginBottom: 10}}>
                                                    <Button type='primary' htmlType='submit'>
                                                        刷新
                                                    </Button>
                                                </Form.Item>
                                            </Form>
                                        </div>
                                    }
                                >
                                    <Button size={"small"} icon={<SettingOutlined />} type={"link"} />
                                </Popover>
                                <Checkbox
                                    disabled={props.disabled}
                                    indeterminate={indeterminate}
                                    onChange={(r) => allSelectScript(r.target.checked)}
                                    checked={checked}
                                >
                                    全选
                                </Checkbox>
                            </Space>
                }
                            {extra || <></>}
                        </>
                    )
                }
            >
                <ReactResizeDetector
                    onResize={(width, height) => {
                        if (!width || !height) {
                            return
                        }
                        setVListWidth(width - 90)
                        setVListHeight(height)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                <div ref={containerRef as any} style={{height: vlistHeigth, overflow: "auto"}}>
                    <div ref={wrapperRef as any}>
                        {list.map((i) => (
                            <YakScriptCheckbox
                                key={i.data.ScriptName}
                                readOnly={props.readOnly || props.singleSelectMode}
                                info={i.data}
                                selectScript={selectScript}
                                unSelectScript={unSelectScript}
                                onClickScript={props.onClickScript}
                                vlistWidth={vlistWidth}
                                selected={selected}
                                disabled={disabled}
                            />
                        ))}
                    </div>
                </div>
            </AutoCard>
        </div>
    )
})
