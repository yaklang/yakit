import React, {useEffect, useState} from "react"
import {Alert, Form, Space, Tooltip, Typography} from "antd"
import {failed, info} from "../../utils/notification"
import {CheckOutlined, CloseOutlined, CloudUploadOutlined} from "@ant-design/icons"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useMemoizedFn} from "ahooks"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import style from "./MITMPage.module.scss"
import {ChromeFrameSvgIcon, ChromeSvgIcon} from "@/assets/newIcon"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"

/**
 * @param {boolean} isStartMITM 是否开启mitm服务，已开启mitm服务，显示switch。 未开启显示按钮
 */
interface ChromeLauncherButtonProp {
    host?: string
    port?: number
    onFished?: (host: string, port: number) => void
    isStartMITM?: boolean
}

interface MITMChromeLauncherProp {
    host?: string
    port?: number
    callback: (host: string, port: number) => void
}

const {ipcRenderer} = window.require("electron")
const {Text} = Typography

const MITMChromeLauncher: React.FC<MITMChromeLauncherProp> = (props) => {
    const [params, setParams] = useState<{host: string; port: number}>({
        host: props.host ? props.host : "127.0.0.1",
        port: props.port ? props.port : 8083
    })
    const [isSaveUserData, setSaveUserData] = useState<boolean>(true)
    const [userDataDir, setUserDataDir] = useState<string>("")
    const [userDataDirArr, setUserDataDirArr] = useState<string[]>([])

    useEffect(() => {
        ipcRenderer.invoke("getDefaultUserDataDir").then((e: string) => {
            getRemoteValue("USER_DATA_DIR_ARR").then((data) => {
                if (!data) {
                    setUserDataDir(e)
                    setUserDataDirArr([e])
                    return
                } else {
                    const obj = JSON.parse(data)
                    setSaveUserData(obj.isSaveUserData)
                    setUserDataDir(obj.userDataDirArr[0])
                    setUserDataDirArr(obj.userDataDirArr)
                }
            })
        })
    }, [])
    // 数组去重
    const filterItem = (arr) => arr.filter((item, index) => arr.indexOf(item) === index)
    return (
        <Form
            labelCol={{span: 4}}
            wrapperCol={{span: 18}}
            onSubmitCapture={(e) => {
                e.preventDefault()
                let newParams: {host: string; port: number; chromePath?: string; userDataDir?: string} = {...params}
                if (isSaveUserData) {
                    let newUserDataDirArr = filterItem([userDataDir, ...userDataDirArr]).slice(0, 5)
                    setRemoteValue(
                        "USER_DATA_DIR_ARR",
                        JSON.stringify({isSaveUserData: true, userDataDirArr: newUserDataDirArr})
                    )
                    newParams.userDataDir = userDataDir
                } else {
                    setRemoteValue("USER_DATA_DIR_ARR", JSON.stringify({isSaveUserData: false, userDataDirArr}))
                }

                getRemoteValue(RemoteGV.GlobalChromePath).then((setting) => {
                    if (setting) newParams.chromePath = JSON.parse(setting)
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
                        onChange={(e) => setParams({...params, port: parseInt(e.target.value)})}
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
                        style={{width: "calc(100% - 20px)"}}
                        options={userDataDirArr.map((item) => ({label: item, value: item}))}
                        placeholder='设置代理'
                        value={userDataDir}
                        onChange={(v) => {
                            setUserDataDir(v)
                        }}
                    />
                    <Tooltip title={"选择导出路径"}>
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
            </Form.Item>
        </Form>
    )
}

const ChromeLauncherButton: React.FC<ChromeLauncherButtonProp> = React.memo((props: ChromeLauncherButtonProp) => {
    const {isStartMITM, host, port, onFished} = props
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
                <YakitButton
                    type='outline2'
                    size='large'
                    onClick={() => {
                        setChromeVisible(true)
                    }}
                >
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
                >
                    <MITMChromeLauncher
                        host={host}
                        port={port}
                        callback={(host, port) => {
                            setChromeVisible(false)
                            if (!isStartMITM) {
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
