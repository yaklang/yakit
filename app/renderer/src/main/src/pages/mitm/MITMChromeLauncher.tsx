import React, {CSSProperties, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {Alert, Form, Space, Tooltip, Typography, Modal} from "antd"
import {failed, info, yakitNotify} from "../../utils/notification"
import {CheckOutlined, CloseOutlined, CloudUploadOutlined, ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import style from "./MITMPage.module.scss"
import {
    BanIcon,
    ChromeFrameSvgIcon,
    ChromeSvgIcon,
    PencilAltIcon,
    PlusIcon,
    RemoveIcon,
    TrashIcon
} from "@/assets/newIcon"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {CacheDropDownGV, RemoteGV} from "@/yakitGV"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {MITMConsts} from "./MITMConsts"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import classNames from "classnames"
import {OutlineSaveIcon} from "@/assets/icon/outline"
import {v4 as uuidv4} from "uuid"
import {chromeLauncherParamsArr} from "@/defaultConstants/mitm"
import {SolidStoreIcon} from "@/assets/icon/solid"

/**
 * @param {boolean} isStartMITM 是否开启mitm服务，已开启mitm服务，显示switch。 未开启显示按钮
 */
interface ChromeLauncherButtonProp {
    host?: string
    port?: number
    onFished?: (host: string, port: number) => void
    isStartMITM?: boolean
    repRuleFlag?: boolean
    disableCACertPage: boolean
    onSetVisible?: (visible: boolean) => void
}

interface MITMChromeLauncherProp {
    host?: string
    port?: number
    disableCACertPage: boolean
    callback: (host: string, port: number) => void
}

const {ipcRenderer} = window.require("electron")
const {Text} = Typography

const MITMChromeLauncher: React.FC<MITMChromeLauncherProp> = (props) => {
    const [params, setParams] = useState<{host: string; port: number}>({
        host: props.host ? props.host : "127.0.0.1",
        port: props.port ? props.port : 8083
    })
    const userDataDirRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const [defUserDataDir, setDefUserDataDir] = useState<string>("")
    const [isSaveUserData, setSaveUserData] = useState<boolean>(false)
    const [userDataDir, setUserDataDir] = useState<string>("")

    const [chromeLauncherParamsVisible, setChromeLauncherParamsVisible] = useState<boolean>(false)
    const chromeLauncherParamsSetRef = useRef<ChromeLauncherParamsSetRefProps>({
        data: [],
        tempEditItem: undefined
    })

    useEffect(() => {
        // 获取连接引擎的地址参数
        ipcRenderer
            .invoke("fetch-yaklang-engine-addr")
            .then((data) => {
                if (data.addr === `${params.host}:${params.port}`) return
                const hosts: string[] = (data.addr as string).split(":")
                if (hosts.length !== 2) return
                setParams({...params, host: hosts[0]})
            })
            .catch(() => {})

        getRemoteValue(RemoteGV.MITMUserDataSave).then((cacheRes) => {
            setSaveUserData(cacheRes === "true")
        })

        ipcRenderer.invoke("getDefaultUserDataDir").then((e: string) => {
            setDefUserDataDir(e)
        })
    }, [])
    return (
        <Form
            labelCol={{span: 4}}
            wrapperCol={{span: 18}}
            onSubmitCapture={async (e) => {
                e.preventDefault()
                // 代理认证用户名
                let username = (await getRemoteValue(MITMConsts.MITMDefaultProxyUsername)) || ""
                // 代理认证用户密码
                let password = (await getRemoteValue(MITMConsts.MITMDefaultProxyPassword)) || ""
                let newParams: {
                    host: string
                    port: number
                    chromePath?: string
                    userDataDir?: string
                    username?: string
                    password?: string
                    disableCACertPage: boolean
                    chromeFlags: ChromeLauncherParams[]
                } = {
                    ...params,
                    username,
                    password,
                    userDataDir,
                    disableCACertPage: props.disableCACertPage,
                    chromeFlags: []
                }

                setRemoteValue(RemoteGV.MITMUserDataSave, isSaveUserData + "")
                userDataDirRef.current?.onSetRemoteValues(userDataDir)

                Promise.allSettled([
                    getRemoteValue(RemoteGV.GlobalChromePath),
                    getRemoteValue(RemoteGV.ChromeLauncherParams)
                ]).then((res) => {
                    if (res[0].status === "fulfilled") {
                        const value = res[0].value
                        if (value) {
                            newParams.chromePath = JSON.parse(value)
                        }
                    }

                    if (res[1].status === "fulfilled") {
                        const value = res[1].value
                        if (value) {
                            try {
                                newParams.chromeFlags = JSON.parse(value)
                            } catch (error) {
                                newParams.chromeFlags = chromeLauncherParamsArr
                            }
                        } else {
                            newParams.chromeFlags = chromeLauncherParamsArr
                        }
                    } else {
                        newParams.chromeFlags = chromeLauncherParamsArr
                    }

                    ipcRenderer
                        .invoke("LaunchChromeWithParams", newParams)
                        .then((e) => {
                            props.callback(params.host, params.port)
                        })
                        .catch((e) => {
                            failed(`Chrome 启动失败：${e}`)
                        })
                })
            }}
            style={{padding: 24}}
        >
            <Form.Item label={"配置代理"}>
                <YakitInput.Group className={style["chrome-input-group"]}>
                    <YakitInput
                        prefix={"http://"}
                        onChange={(e) => setParams({...params, host: e.target.value})}
                        value={params.host}
                        wrapperStyle={{width: 165}}
                    />
                    <YakitInput
                        prefix={":"}
                        onChange={(e) => {
                            setParams({...params, port: parseInt(e.target.value) || 0})
                        }}
                        value={`${params.port}`}
                        wrapperStyle={{width: 80}}
                    />
                </YakitInput.Group>
            </Form.Item>
            <Form.Item label={" "} colon={false}>
                <YakitCheckbox
                    checked={isSaveUserData}
                    onChange={(e) => {
                        setSaveUserData(e.target.checked)
                    }}
                >
                    保存用户数据
                </YakitCheckbox>
            </Form.Item>
            {isSaveUserData && (
                <Form.Item label={" "} colon={false} help={"如要打开新窗口，请设置新路径存储用户数据"}>
                    <YakitAutoComplete
                        ref={userDataDirRef}
                        style={{width: "calc(100% - 20px)"}}
                        cacheHistoryDataKey={CacheDropDownGV.MITMSaveUserDataDir}
                        cacheHistoryListLength={5}
                        initValue={defUserDataDir}
                        value={userDataDir}
                        placeholder='设置代理'
                        onChange={(v) => {
                            setUserDataDir(v)
                        }}
                    />
                    <Tooltip title={"选择存储路径"}>
                        <CloudUploadOutlined
                            onClick={() => {
                                ipcRenderer
                                    .invoke("openDialog", {
                                        title: "请选择文件夹",
                                        properties: ["openDirectory"]
                                    })
                                    .then((data: any) => {
                                        if (data.filePaths.length) {
                                            let absolutePath: string = data.filePaths[0].replace(/\\/g, "\\")
                                            setUserDataDir(absolutePath)
                                        }
                                    })
                            }}
                            style={{position: "absolute", right: 0, top: 8, cursor: "pointer"}}
                        />
                    </Tooltip>
                </Form.Item>
            )}
            <Form.Item
                colon={false}
                label={" "}
                help={
                    <Space style={{width: "100%", marginBottom: 20}} direction={"vertical"} size={4}>
                        <Alert
                            style={{marginTop: 4}}
                            type={"success"}
                            message={
                                <>
                                    本按钮将会启动一个代理已经被正确配置的 Chrome (使用系统 Chrome 浏览器配置)
                                    <br /> <Text mark={true}>无需用户额外启用代理</Text>
                                    ，同时把测试浏览器和日常浏览器分离
                                </>
                            }
                        />
                        <Alert
                            style={{marginTop: 4}}
                            type={"error"}
                            message={
                                <>
                                    <Text mark={true}>注意：</Text>
                                    <br />
                                    免配置的浏览器启用了 <Text code={true}>{`--ignore-certificate-errors`}</Text> <br />
                                    这个选项是 <Text mark={true}>生效的</Text>，会忽略所有证书错误，
                                    <Text mark={true}>仅推荐安全测试时开启</Text>
                                </>
                            }
                        />
                    </Space>
                }
            >
                <YakitButton
                    type='primary'
                    htmlType='submit'
                    size='large'
                    disabled={isSaveUserData === true && userDataDir.length === 0}
                >
                    启动免配置 Chrome
                </YakitButton>
                <YakitButton type='text' onClick={() => setChromeLauncherParamsVisible(true)}>
                    更多参数
                </YakitButton>
                {chromeLauncherParamsVisible && (
                    <YakitModal
                        title='浏览器参数配置'
                        visible={chromeLauncherParamsVisible}
                        onCancel={() => setChromeLauncherParamsVisible(false)}
                        closable={true}
                        maskClosable={false}
                        mask={false}
                        width='55%'
                        bodyStyle={{padding: 0}}
                        onOk={() => {
                            if (chromeLauncherParamsSetRef.current.tempEditItem) {
                                yakitNotify("info", "存在编辑项未保存，请点击保存按钮")
                                return
                            }

                            const values = chromeLauncherParamsSetRef.current.data
                                .map((item) => item["parameterName"])
                                .filter((item) => item)
                            const arr = values.filter((value, index) => values.indexOf(value) !== index)
                            if (arr.length) {
                                yakitNotify("info", `存在相同参数名：${arr.join(",")}`)
                                return
                            }

                            const flag = chromeLauncherParamsSetRef.current.data.some(
                                (value) => value.parameterName === "" && value.variableValues
                            )
                            if (flag) {
                                yakitNotify("info", "存在参数名未填写")
                                return
                            }

                            const saveChromeLauncherParamsArr = chromeLauncherParamsSetRef.current.data.filter(
                                (item) =>
                                    item["parameterName"] &&
                                    !["--proxy-server", "--disable-extensions-except", "--load-extension"].includes(
                                        item["parameterName"]
                                    )
                            )
                            setRemoteValue(RemoteGV.ChromeLauncherParams, JSON.stringify(saveChromeLauncherParamsArr))
                            setChromeLauncherParamsVisible(false)
                        }}
                    >
                        <ChromeLauncherParamsSet ref={chromeLauncherParamsSetRef} />
                    </YakitModal>
                )}
            </Form.Item>
        </Form>
    )
}

const ChromeLauncherButton: React.FC<ChromeLauncherButtonProp> = React.memo((props: ChromeLauncherButtonProp) => {
    const {isStartMITM, host, port, onFished, repRuleFlag = false, disableCACertPage, onSetVisible} = props
    const [started, setStarted] = useState(false)
    const [chromeVisible, setChromeVisible] = useState(false)

    useEffect(() => {
        const id = setInterval(() => {
            ipcRenderer.invoke("IsChromeLaunched").then((e) => {
                setStarted(e)
            })
        }, 500)
        return () => {
            clearInterval(id)
        }
    }, [])
    const onSwitch = useMemoizedFn((c: boolean) => {
        setChromeVisible(true)
        // if (c) {
        //     setChromeVisible(true)
        // } else {
        //     onCloseChrome()
        // }
    })
    const onCloseChrome = useMemoizedFn(() => {
        ipcRenderer
            .invoke("StopAllChrome")
            .then(() => {
                info("关闭所有免配置 Chrome 成功")
            })
            .catch((e) => {
                failed(`关闭所有 Chrome 失败: ${e}`)
            })
    })

    const clickChromeLauncher = useMemoizedFn(() => {
        if (repRuleFlag) {
            Modal.confirm({
                title: "温馨提示",
                icon: <ExclamationCircleOutlined />,
                content: "检测到开启了替换规则，可能会影响劫持，是否确认开启？",
                okText: "确认",
                cancelText: "去配置",
                closable: true,
                centered: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className='modal-remove-icon'
                    >
                        <RemoveIcon />
                    </div>
                ),
                onOk: () => {
                    setChromeVisible(true)
                },
                onCancel: () => {
                    onSetVisible && onSetVisible(true)
                    Modal.destroyAll()
                },
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
            return
        }
        setChromeVisible(true)
    })

    return (
        <>
            {(isStartMITM && (
                <>
                    <YakitButton type='outline2' onClick={() => onSwitch(!started)}>
                        {(started && <ChromeSvgIcon />) || (
                            <ChromeFrameSvgIcon style={{height: 16, color: "var(--yakit-body-text-color)"}} />
                        )}
                        免配置启动
                        {started && <CheckOutlined style={{color: "var(--yakit-success-5)", marginLeft: 8}} />}
                    </YakitButton>
                    {started && (
                        <Tooltip title={"关闭所有免配置 Chrome"}>
                            <YakitButton
                                type='outline2'
                                onClick={() => {
                                    onCloseChrome()
                                }}
                            >
                                <CloseOutlined style={{color: "var(--yakit-success-5)"}} />
                            </YakitButton>
                        </Tooltip>
                    )}
                </>
            )) || (
                <YakitButton type='outline2' size='large' onClick={clickChromeLauncher}>
                    <ChromeFrameSvgIcon style={{height: 16, color: "var(--yakit-body-text-color)"}} />
                    <span style={{marginLeft: 4}}>免配置启动</span>
                </YakitButton>
            )}
            {chromeVisible && (
                <YakitModal
                    title='确定启动免配置 Chrome 参数'
                    visible={chromeVisible}
                    onCancel={() => setChromeVisible(false)}
                    closable={true}
                    width='50%'
                    footer={null}
                    bodyStyle={{padding: 0}}
                >
                    <MITMChromeLauncher
                        host={host}
                        port={port}
                        disableCACertPage={disableCACertPage}
                        callback={(host, port) => {
                            setChromeVisible(false)
                            if (!isStartMITM) {
                                // 记录时间戳
                                const nowTime: string = Math.floor(new Date().getTime() / 1000).toString()
                                setRemoteValue(MITMConsts.MITMStartTimeStamp, nowTime)
                                if (onFished) onFished(host, port)
                            }
                        }}
                    />
                </YakitModal>
            )}
        </>
    )
})
export default ChromeLauncherButton

export interface ChromeLauncherParams {
    id: number
    parameterName: string
    variableValues: string
    variableType: "input" | "bool"
    desc: string
    disabled: boolean
    default: boolean
    cellStyle?: CSSProperties
}
interface ChromeLauncherParamsSetRefProps {
    data: ChromeLauncherParams[]
    tempEditItem?: ChromeLauncherParams
}
interface ChromeLauncherParamsSetProps {
    ref?: React.ForwardedRef<ChromeLauncherParamsSetRefProps>
}
const ChromeLauncherParamsSet: React.FC<ChromeLauncherParamsSetProps> = React.forwardRef((props, ref) => {
    const [currentItem, setCurrentItem] = useState<ChromeLauncherParams>()
    const [data, setData] = useState<ChromeLauncherParams[]>([])
    const tempEditItem = useRef<ChromeLauncherParams>()
    const [tempEditId, setTempEditId] = useState<number>()
    const [searchVal, setSearchVal] = useState<string>("")
    const [searchData, setSearchData] = useState<ChromeLauncherParams[]>([])

    useImperativeHandle(
        ref,
        () => ({
            data: data,
            tempEditItem: tempEditItem.current
        }),
        [data, tempEditItem]
    )

    useEffect(() => {
        getRemoteValue(RemoteGV.ChromeLauncherParams).then((setting) => {
            if (setting) {
                try {
                    const arr = JSON.parse(setting)
                    setData(arr)
                } catch (error) {
                    setData(chromeLauncherParamsArr)
                }
            } else {
                setData(chromeLauncherParamsArr)
            }
        })
    }, [])

    const onRemove = useMemoizedFn((record: ChromeLauncherParams) => {
        if (record.id === tempEditId) {
            tempEditItem.current = undefined
            setTempEditId(undefined)
        }
        if (record.id === currentItem?.id) {
            setCurrentItem(undefined)
        }
        setData(data.filter((t) => t.id !== record.id))
        if (searchVal) setSearchData(searchData.filter((t) => t.id !== record.id))
    })

    const onEdit = useMemoizedFn((record: ChromeLauncherParams) => {
        setData(handleEditData(data, record))
        if (searchVal) setSearchData(handleEditData(searchData, record))
    })
    const handleEditData = (arr: ChromeLauncherParams[], record: ChromeLauncherParams) => {
        const newData: ChromeLauncherParams[] = arr.map((item: ChromeLauncherParams) => {
            if (item.id === record.id) {
                item = {
                    ...item,
                    cellStyle: {
                        padding: "6px 0"
                    }
                }
                tempEditItem.current = item
                setTempEditId(record.id)
            }
            return item
        })
        return newData
    }

    const onSave = useMemoizedFn((record: ChromeLauncherParams) => {
        setData(handleSaveData(data, record))
        if (searchVal)
            setSearchData(
                handleSaveData(searchData, record).filter((item) =>
                    item.parameterName.toLocaleLowerCase().includes(searchVal.toLocaleLowerCase())
                )
            )
        tempEditItem.current = undefined
        setTempEditId(undefined)
    })
    const handleSaveData = (arr: ChromeLauncherParams[], record: ChromeLauncherParams) => {
        const newData: ChromeLauncherParams[] = arr.map((item: ChromeLauncherParams) => {
            if (item.id === record.id && tempEditItem.current) {
                item = {
                    ...tempEditItem.current,
                    cellStyle: undefined
                }
            }
            return item
        })
        return newData
    }

    const onBan = useMemoizedFn((record: ChromeLauncherParams) => {
        setData(handleBan(data, record))
        if (searchVal) setSearchData(handleBan(searchData, record))
    })
    const handleBan = (arr: ChromeLauncherParams[], record: ChromeLauncherParams) => {
        const newData: ChromeLauncherParams[] = arr.map((item: ChromeLauncherParams) => {
            if (item.id === record.id) {
                if (!record.disabled && record.id === currentItem?.id) {
                    setCurrentItem(undefined)
                }
                item = {
                    ...record,
                    disabled: !record.disabled
                }
            }
            return item
        })
        return newData
    }

    const disabledEdit = useMemoizedFn((record: ChromeLauncherParams) => {
        return (
            record.variableType === "bool" || record.disabled || !(tempEditId === undefined || tempEditId === record.id)
        )
    })
    const disabledBan1 = useMemoizedFn((record: ChromeLauncherParams) => {
        return record.disabled && !record.cellStyle
    })
    const disabledBan2 = useMemoizedFn((record: ChromeLauncherParams) => {
        return record.cellStyle && !record.disabled
    })
    const disabledTrash = useMemoizedFn((record: ChromeLauncherParams) => {
        return record.default || record.disabled
    })

    const columns: ColumnsTypeProps[] = useMemo(() => {
        return [
            {
                title: "参数名",
                dataKey: "parameterName",
                customStyle: true,
                render: (text, record: ChromeLauncherParams) => {
                    return record.cellStyle && !record.default ? (
                        <YakitInput
                            defaultValue={text}
                            style={{borderRadius: 0, borderColor: "var(--yakit-primary-5)"}}
                            autoFocus={!record.default}
                            onChange={(e) => {
                                if (tempEditItem.current) {
                                    tempEditItem.current = {
                                        ...tempEditItem.current,
                                        parameterName: e.target.value.trim()
                                    }
                                }
                            }}
                        />
                    ) : (
                        <div
                            className='content-ellipsis'
                            style={{
                                paddingLeft: record.cellStyle ? 12 : undefined,
                                color: record.disabled ? "var(--yakit-disable-text-color)" : undefined
                            }}
                        >
                            {text}
                        </div>
                    )
                }
            },
            {
                title: "变量值（bool类型值为空）",
                dataKey: "variableValues",
                customStyle: true,
                render: (text, record: ChromeLauncherParams) => {
                    return record.variableType === "input" ? (
                        record.cellStyle ? (
                            <YakitInput
                                defaultValue={text}
                                style={{borderRadius: 0, borderColor: "var(--yakit-primary-5)"}}
                                autoFocus={record.default}
                                onChange={(e) => {
                                    if (tempEditItem.current) {
                                        tempEditItem.current = {
                                            ...tempEditItem.current,
                                            variableValues: e.target.value.trim()
                                        }
                                    }
                                }}
                            />
                        ) : (
                            <div
                                className='content-ellipsis'
                                style={{color: record.disabled ? "var(--yakit-disable-text-color)" : undefined}}
                            >
                                {text}
                            </div>
                        )
                    ) : (
                        ""
                    )
                }
            },
            {
                title: "操作",
                dataKey: "action",
                width: 128,
                fixed: "right",
                render: (_, record: ChromeLauncherParams) => {
                    return (
                        <div className={style["table-action-icon"]}>
                            {record.cellStyle ? (
                                <Tooltip title={"保存"}>
                                    <SolidStoreIcon
                                        className={classNames(style["action-icon"], style["action-icon-save"])}
                                        onClick={(e) => {
                                            onSave(record)
                                        }}
                                    />
                                </Tooltip>
                            ) : (
                                <Tooltip title={disabledEdit(record) ? "" : "编辑"}>
                                    <PencilAltIcon
                                        className={classNames(style["action-icon"], {
                                            [style["action-icon-edit-disabled"]]: disabledEdit(record)
                                        })}
                                        onClick={(e) => {
                                            if (disabledEdit(record)) {
                                                return
                                            }
                                            onEdit(record)
                                        }}
                                    />
                                </Tooltip>
                            )}
                            <Tooltip title={disabledBan2(record) ? "" : disabledBan1(record) ? "启用" : "禁用"}>
                                <BanIcon
                                    className={classNames(style["action-icon"], {
                                        [style["action-icon-ban-disabled"]]: disabledBan1(record),
                                        [style["action-icon-ban-disabled2"]]: disabledBan2(record)
                                    })}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (disabledBan2(record)) {
                                            return
                                        }
                                        onBan(record)
                                    }}
                                />
                            </Tooltip>
                            <TrashIcon
                                className={classNames(style["icon-trash"], {
                                    [style["action-icon-trash-disabled"]]: disabledTrash(record)
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (disabledTrash(record)) {
                                        return
                                    }
                                    onRemove(record)
                                }}
                            />
                        </div>
                    )
                }
            }
        ]
    }, [tempEditId])

    const onSetCurrentRow = useDebounceFn(
        (rowDate: ChromeLauncherParams) => {
            setCurrentItem(rowDate)
        },
        {wait: 200}
    ).run

    useEffect(() => {
        const arr = data.filter((item) =>
            item.parameterName.toLocaleLowerCase().includes(searchVal.toLocaleLowerCase())
        )
        setSearchData(arr)
    }, [searchVal])

    return (
        <div className={style["chrome-launcher-params-set-wrap"]}>
            <TableVirtualResize<ChromeLauncherParams>
                enableDrag={false}
                titleHeight={42}
                title={
                    <YakitInput.Search
                        style={{width: 250}}
                        placeholder='请输入参数名搜索'
                        allowClear={true}
                        onSearch={(value) => setSearchVal(value.trim())}
                    />
                }
                extra={
                    <YakitButton
                        type='primary'
                        disabled={tempEditId !== undefined}
                        onClick={() => {
                            const newItem: ChromeLauncherParams = {
                                id: uuidv4(),
                                parameterName: "",
                                variableValues: "",
                                variableType: "input",
                                disabled: false,
                                desc: "",
                                default: false
                            }
                            setData((prevData) => [newItem, ...prevData])
                            if (searchVal) setSearchData((prevData) => [newItem, ...prevData])
                            setTimeout(() => {
                                onSetCurrentRow(newItem)
                                onEdit(newItem)
                            }, 50)
                        }}
                    >
                        <div className={style["button-add-params"]}>
                            <PlusIcon />
                            添加新参数
                        </div>
                    </YakitButton>
                }
                isRefresh={false}
                renderKey='id'
                data={searchVal ? searchData : data}
                columns={columns}
                onRowClick={onSetCurrentRow}
                currentSelectItem={currentItem}
                pagination={{
                    total: searchVal ? searchData.length : data.length,
                    limit: 20,
                    page: 1,
                    onChange: () => {}
                }}
            />
        </div>
    )
})
