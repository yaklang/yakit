import React, {CSSProperties, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {Alert, Form, Space, Tooltip, Typography, Modal} from "antd"
import {failed, info, yakitNotify} from "../../utils/notification"
import {CheckOutlined, CloseOutlined, CloudUploadOutlined, ExclamationCircleOutlined} from "@ant-design/icons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import style from "./MITMPage.module.scss"
import {BanIcon, ChromeFrameSvgIcon, ChromeSvgIcon, PencilAltIcon, RemoveIcon, TrashIcon} from "@/assets/newIcon"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {CacheDropDownGV, RemoteGV} from "@/yakitGV"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {MITMConsts} from "./MITMConsts"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import classNames from "classnames"
import {OutlineChevronupIcon, OutlinePlusIcon, OutlineSaveIcon} from "@/assets/icon/outline"
import {OutlineRefreshIcon} from "@/assets/icon/outline"
import {v4 as uuidv4} from "uuid"
import {chromeLauncherMinParams, chromeLauncherParamsArr} from "@/defaultConstants/mitm"
import {SolidCheckIcon, SolidStoreIcon} from "@/assets/icon/solid"
import {useGoogleChromePluginPath} from "@/store"
import {RemoteMitmGV} from "@/enums/mitm"
import {handleOpenFileSystemDialog} from "@/utils/fileSystemDialog"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {Trans} from "react-i18next"

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
    const {t, i18n} = useI18nNamespaces(["mitm"])
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
    const {googleChromePluginPath} = useGoogleChromePluginPath()

    const [chormeCheck, setChormeCheck] = useState<string>("customSet")
    const [showChormeDropdown, setShowChormeDropdown] = useState<boolean>(false)
    const chromedropdownRef = useRef<HTMLDivElement>(null)

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

        getRemoteValue(RemoteMitmGV.MitmStartChromeCheck).then((e) => {
            if (!!e) {
                setChormeCheck(e)
            } else {
                setChormeCheck("customSet")
            }
        })
        // dropdown 点击外部关闭
        const handleClickOutside = (event) => {
            if (chromedropdownRef.current && !chromedropdownRef.current.contains(event.target)) {
                setShowChormeDropdown(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)

        ipcRenderer.invoke("getDefaultUserDataDir").then((e: string) => {
            setDefUserDataDir(e)
        })

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    // 启动 chrome 模式
    const handleStartChromeBefore = useMemoizedFn(() => {
        if (chormeCheck === "customSet") {
            startChrome(false)
        } else if (chormeCheck === "defaultSet") {
            startChrome(true)
        }
        setRemoteValue(RemoteMitmGV.MitmStartChromeCheck, chormeCheck)
    })
    const startChrome = useMemoizedFn(async (baseStart: boolean) => {
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

            let chromeFlags: ChromeLauncherParams[] = chromeLauncherParamsArr
            if (res[1].status === "fulfilled") {
                const value = res[1].value
                if (value) {
                    try {
                        chromeFlags = JSON.parse(value)
                    } catch (error) {}
                }
            }

            if (baseStart) {
                newParams.chromeFlags = chromeLauncherMinParams
            } else {
                newParams.chromeFlags = handleChromeLauncherParams(chromeFlags, googleChromePluginPath)
            }
            ipcRenderer
                .invoke("LaunchChromeWithParams", newParams)
                .then((e) => {
                    props.callback(params.host, params.port)
                })
                .catch((e) => {
                    failed(t("MITMChromeLauncher.chromeStartFailed", {e: e.toString()}))
                })
        })
    })

    return (
        <Form labelCol={{span: 5}} wrapperCol={{span: 18}} style={{padding: 24}}>
            <Form.Item label={t("MITMChromeLauncher.configureProxy")}>
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
                    {t("MITMChromeLauncher.saveUserData")}
                </YakitCheckbox>
            </Form.Item>
            {isSaveUserData && (
                <Form.Item label={" "} colon={false} help={t("MITMChromeLauncher.setNewPathForNewWindow")}>
                    <YakitAutoComplete
                        ref={userDataDirRef}
                        style={{width: "calc(100% - 20px)"}}
                        cacheHistoryDataKey={CacheDropDownGV.MITMSaveUserDataDir}
                        cacheHistoryListLength={5}
                        initValue={defUserDataDir}
                        value={userDataDir}
                        placeholder={t("MITMChromeLauncher.setStoragePath")}
                        onChange={(v) => {
                            setUserDataDir(v)
                        }}
                    />
                    <Tooltip title={t("MITMChromeLauncher.selectStoragePath")}>
                        <CloudUploadOutlined
                            onClick={() => {
                                handleOpenFileSystemDialog({
                                    title: t("MITMChromeLauncher.pleaseSelectFolder"),
                                    properties: ["openDirectory"]
                                }).then((data) => {
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
                                <Trans
                                    i18nKey='MITMChromeLauncher.start_proxy_tip'
                                    ns='mitm'
                                    components={{
                                        br: <br />,
                                        mark: <Text mark />
                                    }}
                                />
                            }
                        />
                        <Alert
                            style={{marginTop: 4}}
                            type={"error"}
                            message={
                                <Trans
                                    i18nKey='MITMChromeLauncher.ignore_cert_tip'
                                    ns='mitm'
                                    components={{
                                        br: <br />,
                                        mark: <Text mark />,
                                        code: <Text code />
                                    }}
                                    values={{
                                        flag: "--ignore-certificate-errors"
                                    }}
                                />
                            }
                        />
                    </Space>
                }
            >
                <div style={{display: "flex", alignItems: "center"}}>
                    <div className={style["chrome-operation-btn-wrapper"]} ref={chromedropdownRef}>
                        <div
                            className={style["operation-btn-left"]}
                            style={{borderRadius: "40px 0 0 40px"}}
                            onClick={handleStartChromeBefore}
                        >
                            {t("MITMChromeLauncher.startNoConfigChrome")}
                        </div>
                        <div
                            className={style["operation-btn-right"]}
                            style={{borderRadius: "0 40px 40px 0"}}
                            onClick={() => setShowChormeDropdown(!showChormeDropdown)}
                        >
                            <OutlineChevronupIcon
                                className={classNames(style["title-icon"], {
                                    [style["rotate-180"]]: !showChormeDropdown
                                })}
                            />
                        </div>
                        <div
                            className={style["operation-dropdown-wrapper"]}
                            style={{display: showChormeDropdown ? "block" : "none"}}
                        >
                            {[
                                {label: t("MITMChromeLauncher.startWithPresetParams"), key: "customSet"},
                                {label: t("MITMChromeLauncher.startWithMinimalParams"), key: "defaultSet"}
                            ].map((item) => (
                                <div
                                    className={classNames(style["operation-dropdown-list-item"], {
                                        [style["active"]]: chormeCheck === item.key
                                    })}
                                    onClick={() => {
                                        setChormeCheck(item.key)
                                        setShowChormeDropdown(!showChormeDropdown)
                                    }}
                                    key={item.key}
                                >
                                    <span>{item.label}</span>
                                    {chormeCheck === item.key && <SolidCheckIcon className={style["check-icon"]} />}
                                </div>
                            ))}
                        </div>
                    </div>
                    {chormeCheck === "customSet" && (
                        <YakitButton type='text' onClick={() => setChromeLauncherParamsVisible(true)}>
                            {t("MITMChromeLauncher.moreParameters")}
                        </YakitButton>
                    )}
                </div>
                <div className={style["chrome-start-desc"]}>
                    <Trans
                        i18nKey='MITMChromeLauncher.preset_param_tip'
                        ns='mitm'
                        components={{
                            error: <span style={{color: "var(--Colors-Use-Error-Primary)"}} />
                        }}
                    />
                </div>
                {chromeLauncherParamsVisible && (
                    <YakitModal
                        title={t("MITMChromeLauncher.browserParameterConfig")}
                        visible={chromeLauncherParamsVisible}
                        onCancel={() => setChromeLauncherParamsVisible(false)}
                        closable={true}
                        maskClosable={false}
                        mask={false}
                        width='60%'
                        bodyStyle={{padding: 0}}
                        onOk={() => {
                            if (chromeLauncherParamsSetRef.current.tempEditItem) {
                                yakitNotify("info", t("MITMChromeLauncher.unsavedEditWarning"))
                                return
                            }

                            const values = chromeLauncherParamsSetRef.current.data
                                .map((item) => item["parameterName"])
                                .filter((item) => item)
                            const arr = values.filter((value, index) => values.indexOf(value) !== index)
                            if (arr.length) {
                                yakitNotify("info", `${t("MITMChromeLauncher.duplicateParameterName")}${arr.join(",")}`)
                                return
                            }

                            const flag = chromeLauncherParamsSetRef.current.data.some(
                                (value) => value.parameterName === "" && value.variableValues
                            )
                            if (flag) {
                                yakitNotify("info", t("MITMChromeLauncher.parameterNameNotFilled"))
                                return
                            }

                            const saveChromeLauncherParamsArr = chromeLauncherParamsSetRef.current.data.filter(
                                (item) => item["parameterName"] && !["--proxy-server"].includes(item["parameterName"])
                            )
                            setRemoteValue(RemoteGV.ChromeLauncherParams, JSON.stringify(saveChromeLauncherParamsArr))
                            setChromeLauncherParamsVisible(false)
                        }}
                    >
                        <ChromeLauncherParamsSet
                            ref={chromeLauncherParamsSetRef}
                            googleChromePluginPath={googleChromePluginPath}
                        />
                    </YakitModal>
                )}
            </Form.Item>
        </Form>
    )
}

const ChromeLauncherButton: React.FC<ChromeLauncherButtonProp> = React.memo((props: ChromeLauncherButtonProp) => {
    const {isStartMITM, host, port, onFished, repRuleFlag = false, disableCACertPage, onSetVisible} = props
    const {t, i18n} = useI18nNamespaces(["mitm", "yakitUi"])
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
                info(t("ChromeLauncherButton.closeAllChromeProxySuccess"))
            })
            .catch((e) => {
                failed(`${t("ChromeLauncherButton.closeAllChromeFailed")}${e}`)
            })
    })

    const clickChromeLauncher = useMemoizedFn(() => {
        if (repRuleFlag) {
            Modal.confirm({
                title: t("YakitModal.friendlyReminder"),
                icon: <ExclamationCircleOutlined />,
                content: t("ChromeLauncherButton.confirmEnableWithReplacementRules"),
                okText: t("YakitButton.confirm"),
                cancelText: t("ChromeLauncherButton.goToSettings"),
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
                            <ChromeFrameSvgIcon style={{height: 16, color: "var(--Colors-Use-Neutral-Text-1-Title)"}} />
                        )}
                        {t("ChromeLauncherButton.noConfigStart")}
                        {started && (
                            <CheckOutlined style={{color: "var(--Colors-Use-Success-Primary)", marginLeft: 8}} />
                        )}
                    </YakitButton>
                    {started && (
                        <Tooltip title={t("ChromeLauncherButton.closeAllNoConfigChrome")}>
                            <YakitButton
                                type='outline2'
                                onClick={() => {
                                    onCloseChrome()
                                }}
                            >
                                <CloseOutlined style={{color: "var(--Colors-Use-Success-Primary)"}} />
                            </YakitButton>
                        </Tooltip>
                    )}
                </>
            )) || (
                <YakitButton type='outline2' size='large' onClick={clickChromeLauncher}>
                    <ChromeFrameSvgIcon style={{height: 16, color: "var(--Colors-Use-Neutral-Text-1-Title)"}} />
                    <span style={{marginLeft: 4}}>{t("ChromeLauncherButton.noConfigStart")}</span>
                </YakitButton>
            )}
            {chromeVisible && (
                <YakitModal
                    title={t("ChromeLauncherButton.confirmStartNoConfig")}
                    visible={chromeVisible}
                    onCancel={() => setChromeVisible(false)}
                    closable={true}
                    width='55%'
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

function setGoogleChromePlugin(parameterName: string, googleChromePluginPath: string, disabled: boolean) {
    return {
        id: uuidv4(),
        parameterName: parameterName,
        variableValues: googleChromePluginPath,
        variableType: "input",
        disabled: disabled,
        desc: "",
        default: true
    } as ChromeLauncherParams
}
function handleChromeLauncherParams(arr: ChromeLauncherParams[], googleChromePluginPath: string) {
    const index = arr.findIndex((item) => item.parameterName === "--load-extension")
    if (index === -1) {
        arr.push(setGoogleChromePlugin("--load-extension", googleChromePluginPath, false))
    } else {
        arr[index] = setGoogleChromePlugin("--load-extension", googleChromePluginPath, arr[index].disabled)
    }
    const index2 = arr.findIndex((item) => item.parameterName === "--disable-extensions-except")
    if (index2 === -1) {
        arr.push(setGoogleChromePlugin("--disable-extensions-except", googleChromePluginPath, false))
    } else {
        arr[index2] = setGoogleChromePlugin("--disable-extensions-except", googleChromePluginPath, arr[index2].disabled)
    }
    return arr
}
interface ChromeLauncherParamsSetRefProps {
    data: ChromeLauncherParams[]
    tempEditItem?: ChromeLauncherParams
}
interface ChromeLauncherParamsSetProps {
    ref?: React.ForwardedRef<ChromeLauncherParamsSetRefProps>
    googleChromePluginPath: string
}
const ChromeLauncherParamsSet: React.FC<ChromeLauncherParamsSetProps> = React.forwardRef((props, ref) => {
    const {googleChromePluginPath} = props
    const {t, i18n} = useI18nNamespaces(["mitm", "yakitUi"])
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
            let arr: ChromeLauncherParams[] = chromeLauncherParamsArr
            if (setting) {
                try {
                    arr = JSON.parse(setting)
                } catch (error) {}
            }
            setData(handleChromeLauncherParams(arr, googleChromePluginPath))
        })
    }, [])

    const resetToDefault = useMemoizedFn(() => {
        // 显示确认对话框
        Modal.confirm({
            title: t("ChromeLauncherParamsSet.confirmRestoreDefaultParams"),
            icon: <ExclamationCircleOutlined />,
            content: t("ChromeLauncherParamsSet.restoreAllParamsWarning"),
            okText: t("YakitButton.confirm"),
            cancelText: t("YakitButton.cancel"),
            closable: true,
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
                // 重置为默认参数
                let defaultParams = [...chromeLauncherParamsArr]

                // 应用handleChromeLauncherParams函数，确保扩展参数被正确处理
                defaultParams = handleChromeLauncherParams(defaultParams, googleChromePluginPath)

                setData(defaultParams)
                if (searchVal) {
                    const filteredData = defaultParams.filter((item) =>
                        item.parameterName.toLocaleLowerCase().includes(searchVal.toLocaleLowerCase())
                    )
                    setSearchData(filteredData)
                }

                // 清除临时编辑状态
                tempEditItem.current = undefined
                setTempEditId(undefined)
                setCurrentItem(undefined)

                // 保存到远程
                setRemoteValue(RemoteGV.ChromeLauncherParams, JSON.stringify(defaultParams))
                yakitNotify("success", t("ChromeLauncherParamsSet.defaultParamsRestored"))
            },
            cancelButtonProps: {size: "small", className: "modal-cancel-button"},
            okButtonProps: {size: "small", className: "modal-ok-button"}
        })
    })

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
            record.variableType === "bool" ||
            record.disabled ||
            !(tempEditId === undefined || tempEditId === record.id) ||
            ["--load-extension", "--disable-extensions-except"].includes(record.parameterName)
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
                title: t("ChromeLauncherParamsSet.parameterName"),
                dataKey: "parameterName",
                customStyle: true,
                render: (text, record: ChromeLauncherParams) => {
                    return record.cellStyle && !record.default ? (
                        <YakitInput
                            defaultValue={text}
                            style={{borderRadius: 0, borderColor: "var(--Colors-Use-Main-Primary)"}}
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
                                color: record.disabled ? "var(--Colors-Use-Neutral-Disable)" : undefined
                            }}
                        >
                            {text}
                        </div>
                    )
                }
            },
            {
                title: t("ChromeLauncherParamsSet.variableValue"),
                dataKey: "variableValues",
                customStyle: true,
                render: (text, record: ChromeLauncherParams) => {
                    return record.variableType === "input" ? (
                        record.cellStyle ? (
                            <YakitInput
                                defaultValue={text}
                                style={{borderRadius: 0, borderColor: "var(--Colors-Use-Main-Primary)"}}
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
                                style={{color: record.disabled ? "var(--Colors-Use-Neutral-Disable)" : undefined}}
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
                title: t("YakitTable.action"),
                dataKey: "action",
                width: 128,
                fixed: "right",
                render: (_, record: ChromeLauncherParams) => {
                    return (
                        <div className={style["table-action-icon"]}>
                            {record.cellStyle ? (
                                <Tooltip title={t("YakitButton.save")}>
                                    <SolidStoreIcon
                                        className={classNames(style["action-icon"], style["action-icon-save"])}
                                        onClick={(e) => {
                                            onSave(record)
                                        }}
                                    />
                                </Tooltip>
                            ) : (
                                <Tooltip title={disabledEdit(record) ? "" : t("YakitButton.edit")}>
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
                            <Tooltip
                                title={
                                    disabledBan2(record)
                                        ? ""
                                        : disabledBan1(record)
                                        ? t("YakitButton.enable")
                                        : t("YakitButton.disable")
                                }
                            >
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
    }, [tempEditId, i18n.language])

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
                    <div style={{display: "flex", alignItems: "center"}}>
                        <YakitInput.Search
                            style={{width: 250}}
                            allowClear
                            placeholder={t("ChromeLauncherParamsSet.enterParameterNameToSearch")}
                            onSearch={(value) => setSearchVal(value.trim())}
                        />
                        <YakitButton type='text' onClick={resetToDefault} disabled={tempEditId !== undefined}>
                            <OutlineRefreshIcon style={{marginRight: 4}} />
                            {t("ChromeLauncherParamsSet.restoreDefaultParameters")}
                        </YakitButton>
                    </div>
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
                        icon={<OutlinePlusIcon />}
                    >
                        {t("ChromeLauncherParamsSet.addNewParameter")}
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
