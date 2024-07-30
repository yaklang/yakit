import React, {useEffect, useRef, useState} from "react"
import {Form, Result, Tag, Tooltip} from "antd"
import {} from "@ant-design/icons"
import {useCreation, useDebounceFn, useInterval, useMemoizedFn, useUpdateEffect, useVirtualList} from "ahooks"
import styles from "./shellReceiver.module.scss"
import {failed, success} from "@/utils/notification"
import classNames from "classnames"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {RemoveIcon, SideBarCloseIcon, SideBarOpenIcon} from "@/assets/newIcon"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {OutlineExitIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidDocumentduplicateIcon} from "@/assets/icon/solid"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {RemoteGV} from "@/yakitGV"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {
    CmdType,
    GenerateReverseShellCommandRequest,
    GenerateReverseShellCommandResponse,
    GetReverseShellProgramListRequest,
    SystemType,
    apiCancelListeningPort,
    apiGenerateReverseShellCommand,
    apiGetReverseShellProgramList
} from "./utils"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {defaultGenerateReverseShellCommand} from "./constants"
import {ReverseShellTerminal} from "./ReverseShellTerminal/ReverseShellTerminal"
import {callCopyToClipboard} from "@/utils/basic"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
const {ipcRenderer} = window.require("electron")

export interface ShellReceiverLeftListProps {
    receiverDetail: GenerateReverseShellCommandRequest
    fold: boolean
    setFold: (v: boolean) => void
    onSetDetail: (value: ReceiverDetail) => void
}

export interface ReceiverDetail {
    System: SystemType
    CmdType: CmdType
    Program: string
}

export const ShellReceiverLeftList: React.FC<ShellReceiverLeftListProps> = (props) => {
    const {receiverDetail, setFold, onSetDetail} = props
    const [params, setParams] = useState<GetReverseShellProgramListRequest>({
        System: defaultGenerateReverseShellCommand.System,
        CmdType: defaultGenerateReverseShellCommand.CmdType
    })
    const [keyWord, setKeyWord] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [refresh, setRefresh] = useState<boolean>(false)
    const [originalList, setOriginalList] = useState<string[]>([])
    const containerRef = useRef(null)
    const wrapperRef = useRef(null)
    useEffect(() => {
        getList()
    }, [params, refresh])
    const [list] = useVirtualList(originalList, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 44,
        overscan: 10
    })

    const getList = useDebounceFn(
        useMemoizedFn(() => {
            setLoading(true)
            apiGetReverseShellProgramList(params)
                .then((res) => {
                    const list = res.ProgramList.filter((i) => i.toUpperCase().includes(keyWord.toUpperCase()))
                    setOriginalList(list)
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                )
        }),
        {wait: 200, leading: true}
    ).run
    const onSearch = useMemoizedFn(() => {
        setRefresh(!refresh)
    })
    const onClickDetail = useMemoizedFn((val: string) => {
        const data: ReceiverDetail = {
            ...params,
            Program: val
        }
        onSetDetail(data)
    })
    return (
        <div className={styles["shell-receiver-left-list"]}>
            <div className={styles["header"]}>
                <div className={styles["title-select-box"]}>
                    <div className={styles["title"]}>代码生成器</div>
                    <YakitRadioButtons
                        value={params.CmdType}
                        onChange={(e) => {
                            setParams((prev) => ({...prev, CmdType: e.target.value}))
                        }}
                        buttonStyle='solid'
                        options={[
                            {
                                value: "ReverseShell",
                                label: "Reverse"
                            },
                            {
                                value: "MSFVenom",
                                label: "MSFVenom"
                            }
                        ]}
                    />
                </div>
                <div className={classNames(styles["extra"])}>
                    <Tooltip placement='top' title='收起代码生成器'>
                        <SideBarCloseIcon
                            className={styles["fold-icon"]}
                            onClick={() => {
                                setFold(false)
                            }}
                        />
                    </Tooltip>
                </div>
            </div>
            <div className={styles["filter-box"]}>
                <div className={styles["select-box"]}>
                    <YakitSelect
                        value={params.System}
                        onSelect={(val) => {
                            setParams((prev) => ({...prev, System: val}))
                        }}
                        placeholder='请选择...'
                    >
                        <YakitSelect value='All'>All</YakitSelect>
                        <YakitSelect value='Linux'>Linux</YakitSelect>
                        <YakitSelect value='Windows'>Windows</YakitSelect>
                        <YakitSelect value='Mac'>Mac</YakitSelect>
                    </YakitSelect>
                </div>
                <div className={styles["input-box"]}>
                    <YakitInput.Search
                        prefix={<OutlineSearchIcon className={styles["prefix"]} />}
                        placeholder='请输入关键词搜索'
                        value={keyWord}
                        onChange={(e) => {
                            setKeyWord(e.target.value)
                        }}
                        onSearch={onSearch}
                        onPasteCapture={onSearch}
                        size='large'
                    />
                </div>
            </div>
            <div ref={containerRef} className={styles["list-box"]}>
                <YakitSpin spinning={loading}>
                    <div ref={wrapperRef}>
                        {list.map((ele) => (
                            <div
                                className={classNames(styles["item-box"], {
                                    [styles["item-box-active"]]: receiverDetail.Program === ele.data
                                })}
                                key={ele.data}
                                onClick={() => onClickDetail(ele.data)}
                            >
                                <div className={styles["text"]}>{ele.data}</div>
                            </div>
                        ))}
                    </div>
                </YakitSpin>
            </div>
        </div>
    )
}

