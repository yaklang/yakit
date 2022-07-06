import React, {useEffect, useRef, useState} from "react"
import {Button, Checkbox, Form, Popover, Space, Tooltip, Typography} from "antd"
import {QuestionCircleOutlined, UserOutlined, SettingOutlined, SearchOutlined, CodeOutlined} from "@ant-design/icons"
import {YakScript} from "../pages/invoker/schema"
import {AutoCard, AutoCardProps} from "./AutoCard"
import ReactResizeDetector from "react-resize-detector"
import {useMemoizedFn, useVirtualList} from "ahooks"
import {showModal} from "../utils/showModal"
import {InputInteger, InputItem, OneLine} from "../utils/inputUtil"

import "./PluginList.css"
import {YakEditor} from "../utils/editors"

const {Text} = Typography

export interface PluginListProp extends AutoCardProps {
    loading: boolean
    lists: YakScript[]
    getLists: () => YakScript[]
    total: number
    selected: string[]
    allSelectScript: (flag: boolean) => any
    selectScript: (info: YakScript) => any
    unSelectScript: (info: YakScript) => any
    search: (params: {limit: number; keyword: string}) => any
    extra?: React.ReactNode
    disabled?: boolean
    readOnly?: boolean
}

interface YakScriptCheckboxProp {
    info: YakScript
    vlistWidth: string | number | any
    selected: string[]
    selectScript: (i: YakScript) => any
    unSelectScript: (i: YakScript) => any
    disabled?: boolean
    readOnly?: boolean
}

const YakScriptCheckbox: React.FC<YakScriptCheckboxProp> = React.memo((props) => {
    const {info, selected, vlistWidth, selectScript, unSelectScript} = props

    return (
        <div key={info.ScriptName} className='list-opt'>
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
                                        <YakEditor
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
        selectScript,
        unSelectScript,
        disabled,
        search,
        extra,
        ...restCard
    } = props

    const [limit, setLimit] = useState(200)
    const [keyword, setKeyword] = useState("")
    const [indeterminate, setIndeterminate] = useState(false)
    const [checked, setChecked] = useState(false)

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

    return (
        <div className='plugin-list-body'>
            <AutoCard
                size='small'
                bordered={false}
                {...restCard}
                extra={
                    !props.readOnly && (
                        <Space>
                            <Popover
                                title={"额外设置"}
                                trigger={["click"]}
                                content={
                                    <div>
                                        <Form
                                            size={"small"}
                                            onSubmitCapture={(e) => {
                                                e.preventDefault()
                                                search({limit: limit, keyword: keyword})
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
                            <Popover
                                title={"搜索插件关键字"}
                                trigger={["click"]}
                                content={
                                    <div>
                                        <Form
                                            size={"small"}
                                            onSubmitCapture={(e) => {
                                                e.preventDefault()
                                                search({limit: limit, keyword: keyword})
                                            }}
                                        >
                                            <InputItem
                                                label={""}
                                                extraFormItemProps={{
                                                    style: {marginBottom: 4},
                                                    colon: false
                                                }}
                                                value={keyword}
                                                setValue={setKeyword}
                                            />
                                            <Form.Item colon={false} label={""} style={{marginBottom: 10}}>
                                                <Button type='primary' htmlType='submit'>
                                                    搜索
                                                </Button>
                                            </Form.Item>
                                        </Form>
                                    </div>
                                }
                            >
                                <Button
                                    size={"small"}
                                    type={!!keyword ? "primary" : "link"}
                                    icon={<SearchOutlined />}
                                />
                            </Popover>
                            <Checkbox
                                disabled={props.disabled}
                                indeterminate={indeterminate}
                                onChange={(r) => allSelectScript(r.target.checked)}
                                checked={checked}
                            >
                                全选
                            </Checkbox>
                            {extra || <></>}
                        </Space>
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
                                readOnly={props.readOnly}
                                info={i.data}
                                selectScript={selectScript}
                                unSelectScript={unSelectScript}
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
