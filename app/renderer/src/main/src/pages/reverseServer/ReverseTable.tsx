import React, {useMemo, useState} from "react"
import {FullscreenOutlined, FullscreenExitOutlined} from "@ant-design/icons"
import {CopyableField} from "../../utils/inputUtil"
import {useCreation, useDebounce, useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import ReactResizeDetector from "react-resize-detector"

import "./reverseTable.scss"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {FiltersItemProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakitCopyText} from "@/components/yakitUI/YakitCopyText/YakitCopyText"
import {Uint8ArrayToString} from "@/utils/str"
import {isEmptyObject} from "@/utils/tool"

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
    isPayload?: boolean
    total?: number
    data: ReverseNotification[]
    isShowExtra?: boolean
    isExtra?: boolean
    onExtra?: () => any
    clearData: () => any
}

export const ReverseTable: React.FC<ReverseTableProps> = (props) => {
    const {isPayload = false, total, data, isShowExtra = false, isExtra, onExtra, clearData} = props
    const maxWidth = isPayload ? 580 : 545
    const [loading, setLoading] = useState<boolean>(false)
    const [hasToken, setHasToken] = useState<boolean>(false)
    const [types, setTypes, getTypes] = useGetState<string>("")
    const [currentIndex, setCurrentIndex] = useState<number>()
    const [onlyShowFirstNode, setOnlyShowFirstNode] = useState<boolean>(true)
    const [selectRow, setSelectRow] = useState<ReverseNotification>()
    const [width, setWidth] = useState<number>(1000)

    let newData: ReverseNotification[] = useMemo(() => {
        // setLoading(true)
        let lists = [...data]
        if (hasToken) lists = lists.filter((item) => !!item.token)
        if (types) {
            const typeArr = types.split(",")
            lists = lists.filter((i) => typeArr.includes(i.type))
        }

        setTimeout(() => setLoading(false), 200)
        return lists
    }, [data, hasToken, useDebounce(types, {wait: 1000})])

    const onRowClick = useMemoizedFn((rowDate?: ReverseNotification) => {
        if (rowDate) {
            setSelectRow(rowDate)
            setOnlyShowFirstNode(false)
        } else {
            setSelectRow(undefined)
            setOnlyShowFirstNode(true)
        }
    })
    const onSetCurrentRow = useDebounceFn(
        (rowDate: ReverseNotification) => {
            onRowClick(rowDate)
        },
        {wait: 200, leading: true}
    ).run

    const onTableChange = useDebounceFn(
        (page: number, limit: number, sort: SortProps, filter: any) => {
            if (filter.type) {
                setTypes(filter.type.join(","))
            }
        },
        {wait: 500}
    ).run

    const ResizeBoxProps = useCreation(() => {
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (onlyShowFirstNode) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [onlyShowFirstNode])

    return (
        <div className={`reverse-table-wrapper ${isPayload ? "payload-table-padding" : "reverse-table-padding"}`}>
            <ReactResizeDetector
                onResize={(width) => {
                    if (!width) return
                    setWidth(width)
                }}
                handleWidth={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <YakitResizeBox
                isVer={true}
                lineDirection='bottom'
                lineStyle={{display: onlyShowFirstNode ? "none" : ""}}
                secondNodeStyle={{padding: onlyShowFirstNode ? 0 : undefined, display: onlyShowFirstNode ? "none" : ""}}
                {...ResizeBoxProps}
                firstNode={
                    <div style={{padding: isPayload ? "0 12px" : 0}}>
                        <TableVirtualResize<ReverseNotification>
                            renderTitle={
                                <div
                                    className={`reverse-table-header ${
                                        width >= maxWidth ? "header-style" : "header-extra-style"
                                    }`}
                                >
                                    <div className='header-title title-style'>
                                        {total !== undefined && (
                                            <div className='header-title-total'>
                                                Total<span className='header-title-total-number'>{total}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className='header-right'>
                                        <YakitSpin spinning={!!loading}>
                                            <div className='header-extra'>
                                                <div className='extra-opt'>
                                                    <div className='opt-title'>只看 Token</div>
                                                    <YakitSwitch
                                                        checked={hasToken}
                                                        onChange={(check) => {
                                                            setHasToken(check)
                                                            setLoading(true)
                                                        }}
                                                    />
                                                </div>

                                                {/* <div className='extra-opt'>
                                                    <div className='opt-title' style={{width: 35}}>
                                                        类型
                                                    </div>
                                                    <YakitSelect
                                                        size='small'
                                                        mode='multiple'
                                                        style={{width: 170}}
                                                        value={!types ? [] : types.split(",")}
                                                        allowClear={true}
                                                        options={DefaultType}
                                                        onChange={(newValue: string[]) => {
                                                            setTypes(newValue.length === 0 ? "" : newValue.join(","))
                                                        }}
                                                        maxTagCount='responsive'
                                                    />
                                                </div> */}
                                                <YakitButton
                                                    danger={true}
                                                    size='small'
                                                    className='extra-opt'
                                                    onClick={() => {
                                                        setOnlyShowFirstNode(true)
                                                        setSelectRow(undefined)
                                                        clearData()
                                                    }}
                                                >
                                                    清空
                                                </YakitButton>
                                                {isShowExtra && (
                                                    <YakitButton
                                                        type='text'
                                                        className='extra-opt'
                                                        icon={
                                                            !!isExtra ? (
                                                                <FullscreenExitOutlined />
                                                            ) : (
                                                                <FullscreenOutlined />
                                                            )
                                                        }
                                                        onClick={() => {
                                                            if (onExtra) onExtra()
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </YakitSpin>
                                    </div>
                                </div>
                            }
                            data={[...newData]}
                            renderKey='uuid'
                            columns={[
                                {
                                    title: "反连类型",
                                    dataKey: "type",
                                    render: (text) => {
                                        const selectTag = DefaultType.filter((item) => item.value === text)
                                        let label = ""
                                        if (selectTag.length !== 0) label = selectTag[0].label
                                        return (
                                            <div
                                                className={`tag-wrapper tag-${
                                                    !label ? "blue" : DefaultTypeClassName[text]
                                                }`}
                                            >
                                                {!label ? text : label}
                                            </div>
                                        )
                                    },
                                    filterProps: {
                                        filterMultiple: true,
                                        filtersType: "select",
                                        filters: DefaultType
                                    }
                                },
                                {
                                    title: "连接来源",
                                    dataKey: "remote_addr",
                                    render: (text) => <YakitCopyText showText={text} />
                                },
                                {
                                    title: "TOKEN",
                                    dataKey: "token",
                                    render: (text) => <YakitCopyText showText={text} />
                                },
                                {
                                    title: "响应",
                                    dataKey: "response_info"
                                }
                            ]}
                            useUpAndDown={true}
                            currentIndex={currentIndex}
                            setCurrentIndex={setCurrentIndex}
                            onSetCurrentRow={onSetCurrentRow}
                            onChange={onTableChange}
                        />
                    </div>
                }
                secondNode={
                    <YakitEditor
                        readOnly={true}
                        type="http"
                        value={Uint8ArrayToString(selectRow?.raw || new Uint8Array())}
                    />
                }
            ></YakitResizeBox>
            {/* <YakitSelect
                mode='multiple'
                style={{width: 200}}
                value={!types ? [] : types.split(",")}
                allowClear={true}
                options={DefaultType}
                onChange={(newValue: string[]) => setTypes(newValue.length === 0 ? "" : newValue.join(","))}
                maxTagCount='responsive'
            /> */}
        </div>
    )
}
