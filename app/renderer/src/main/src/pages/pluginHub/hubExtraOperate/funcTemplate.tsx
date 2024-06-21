import React, {ReactNode, memo, useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {YakitButtonProp, YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {Form, Tooltip} from "antd"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemotePluginGV} from "@/enums/plugin"
import {RemoteMenuGV} from "@/enums/menu"
import {isCommunityEdition} from "@/utils/envfile"
import {yakitNotify} from "@/utils/notification"
import {YakScript} from "@/pages/invoker/schema"
import {DatabaseFirstMenuProps} from "@/routes/newRoute"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitRoute} from "@/enums/yakitRoute"
import {CollaboratorInfoProps} from "@/pages/plugins/baseTemplateType"
import {PluginContributesListItem, onPluginTagsToName} from "@/pages/plugins/baseTemplate"
import {OutlineQuestionmarkcircleIcon} from "@/assets/icon/outline"
import {pluginTypeToName} from "@/pages/plugins/builtInData"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {AuthorIcon, AuthorImg, TagsListShow} from "@/pages/plugins/funcTemplate"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {SolidChevrondownIcon, SolidChevronupIcon} from "@/assets/icon/solid"
import {formatDate} from "@/utils/timeUtil"

import classNames from "classnames"
import UnLogin from "@/assets/unLogin.png"
import styles from "./HubExtraOperate.module.scss"

const {ipcRenderer} = window.require("electron")

interface HubButtonProps extends YakitButtonProp {
    /** 按钮文案 */
    name: string
    /** 父元素宽度 */
    width?: number
    /** 只展示icon的临界宽度 */
    iconWidth?: number
    /** icon的popover文案 */
    hint?: string
}
export const HubButton: React.FC<HubButtonProps> = memo((props) => {
    const {name, width, iconWidth, hint, className, disabled, size, ...rest} = props

    const isIcon = useMemo(() => {
        if (!width || !iconWidth) return false
        return width <= iconWidth
    }, [width, iconWidth])

    const tooltipHint = useMemo(() => {
        if (disabled) return hint || name || ""
        if (isIcon) return name || ""
        return ""
    }, [name, hint, disabled, isIcon])

    const paddingClass = useMemo(() => {
        if (size === "small") return "hub-button-icon-small-padding"
        if (size === "large") return "hub-button-icon-large-padding"
        if (size === "max") return "hub-button-icon-max-padding"
        return "hub-button-icon-padding"
    }, [size])

    return (
        <Tooltip overlayClassName='plugins-tooltip' title={tooltipHint}>
            <YakitButton
                {...rest}
                className={classNames(className, {[styles[paddingClass]]: isIcon})}
                disabled={false}
                size={size}
            >
                <span className={isIcon ? styles["hub-button-hidden"] : ""}>{name}</span>
            </YakitButton>
        </Tooltip>
    )
})

interface HubOperateHintProps {
    visible: boolean
    /** @param isCache 是否不再提示 */
    onOk: (isCache: boolean) => any
}
export const HubOperateHint: React.FC<HubOperateHintProps> = memo((props) => {
    const {visible, onOk} = props

    const [cache, setCache] = useState<boolean>(false)
    const handleOk = useMemoizedFn(() => {
        if (cache) setRemoteValue(RemotePluginGV.AutoDownloadPlugin, `true`)
        onOk(cache)
    })

    return (
        <YakitHint
            visible={visible}
            wrapClassName={styles["hub-operate-hint"]}
            title='该操作为本地功能'
            content={
                <>
                    <span className={styles["operate-style"]}>编辑、添加到菜单栏、移除菜单栏、导出</span>
                    <span className={styles["content-style"]}>均为本地操作，点击后会自动下载插件并进行对应操作</span>
                </>
            }
            okButtonText='好的'
            onOk={handleOk}
            cancelButtonProps={{style: {display: "none"}}}
            footerExtra={
                <YakitCheckbox value={cache} onChange={(e) => setCache(e.target.checked)}>
                    下次不再提醒
                </YakitCheckbox>
            }
        />
    )
})

