import React, {useState} from "react"
import {PluginDetailHeader} from "../baseTemplate"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {YakFilterRemoteObj} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {PluginFilterParams} from "../baseTemplateType"
import {PluginDetailsTabProps} from "./PluginsLocalType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import PluginTabs from "@/components/businessUI/PluginTabs/PluginTabs"
import {LocalPluginExecute} from "./LocalPluginExecute"
import Login from "@/pages/Login"

import classNames from "classnames"
import "../plugins.scss"
import styles from "./PluginsLocalDetail.module.scss"

const {TabPane} = PluginTabs

/**转换group参数*/
export const convertGroupParam = (filter: PluginFilterParams, extra: {group: YakFilterRemoteObj[]}) => {
    const realFilters: PluginFilterParams = {
        ...filter,
        plugin_group: extra.group.map((item) => ({value: item.name, count: item.total, label: item.name}))
    }
    return realFilters
}

export const PluginDetailsTab: React.FC<PluginDetailsTabProps> = React.memo((props) => {
    const {pageWrapId = "", executorShow, plugin, headExtraNode, wrapperClassName = "", linkPluginConfig} = props

    // 激活tab
    const [activeKey, setActiveKey] = useState<string>("execute")
    // 登录框状态
    const [loginshow, setLoginShow] = useState<boolean>(false)

    return (
        <div className={classNames(styles["details-content-wrapper"], wrapperClassName)}>
            <PluginTabs
                activeKey={activeKey}
                tabPosition='right'
                onTabClick={(key) => {
                    setActiveKey(key)
                }}
            >
                <TabPane tab='执行' key='execute'>
                    <div className={styles["plugin-execute-wrapper"]}>
                        {executorShow ? (
                            <LocalPluginExecute
                                plugin={plugin}
                                headExtraNode={headExtraNode}
                                linkPluginConfig={linkPluginConfig}
                            />
                        ) : (
                            <YakitSpin wrapperClassName={styles["plugin-execute-spin"]} />
                        )}
                    </div>
                </TabPane>
                <TabPane tab='源码' key='code'>
                    <div className={styles["plugin-info-wrapper"]}>
                        <PluginDetailHeader
                            pluginName={plugin.ScriptName}
                            help={plugin.Help}
                            tags={plugin.Tags}
                            extraNode={<div className={styles["extra"]}>{headExtraNode}</div>}
                            img={plugin.HeadImg || ""}
                            user={plugin.Author}
                            pluginId={plugin.UUID}
                            updated_at={plugin.UpdatedAt || 0}
                            prImgs={(plugin.CollaboratorInfo || []).map((ele) => ({
                                headImg: ele.HeadImg,
                                userName: ele.UserName
                            }))}
                            type={plugin.Type}
                        />
                        <div className={styles["details-editor-wrapper"]}>
                            <YakitEditor type={plugin.Type} value={plugin.Content} readOnly={true} />
                        </div>
                    </div>
                </TabPane>
            </PluginTabs>
            {loginshow && <Login visible={loginshow} onCancel={() => setLoginShow(false)}></Login>}
        </div>
    )
})
