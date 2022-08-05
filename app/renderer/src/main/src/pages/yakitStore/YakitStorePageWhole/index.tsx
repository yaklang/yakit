import {YakScript} from "@/pages/invoker/schema"
import {API} from "@/services/swagger/resposeType"
import {useStore} from "@/store"
import {ReloadOutlined} from "@ant-design/icons"
import {useMemoizedFn} from "ahooks"
import {Button, Col, Input, Radio, Row, Spin} from "antd"
import React, {FC, useEffect, useState} from "react"
import {GetYakScriptByOnlineIDRequest, YakModule, YakModuleOnline, YakModuleUser} from "../YakitStorePage"

import "./index.scss"
const {ipcRenderer} = window.require("electron")

const userInitUse = "user-init-use"

const YakitStorePageWhole: FC = (props) => {
    const [plugSource, setPlugSource] = useState<string>("local")
    const [listLoading, setListLoading] = useState<boolean>(false)
    const [publicKeyword, setPublicKeyword] = useState<string>("")
    const [isRefList, setIsRefList] = useState<boolean>(false)
    const [script, setScript] = useState<YakScript>()
    // 全局登录状态
    const {userInfo} = useStore()
    useEffect(() => {
        ipcRenderer
            .invoke("get-value", userInitUse)
            .then((value: boolean) => {
                if (value) {
                    setPlugSource("local")
                } else {
                    setPlugSource("online")
                    ipcRenderer.invoke("set-value", userInitUse, true)
                }
            })
            .catch(() => {})
            .finally(() => {})
    }, [])
    const onSetPluginSource = (key: string) => {
        setPlugSource(key)
    }

    const handleFormSubmit = (value: string) => {
        // eslint-disable-next-line no-console
        console.log(value)
    }
    const onRefList = useMemoizedFn(() => {})
    const onSetUserPluginAndGetLocal = useMemoizedFn((p?: API.YakitPluginDetail) => {
        if (!p) {
            setScript(undefined)
            // setUserPlugin(undefined)
            return
        }
        ipcRenderer
            .invoke("GetYakScriptByOnlineID", {
                OnlineID: p.id,
                UUID: p.uuid
            } as GetYakScriptByOnlineIDRequest)
            .then((localSrcipt: YakScript) => {
                setScript(localSrcipt)
            })
            .catch((e) => {
                // 本地未查询到相关数据
                setScript(undefined)
            })
            .finally(() => {
                // setUserPlugin(p)
                // setScriptIdOnlineId(p.id)
            })
    })
    const onSetPluginAndGetLocal = useMemoizedFn((p?: API.YakitPluginDetail) => {
        if (!p) {
            setScript(undefined)
            // setPlugin(undefined)
            return
        }
        ipcRenderer
            .invoke("GetYakScriptByOnlineID", {
                OnlineID: p.id,
                UUID: p.uuid
            } as GetYakScriptByOnlineIDRequest)
            .then((localSrcipt: YakScript) => {
                setScript(localSrcipt)
            })
            .catch((e) => {
                // 本地未查询到相关数据
                setScript(undefined)
            })
            .finally(() => {
                // setPlugin(p)
                // setScriptIdOnlineId(p.id)
            })
    })
    return (
        <>
            <div className='plugin-heard'>
                <div>
                    <Radio.Group value={plugSource} onChange={(e) => onSetPluginSource(e.target.value)}>
                        <Radio.Button value='online'>插件商店</Radio.Button>
                        <Radio.Button value='user'>我的插件</Radio.Button>
                        <Radio.Button value='local'>本地</Radio.Button>
                    </Radio.Group>
                    <Button type={"link"} onClick={onRefList}>
                        <ReloadOutlined />
                    </Button>
                </div>
                <Input.Search
                    placeholder='请输入'
                    enterButton='搜索'
                    onSearch={handleFormSubmit}
                    style={{maxWidth: 500, width: "100%"}}
                />
            </div>
            {/* <Spin spinning={listLoading}>
                {plugSource === "local" && (
                    <YakModule
                        // script={script}
                        setScript={setScript}
                        publicKeyword={publicKeyword}
                        isRefList={isRefList}
                        // deletePluginRecordLocal={deletePluginRecordLocal}
                        // updatePluginRecordLocal={updatePluginRecordLocal}
                        setUpdatePluginRecordLocal={() => {}}
                    />
                )}
                {plugSource === "user" && (
                    <YakModuleUser
                        // userPlugin={userPlugin}
                        setUserPlugin={onSetUserPluginAndGetLocal}
                        userInfo={userInfo}
                        publicKeyword={publicKeyword}
                        isRefList={isRefList}
                        // deletePluginRecordUser={deletePluginRecordUser}
                        setListLoading={setListLoading}
                        // updatePluginRecordUser={updatePluginRecordUser}
                    />
                )}
                {plugSource === "online" && (
                    <YakModuleOnline
                        // plugin={plugin}
                        setPlugin={onSetPluginAndGetLocal}
                        userInfo={userInfo}
                        publicKeyword={publicKeyword}
                        isRefList={isRefList}
                        // deletePluginRecordOnline={deletePluginRecordOnline}
                        setListLoading={setListLoading}
                        // updatePluginRecordOnline={updatePluginRecordOnline}
                    />
                )}
            </Spin> */}
        </>
    )
}

export default YakitStorePageWhole