interface RemovePluginMenuContentProps {
    /** 插件名 */
    pluginName: string
}
/** @name 移出菜单(插件页面) */
export const RemovePluginMenuContent: React.FC<RemovePluginMenuContentProps> = memo((props) => {
    const {pluginName} = props

    const menuMode = useRef<"expert" | "new">("expert")
    const [groups, setGroups] = useState<string[]>([])

    useEffect(() => {
        updateGroups()
    }, [])

    const updateGroups = useMemoizedFn(async () => {
        if (!pluginName) {
            setGroups([])
            return
        }

        try {
            let mode = await getRemoteValue(RemoteMenuGV.PatternMenu)
            menuMode.current = mode || "expert"
        } catch (error) {}
        ipcRenderer
            .invoke("QueryNavigationGroups", {
                YakScriptName: pluginName,
                Mode: isCommunityEdition() ? RemoteMenuGV.CommunityMenuMode : menuMode.current
            })
            .then((data: {Groups: string[]}) => {
                setGroups(data.Groups || [])
            })
            .catch((e: any) => {
                setGroups([])
                yakitNotify("error", "获取菜单失败：" + e)
            })
    })
    const onClickRemove = useMemoizedFn((element: string) => {
        ipcRenderer
            .invoke("DeleteAllNavigation", {
                YakScriptName: pluginName,
                Group: element,
                Mode: isCommunityEdition() ? RemoteMenuGV.CommunityMenuMode : menuMode.current
            })
            .then(() => {
                if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                else ipcRenderer.invoke("change-main-menu")
                updateGroups()
            })
            .catch((e: any) => {
                yakitNotify("error", "移除菜单失败：" + e)
            })
    })
    return (
        <div className={styles["remove-plugin-menu-content"]}>
            {groups.length > 0
                ? groups.map((element) => {
                      return (
                          <YakitButton type='outline2' key={element} onClick={() => onClickRemove(element)}>
                              从 {element} 中移除
                          </YakitButton>
                      )
                  })
                : "暂无数据或插件未被添加到菜单栏"}
        </div>
    )
})

