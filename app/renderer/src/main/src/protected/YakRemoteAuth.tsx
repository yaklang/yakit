import React, {useEffect, useState} from "react";
import {Alert, Button, Form, Modal, Space} from "antd";
import {CopyableField, ManySelectOne, SelectOne} from "../utils/inputUtil";
import {failed} from "../utils/notification";
import {openABSFile} from "../utils/openWebsite";


export interface YakitAuthInfo {
    name: string
    host: string
    port: number
    caPem: string
    tls: boolean
    password: string,
}

export interface YakRemoteAuthProp {
    selected?: YakitAuthInfo
    onSelected: (info: YakitAuthInfo) => any
}

const {ipcRenderer} = window.require("electron");

export const saveAuthInfo = (info: YakitAuthInfo, alias?: string) => {
    if (!info) {
        return
    }

    ipcRenderer.invoke("save-yakit-remote-auth", info).then().catch((e: any) => {
        console.info(e)
    })


    // Modal.confirm({
    //     title: "保存当前连接历史？",
    //     width: "50%",
    //     content: <>
    //         <Alert message={<>
    //             注意：Yakit 并不会把历史记录上传到互联网
    //             <br/>
    //             你可以在你的本地目录（客户端目录）下找到远程登录信息
    //             <br/>
    //             <br/>
    //             <Space>
    //                 <CopyableField text={"$HOME/yakit-projects/auth/yakit-remote.json"}/>
    //                 <Button
    //                     onClick={() => {
    //                         ipcRenderer.invoke("get-yakit-remote-auth-dir").then(dir => {
    //                             openABSFile(dir)
    //                         })
    //                     }}
    //                     type={"link"}
    //                 >打开认证信息存储位置</Button>
    //             </Space>
    //         </>}/>
    //     </>,
    //     onOk: () => {
    //         ipcRenderer.invoke("save-yakit-remote-auth", info).then().catch((e: any) => {
    //             console.info(e)
    //         })
    //     },
    // })

    return <div/>
}

export const YakRemoteAuth: React.FC<YakRemoteAuthProp> = (props) => {
    const [authInfos, setAuthInfos] = useState<(YakitAuthInfo)[]>([]);

    const update = () => {
        ipcRenderer.invoke("get-yakit-remote-auth-all").then(e => {
            setAuthInfos([...e, {name: "", host: "127.0.0.1", port: 8087, caPem: "", tls: false, password: ""}])
        }).catch((e: any) => {
        }).finally()
    }

    useEffect(() => {
        update()
        let id = setInterval(update, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    if (authInfos.length > 0) {
        return <ManySelectOne
            label={"连接历史"}
            data={authInfos.map(i => {
                return {value: i.name, text: `${i.name}`}
            })} value={props.selected?.name}
            setValue={name => {
                for (let i = 0; i < authInfos.length; i++) {

                    if (authInfos[i] !== undefined && name === authInfos[i]?.name) {
                        props.onSelected(authInfos[i]);
                        return
                    }
                }
            }}
        />
    }

    return <div/>
};