export interface ShellReceiverMiddleItemProps {
    loading: boolean
    reverseShellCommand?: GenerateReverseShellCommandResponse
    receiverDetail: GenerateReverseShellCommandRequest
    setReceiverDetail: React.Dispatch<React.SetStateAction<GenerateReverseShellCommandRequest>>
    setShowDetail: (v: boolean) => void
}

export const ShellReceiverMiddleItem: React.FC<ShellReceiverMiddleItemProps> = (props) => {
    const {loading, receiverDetail, setReceiverDetail, reverseShellCommand, setShowDetail} = props
    const [shellList, setShellList] = useState<string[]>([])
    useEffect(() => {
        getShellTypeList()
    }, [])
    const getShellTypeList = useMemoizedFn(() => {
        const params: GetReverseShellProgramListRequest = {
            System: receiverDetail.System,
            CmdType: receiverDetail.CmdType
        }
        apiGetReverseShellProgramList(params).then((res) => {
            setShellList(res.ShellList)
        })
    })
    const onCopy = useMemoizedFn(() => {
        if (reverseShellCommand?.Result) callCopyToClipboard(reverseShellCommand?.Result)
    })
    return (
        <div className={styles["shell-receiver-middle-item"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>{receiverDetail?.Program || ""}</div>
                <div className={styles["extra"]}>
                    <div
                        className={styles["extra-icon"]}
                        onClick={() => {
                            setShowDetail(false)
                        }}
                    >
                        <RemoveIcon />
                    </div>
                </div>
            </div>
            {reverseShellCommand && (
                <div className={styles["content"]}>
                    <YakitSpin spinning={loading}>
                        {reverseShellCommand?.Status.Ok ? (
                            <div className={styles["content-text"]}>{reverseShellCommand?.Result}</div>
                        ) : (
                            <Result
                                className={styles["content-result"]}
                                status='error'
                                title={reverseShellCommand?.Status.Reason}
                            />
                        )}
                    </YakitSpin>
                </div>
            )}
            <div className={styles["footer"]}>
                <div className={styles["select-box"]}>
                    <div className={styles["select-item"]}>
                        <div className={styles["title"]}>Shell</div>
                        <YakitSelect
                            wrapperStyle={{width: 164}}
                            value={receiverDetail.ShellType}
                            onSelect={(val) => {
                                setReceiverDetail((prev) => ({...prev, ShellType: val}))
                            }}
                            placeholder='请选择...'
                        >
                            {shellList.map((ele) => (
                                <YakitSelect value={ele} key={ele}>
                                    {ele}
                                </YakitSelect>
                            ))}
                        </YakitSelect>
                    </div>
                    <div className={styles["select-item"]}>
                        <div className={styles["title"]}>Encoding</div>
                        <YakitSelect
                            wrapperStyle={{width: 164}}
                            value={receiverDetail.Encode}
                            onSelect={(val) => {
                                setReceiverDetail((prev) => ({...prev, Encode: val}))
                            }}
                            placeholder='请选择...'
                        >
                            <YakitSelect value='None'>None</YakitSelect>
                            <YakitSelect value='Url'>Url</YakitSelect>
                            <YakitSelect value='DoubleUrl'>DoubleUrl</YakitSelect>
                            <YakitSelect value='Base64'>Base64</YakitSelect>
                        </YakitSelect>
                    </div>
                </div>
                <div className={styles["line"]}></div>
                <YakitButton icon={<SolidDocumentduplicateIcon />} size='max' onClick={onCopy}>
                    Copy
                </YakitButton>
            </div>
        </div>
    )
}

export interface ShellReceiverRightRunProps {
    loading: boolean
    addr: string
    fold: boolean
    setFold: (v: boolean) => void
    onCancelMonitor: () => void
}

export const ShellReceiverRightRun: React.FC<ShellReceiverRightRunProps> = (props) => {
    const {loading, addr, fold, setFold, onCancelMonitor} = props
    const [isOriginalMode, setIsOriginalMode] = useState<boolean>(true)
    const [local, setLocal] = useState<string>("")
    const [remote, setRemote] = useState<string>("")

    const tagString = useCreation(() => {
        return `本地端口:${local || addr || "-"} <== 远程端口:${remote || "-"}`
    }, [local, addr, remote])

    return (
        <div className={styles["shell-receiver-right-run"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>
                    {!fold && (
                        <Tooltip title='展开代码生成器'>
                            <SideBarOpenIcon
                                className={styles["fold-icon"]}
                                onClick={() => {
                                    setFold(true)
                                }}
                            />
                        </Tooltip>
                    )}
                    <div className={styles["text"]}>正在监听:</div>
                    <Tooltip title={tagString}>
                        <YakitTag color='blue' className={styles["tag-port"]}>
                            {tagString}
                        </YakitTag>
                    </Tooltip>
                </div>
                <div className={styles["extra"]}>
                    <div className={styles["extra-show"]}>
                        <span className={styles["extra-text"]}>原始模式:</span>
                        <YakitSwitch checked={isOriginalMode} onChange={setIsOriginalMode} />
                    </div>
                    <YakitPopconfirm
                        title={"确定关闭该端口吗？"}
                        onConfirm={() => {
                            onCancelMonitor()
                        }}
                    >
                        <YakitButton danger={true} type={"primary"}>
                            断开
                            <OutlineExitIcon />
                        </YakitButton>
                    </YakitPopconfirm>
                </div>
            </div>
            <div className={styles["terminal-content"]}>
                <YakitSpin spinning={loading}>
                    <ReverseShellTerminal
                        isWrite={!isOriginalMode}
                        addr={addr}
                        setLocal={setLocal}
                        setRemote={setRemote}
                        onCancelMonitor={onCancelMonitor}
                    />
                </YakitSpin>
            </div>
        </div>
    )
}

interface MonitorFormProps {
    host: string
    port: number
}

export interface ShellReceiverProps {}
export const ShellReceiver: React.FC<ShellReceiverProps> = (props) => {
    const [fold, setFold] = useState<boolean>(true)
    const [isShowDetail, setShowDetail] = useState<boolean>(false)
    const [isShowStart, setShowStart] = useState<boolean>(true)

    const [addrList, setAddrList] = useState<string[]>([])
    const [addrLoading, setAddrLoading] = useState<boolean>(true)
    const [loading, setLoading] = useState<boolean>(false)
    const [loadingCommand, setLoadingCommand] = useState<boolean>(false)

    const [receiverDetail, setReceiverDetail] = useState<GenerateReverseShellCommandRequest>({
        ...defaultGenerateReverseShellCommand
    })

    const [reverseShellCommand, setReverseShellCommand] = useState<GenerateReverseShellCommandResponse>()

    const [interval, setInterval] = useState<number | undefined>(1000)

    const [form] = Form.useForm()

    const hostRef: React.MutableRefObject<YakitAutoCompleteRefProps> = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const currentHostRef = useRef<string>("")
    const currentPortRef = useRef<number>(8085)

    useInterval(() => {
        ipcRenderer
            .invoke("listening-port-query-addrs")
            .then((r) => {
                setAddrList(r)
            })
            .finally(() => {
                if (addrLoading) {
                    setAddrLoading(false)
                }
            })
    }, interval)

    useEffect(() => {
        return () => {
            onCancelMonitor()
        }
    }, [])

    useUpdateEffect(() => {
        onGenerateReverseShellCommand()
    }, [receiverDetail])

    const onGenerateReverseShellCommand = useDebounceFn(
        useMemoizedFn(() => {
            setLoadingCommand(true)
            apiGenerateReverseShellCommand(receiverDetail)
                .then((res) => {
                    setReverseShellCommand(res)
                })
                .catch((error) => {
                    const errorRes: GenerateReverseShellCommandResponse = {
                        Status: {
                            Ok: false,
                            Reason: `${error}`
                        },
                        Result: ""
                    }
                    setReverseShellCommand(errorRes)
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoadingCommand(false)
                    }, 200)
                )
        }),
        {wait: 200}
    ).run
    const onCancelMonitor = useMemoizedFn(() => {
        apiCancelListeningPort(`${currentHostRef.current}:${currentPortRef.current}`).then(() => {
            setShowStart(true)
            setInterval(1000)
        })
    })

    const onStartMonitor = useMemoizedFn((value: MonitorFormProps) => {
        const {host, port} = value
        const addr = `${host}:${port}`
        if (!addr.includes(":")) {
            failed(`无法启动端口监听程序，端口格式不合理: [${addr}]`)
            return
        }
        if (!host || !port) {
            failed(`无法解析主机/端口`)
            return
        }
        if (addrList.includes(addr)) {
            failed("该地址已经被占用: " + addr)
            return
        }
        if (host) {
            hostRef.current.onSetRemoteValues(host)
        }
        setLoading(true)
        ipcRenderer
            .invoke("listening-port", host, port)
            .then(() => {
                success("监听端口成功")
                setInterval(undefined)
                setShowStart(false)
                currentHostRef.current = host
                currentPortRef.current = port
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 300)
            })
    })
    const onSetDetail = useMemoizedFn((value: ReceiverDetail) => {
        const param: GenerateReverseShellCommandRequest = {
            ...receiverDetail,
            ...value,
            IP: currentHostRef.current,
            port: currentPortRef.current
        }
        setReceiverDetail({...param})
        setShowDetail(true)
    })
    return (
        <>
            {isShowStart ? (
                <div className={styles["shellReceiver-heard"]}>
                    <div className={styles["heard-title-text"]}>开启端口监听</div>
                    <div className={styles["heard-subTitle-text"]}>
                        反弹 Shell 接收工具，可以在服务器上开启一个端口，进行监听，并进行交互。
                    </div>
                    <YakitSpin spinning={addrLoading}>
                        <Form
                            layout='vertical'
                            form={form}
                            onFinish={onStartMonitor}
                            className={styles["shellReceiver-form"]}
                        >
                            <Form.Item
                                rules={[{required: true, message: "该项为必填"}]}
                                label={"监听的主机"}
                                name={"host"}
                            >
                                <YakitAutoComplete
                                    ref={hostRef}
                                    cacheHistoryDataKey={RemoteGV.ReverseShellReceiverHostList}
                                    placeholder={"请输入监听的主机"}
                                    options={["0.0.0.0", "127.0.0.1", "192.168.1.235"].map((i) => {
                                        return {value: i, label: i}
                                    })}
                                />
                            </Form.Item>
                            <Form.Item
                                rules={[{required: true, message: "该项为必填"}]}
                                label={"端口"}
                                name={"port"}
                                initialValue={8085}
                            >
                                <YakitInputNumber min={1} max={65535} placeholder='请输入端口' />
                            </Form.Item>
                            <div className={styles["footer-btns"]}>
                                <YakitButton htmlType='submit' size='large'>
                                    启动监听
                                </YakitButton>
                            </div>
                        </Form>
                    </YakitSpin>
                </div>
            ) : (
                <div className={styles["shell-receiver"]}>
                    {fold && (
                        <>
                            <ShellReceiverLeftList
                                receiverDetail={receiverDetail}
                                fold={fold}
                                setFold={setFold}
                                onSetDetail={onSetDetail}
                            />
                            {isShowDetail && (
                                <ShellReceiverMiddleItem
                                    loading={loadingCommand}
                                    receiverDetail={receiverDetail}
                                    reverseShellCommand={reverseShellCommand}
                                    setShowDetail={setShowDetail}
                                    setReceiverDetail={setReceiverDetail}
                                />
                            )}
                        </>
                    )}
                    <ShellReceiverRightRun
                        loading={loading}
                        addr={`${currentHostRef.current}:${currentPortRef.current}`}
                        fold={fold}
                        setFold={setFold}
                        onCancelMonitor={onCancelMonitor}
                    />
                </div>
            )}
        </>
    )
}