interface AddPluginMenuContentProps {
    /** 本地插件详情 */
    script: YakScript
    onCancel: () => any
}
/** @name 添加到菜单(插件页面) */
export const AddPluginMenuContent: React.FC<AddPluginMenuContentProps> = (props) => {
    const {script, onCancel} = props

    const [form] = Form.useForm()

    const menuMode = useRef<"expert" | "new">("expert")
    const menus = useRef<DatabaseFirstMenuProps[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [option, setOption] = useState<{label: string; value: string}[]>([])

    useEffect(() => {
        if (!script) return
        form.setFieldsValue({
            Group: "",
            Verbose: script.ScriptName
        })
    }, [script])
    useEffect(() => {
        getRemoteValue(RemoteMenuGV.PatternMenu).then((patternMenu) => {
            menuMode.current = patternMenu || "expert"
            init()
        })
    }, [])

    /** 获取一级菜单 */
    const init = useMemoizedFn(() => {
        ipcRenderer
            .invoke("GetAllNavigationItem", {
                Mode: isCommunityEdition() ? RemoteMenuGV.CommunityMenuMode : menuMode.current
            })
            .then((rsp: {Data: DatabaseFirstMenuProps[]}) => {
                menus.current = rsp.Data
                setOption(rsp.Data.map((ele) => ({label: ele.Group, value: ele.Group})))
                form.setFieldsValue({
                    Group: rsp.Data[0]?.Group || "",
                    Verbose: script?.ScriptName || ""
                })
            })
            .catch((err) => {
                yakitNotify("error", "获取菜单失败：" + err)
            })
    })

    const onFinsh = useMemoizedFn((values: any) => {
        if (!script) {
            yakitNotify("error", "No Yak Modeule Selected")
            return
        }
        if (loading) return
        setLoading(true)

        const index = menus.current.findIndex((ele) => ele.Group === values.Group)
        const menusLength = menus.current.length
        let params: any = {}

        if (index === -1) {
            if (menusLength >= 50) {
                yakitNotify("error", "最多添加50个一级菜单")
                return
            }
            params = {
                YakScriptName: script.ScriptName,
                Verbose: values.Verbose,
                VerboseLabel: script.ScriptName,
                Group: values.Group,
                GroupLabel: values.Group,
                Mode: isCommunityEdition() ? RemoteMenuGV.CommunityMenuMode : menuMode.current,
                VerboseSort: 1,
                GroupSort: menusLength + 1,
                Route: YakitRoute.Plugin_OP
            }
        } else {
            const groupInfo = menus.current[index]
            if (groupInfo.Items.length >= 50) {
                yakitNotify("error", "同一个一级菜单最多添加50个二级菜单")
                return
            }
            params = {
                YakScriptName: script.ScriptName,
                Verbose: values.Verbose,
                VerboseLabel: script.ScriptName,
                Group: groupInfo.Group,
                GroupLabel: groupInfo.GroupLabel,
                Mode: isCommunityEdition() ? RemoteMenuGV.CommunityMenuMode : menuMode.current,
                VerboseSort: 0,
                GroupSort: groupInfo.GroupSort,
                Route: YakitRoute.Plugin_OP
            }
            const subIndex = groupInfo.Items.findIndex((ele) => ele.Verbose === values.Verbose)
            params.VerboseSort =
                subIndex === -1 ? groupInfo.Items.length + 1 : groupInfo.Items[subIndex].VerboseSort || 0
        }

        ipcRenderer
            .invoke("AddOneNavigation", params)
            .then(() => {
                if (isCommunityEdition()) ipcRenderer.invoke("refresh-public-menu")
                else ipcRenderer.invoke("change-main-menu")
                yakitNotify("success", "添加成功")
                onCancel()
            })
            .catch((e: any) => {
                yakitNotify("error", `${e}`)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    return (
        <div className={styles["add-plugin-menu-content"]}>
            <Form form={form} layout='vertical' onFinish={onFinsh}>
                <Form.Item
                    label={"菜单选项名(展示名称)"}
                    name='Verbose'
                    rules={[{required: true, message: "该项为必填"}]}
                >
                    <YakitInput />
                </Form.Item>
                <Form.Item label={"菜单分组"} name='Group' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitAutoComplete options={option} />
                </Form.Item>
                <div className={styles["form-btn-group"]}>
                    <Form.Item colon={false} noStyle>
                        <YakitButton type='outline1' onClick={onCancel}>
                            取消
                        </YakitButton>
                    </Form.Item>
                    <Form.Item colon={false} noStyle>
                        <YakitButton type='primary' htmlType='submit' loading={loading}>
                            添加
                        </YakitButton>
                    </Form.Item>
                </div>
            </Form>
        </div>
    )
}

interface HubDetailHeaderProps {
    /** wrapper classname */
    wrapperClassName?: string
    /** 插件名称 */
    pluginName: string
    /** 插件help信息 */
    help?: string
    /**插件类型 */
    type: string
    /** 插件标签组 */
    tags?: string
    /** tag(type+标签内容)最小宽度 */
    tagMinWidth?: number
    /** 右侧拓展元素 */
    extraNode?: ReactNode
    /** 作者头像 */
    img: string
    /** 作者名称 */
    user: string
    /**协作者信息 */
    prImgs?: CollaboratorInfoProps[]
    /** 更新时间 */
    updated_at: number
    /** 复制源插件 */
    basePluginName?: string
    /** 信息栏右侧拓展元素 */
    infoExtra?: ReactNode
}
/** @name 插件详情-头部信息 */
export const HubDetailHeader: React.FC<HubDetailHeaderProps> = memo((props) => {
    const {
        wrapperClassName,
        pluginName,
        help,
        type,
        tags,
        tagMinWidth = 120,
        extraNode,
        img,
        user,
        prImgs = [],
        updated_at,
        basePluginName,
        infoExtra
    } = props

    const tagList = useMemo(() => {
        if (!tags) return []
        if (tags === "null") return []
        let arr: string[] = []
        try {
            arr = tags ? tags.split(",") : []
            arr = arr.map((item) => onPluginTagsToName(item))
        } catch (error) {}
        return arr
    }, [tags])

    const [prShow, setPrShow] = useState<boolean>(false)
    /** 贡献者数据 */
    const contributes: {arr: CollaboratorInfoProps[]; length: number} = useMemo(() => {
        // 这是第二版需要的数据
        if (prImgs.length <= 5) return {arr: prImgs, length: prImgs.length}
        else {
            return {arr: prImgs.slice(0, 5), length: prImgs.length - 5}
        }
    }, [prImgs])

    return (
        <div className={classNames(styles["hub-detail-wrapper"], wrapperClassName)}>
            <div className={styles["header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["info-title"]}>
                        <div
                            className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}
                            title={pluginName}
                        >
                            {pluginName || "-"}
                        </div>
                        <div className={styles["subtitle-wrapper"]}>
                            <Tooltip title={help || "No Description about it."} overlayClassName='plugins-tooltip'>
                                <OutlineQuestionmarkcircleIcon className={styles["help-icon"]} />
                            </Tooltip>
                        </div>
                    </div>
                    <div style={{minWidth: tagMinWidth || 120}} className={styles["info-tags"]}>
                        {pluginTypeToName[type] && pluginTypeToName[type].name && (
                            <YakitTag color={pluginTypeToName[type]?.color as any}>
                                {pluginTypeToName[type]?.name}
                            </YakitTag>
                        )}
                        <TagsListShow tags={tagList || []} />
                    </div>
                </div>
                {extraNode || null}
            </div>

            <div className={styles["author-wrapper"]}>
                <div className={styles["left-wrapper"]}>
                    <div className={styles["left-wrapper"]}>
                        <div className={styles["author-wrapper"]}>
                            <AuthorImg src={img || UnLogin} />
                            <div
                                className={classNames(
                                    styles["name-wrapper"],
                                    styles["text-style"],
                                    "yakit-content-single-ellipsis"
                                )}
                                title={user || "anonymous"}
                            >
                                {user || "anonymous"}
                            </div>
                            <AuthorIcon />
                        </div>

                        {contributes.length > 0 && (
                            <>
                                <div style={{marginRight: 8}} className={styles["divider-style"]}></div>
                                <YakitPopover
                                    overlayClassName={styles["contributes-popover"]}
                                    placement='bottom'
                                    content={
                                        <div className={styles["contributes-list"]}>
                                            {contributes.arr.map((item) => (
                                                <React.Fragment key={item.headImg + item.userName}>
                                                    <PluginContributesListItem
                                                        contributesHeadImg={item.headImg}
                                                        contributesName={item.userName}
                                                    />
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    }
                                    onVisibleChange={setPrShow}
                                >
                                    <YakitButton type='text2' isActive={prShow}>
                                        {`${contributes.length}位协作者`}
                                        {prShow ? <SolidChevronupIcon /> : <SolidChevrondownIcon />}
                                    </YakitButton>
                                </YakitPopover>
                            </>
                        )}
                    </div>
                    {basePluginName && (
                        <>
                            <div className={styles["divider-style"]} />
                            <div className={styles["copy-wrapper"]}>
                                <span className={styles["text-style"]}>来源:</span>
                                <Tooltip
                                    title={`复制插件 “${basePluginName}” 为 “${pluginName}”`}
                                    overlayClassName='plugins-tooltip'
                                >
                                    <YakitTag style={{marginRight: 0, cursor: "pointer"}}>复制</YakitTag>
                                </Tooltip>
                            </div>
                        </>
                    )}
                </div>

                <div className={styles["divider-style"]}></div>
                <div
                    className={classNames(styles["text-style"], {[styles["constant-wrapper"]]: !infoExtra})}
                >{`更新时间 : ${formatDate(updated_at)}`}</div>

                {!!infoExtra && (
                    <>
                        <div className={styles["divider-style"]} />
                        {infoExtra}
                    </>
                )}
            </div>
        </div>
    )
})
