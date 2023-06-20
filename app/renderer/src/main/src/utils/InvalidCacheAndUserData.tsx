import React from "react";
import {info} from "@/utils/notification";
import {showModal} from "@/utils/showModal";
import {Alert, Button, Space} from "antd";
import { getReleaseEditionName } from "./envfile";

const {ipcRenderer} = window.require("electron");

export const invalidCacheAndUserData = () => {
    const m = showModal({
        title: "重置用户数据与缓存",
        content: (
            <Space style={{width: 600}} direction={"vertical"}>
                <Alert type={"error"} message={`如果你的 ${getReleaseEditionName()} 出现异常，可使用此功能删除所有本地缓存和用户数据，重连重启。`}/>
                <Alert type={"error"} message={"注意，本操作将永久删除缓存数据，难以恢复，请谨慎操作"}/>
                <Button type={"primary"} danger={true} onClick={() => {
                    m.destroy()
                    ipcRenderer.invoke("ResetAndInvalidUserData", {}).then(() => {
                    }).catch(e => {
                    }).finally(() => {
                        info("执行重置用户数据成功")
                    })
                }}>我确认此风险，立即删除</Button>
            </Space>
        ),
        width: 700,
    })

}