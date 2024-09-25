import React, {memo, useMemo} from "react"
import {useMemoizedFn} from "ahooks"
import Icon from "@ant-design/icons/lib/components/Icon"
import {IconProps, PluginLogOptProps} from "./PluginLogType"
import {PluginLogTypeToInfo} from "./defaultConstant"
import {AuthorImg} from "@/pages/plugins/funcTemplate"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePencilaltIcon} from "@/assets/icon/outline"
import useAdmin from "@/hook/useAdmin"
import {useStore} from "@/store"

import classNames from "classnames"
import styles from "./PluginLog.module.scss"
import UnLogin from "@/assets/unLogin.png"

/** @name 插件日志 */
export const PluginLogOpt: React.FC<PluginLogOptProps> = memo((props) => {
    const {plugin, info, hiddenLine, callback} = props

    const {userInfo} = useStore()
    const admin = useAdmin()

    /** 日志类型和相关信息获取 */
    const typeInfo = useMemo(() => {
        const status = info.checkStatus
        const type = info.logType

        let logType: string = "default"
        if (["submit", "update", "delete", "recover"].includes(type)) {
            logType = type
        }
        // 审核状态
        if (type === "check") {
            if (status === 1) {
                logType = "checkPass"
            }
            if (status === 2) {
                logType = "checkNoPass"
            }
        }
        // 申请合并状态
        if (type === "applyMerge") {
            if (status === 0) {
                logType = "applyMerge"
            }
            if (status === 1) {
                logType = "mergePass"
            }
            if (status === 2) {
                logType = "mergeNoPass"
            }
        }
        // 评论-未写逻辑
        if (type === "comment") {
            if (info.isAuthors) {
                logType = "comment"
            } else {
                logType = "reply"
            }
        }

        return PluginLogTypeToInfo[logType] || PluginLogTypeToInfo["default"]
    }, [])
    /** 角色tag */
    const roleTag = useMemo(() => {
        const isAuthors = info.loginIsPluginUser
        const role = info.userRole

        if (isAuthors) {
            return (
                <YakitRoundCornerTag wrapperClassName={styles["role-tag"]} color='info'>
                    作者
                </YakitRoundCornerTag>
            )
        }
        if (role === "admin") {
            return (
                <YakitRoundCornerTag wrapperClassName={styles["role-tag"]} color='blue'>
                    管理员
                </YakitRoundCornerTag>
            )
        }
        if (role === "trusted") {
            return (
                <YakitRoundCornerTag wrapperClassName={styles["role-tag"]} color='green'>
                    信任用户
                </YakitRoundCornerTag>
            )
        }
        if (role === "auditor") {
            return (
                <YakitRoundCornerTag wrapperClassName={styles["role-tag"]} color='blue'>
                    审核员
                </YakitRoundCornerTag>
            )
        }

        return null
    }, [info])

    /** 日志的额外附加信息 */
    const showAdditional = useMemo(() => {
        const {key} = typeInfo
        return (
            key === "update" ||
            key === "checkNoPass" ||
            key === "applyMerge" ||
            key === "mergeNoPass" ||
            key === "comment" ||
            key === "reply"
        )
    }, [typeInfo])
    const additional = useMemo(() => {
        const {key} = typeInfo
        if (key === "update" || key === "applyMerge" || key === "mergeNoPass" || key === "checkNoPass") {
            return (
                <div className={classNames(styles["description-style"], "yakit-content-multiLine-ellipsis")}>
                    {info.description}
                </div>
            )
        }
        if (key === "comment") {
            return (
                <div className={classNames(styles["description-style"], "yakit-content-multiLine-ellipsis")}>
                    这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述
                </div>
            )
        }
        if (key === "reply") {
            return (
                <>
                    <div className={styles["reply-style"]}>
                        <div className={styles["reply-line"]}></div>
                        <div className={styles["reply-content"]}>
                            <div className={classNames(styles["content-style"], "yakit-content-single-ellipsis")}>
                                这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述
                            </div>
                            <div className={styles["content-img"]}>[图片][图片][图片]</div>
                        </div>
                    </div>
                    <div
                        className={classNames(
                            styles["comment-style"],
                            styles["description-style"],
                            "yakit-content-multiLine-ellipsis"
                        )}
                    >
                        这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述这里是对修改内容的描述
                    </div>
                </>
            )
        }
    }, [info, typeInfo])

    // 是否展示去合并
    const showMerge = useMemo(() => {
        if (typeInfo.key !== "applyMerge") return false
        if (!userInfo.isLogin) return false
        if (info.loginIsPluginUser) return true
        if (admin.isAdmin) return true
        return false
    }, [typeInfo.key, userInfo.isLogin, admin.isAdmin, info.loginIsPluginUser])
    // 是否展示 code
    const showCode = useMemo(() => {
        const {key} = typeInfo
        if (["update", "checkPass", "applyMerge", "mergePass", "mergeNoPass"].includes(key)) {
            return true
        }
        return false
    }, [typeInfo])
    // 是否展示补充资料
    const showSupplement = useMemo(() => {
        if (plugin.status !== 2) return false
        if (!info.loginIsPluginUser) return false
        return true
    }, [plugin.status, info.description, info.loginIsPluginUser])
    // 是否展示回复
    const showReply = useMemo(() => {
        if (typeInfo.key === "checkNoPass" && info.loginIsPluginUser) return true
        if (["comment", "reply"].includes(typeInfo.key)) return true
        return false
    }, [])

    const handleType = useMemoizedFn((type: string) => {
        callback(type, info)
    })

    return (
        <div className={classNames(styles["plugin-log-opt"], typeInfo.className)}>
            <div className={styles["plugin-log-opt-icon"]}>
                <PopoverArrowIcon className={styles["arrow-icon"]} />
                <div className={styles["icon-wrapper"]}>{typeInfo.icon}</div>
                <div className={classNames(styles["line-tail"], {[styles["hidden-line-tail"]]: !!hiddenLine})}>
                    <div className={styles["line-wrapper"]}>
                        <div className={styles["line-top-dot"]}></div>
                        <div className={styles["line-style"]}></div>
                        <div className={styles["line-bottom-dot"]}></div>
                    </div>
                </div>
            </div>

            <div className={styles["plugin-log-opt-info"]}>
                <div className={styles["info-body"]}>
                    {/* 头部信息 */}
                    <div
                        className={classNames(styles["info-header"], {
                            [styles["info-header-line-additional"]]: showAdditional
                        })}
                    >
                        <div className={styles["header-content"]}>
                            <AuthorImg src={info.headImg || UnLogin} wrapperClassName={styles["img-style"]} />
                            <div className={styles["author-name"]}>{info.userName}</div>
                            {roleTag}
                            {<div className={styles["log-content"]}>{typeInfo.content}</div>}
                            {typeInfo.key === "reply" && (
                                <div className={classNames(styles["author-name"], styles["reply-name"])}>
                                    {info.userName}
                                </div>
                            )}
                            <div className={styles["log-time"]}>{` · ${formatTimestamp(info.updated_at)}`}</div>
                        </div>

                        <div className={styles["header-operate"]}>
                            {showMerge && (
                                <>
                                    <YakitButton
                                        type='text'
                                        size='large'
                                        onClick={() => {
                                            handleType("merge")
                                        }}
                                    >
                                        去合并
                                    </YakitButton>
                                    <div className={styles["divider-style"]}></div>
                                </>
                            )}
                            {showCode && (
                                <YakitButton
                                    type='text'
                                    size='large'
                                    onClick={() => {
                                        handleType("code")
                                    }}
                                >
                                    Code
                                </YakitButton>
                            )}
                            {showSupplement && <YakitButton>补充资料</YakitButton>}
                            {showReply && (
                                <YakitButton type='outline2' icon={<OutlinePencilaltIcon />}>
                                    回复
                                </YakitButton>
                            )}
                        </div>
                    </div>
                    {/* 附加信息 */}
                    {showAdditional && <div className={styles["info-additional"]}>{additional}</div>}
                </div>
            </div>
        </div>
    )
})

/** 左侧冒泡框箭头 */
const PopoverArrow = () => (
    <svg width='9' height='36' viewBox='0 0 9 36' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M7.24713 11.7071L1.45424 17.5L7.24713 23.2929L7.24713 17.5L7.24713 11.7071Z' stroke='#EAECF3' />
        <path d='M7.74713 23.5L1.74713 17.5L7.74713 11.5L7.74713 17.5L7.74713 23.5Z' fill='currentColor' />
    </svg>
)
const PopoverArrowIcon = (props: Partial<IconProps>) => {
    return <Icon component={PopoverArrow} {...props} />
}
