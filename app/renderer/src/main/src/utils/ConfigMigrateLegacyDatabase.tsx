import React from "react";
import {showModal} from "@/utils/showModal";
import {Alert, Button, Space} from "antd";
import {failed, info} from "@/utils/notification";

interface MigrateLegacyDatabaseProp {

}

const MigrateLegacyDatabase: React.FC<MigrateLegacyDatabaseProp> = (props) => {
    return <div>

    </div>
};

const {ipcRenderer} = window.require("electron");

export const migrateLegacyDatabase = () => {
    const m = showModal({
        title: "自动迁移数据库",
        width: "40%",
        content: (
            <Space direction={"vertical"}>
                <div>在本系统较新版本项目数据库分离，从旧数据库迁移到新数据库模式需要花费用户几分钟时间。</div>
                <Alert type={"info"} message={"本操作将迁移如下数据：用户偏好，插件，Payloads"}/>
                <div>
                    <Button type={"primary"} onClick={()=>{
                        ipcRenderer.invoke("MigrateLegacyDatabase", {}).then(()=>{
                            info("数据库迁移成功")
                            m.destroy()
                        }).catch(e => {
                            failed(`数据库迁移失败：${e}`)
                        })
                    }}>我明白，马上迁移</Button>
                </div>
            </Space>
        )
    })
}