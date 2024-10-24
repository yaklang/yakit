import React, {memo, useMemo} from "react"
import {useMemoizedFn} from "ahooks"
import Icon from "@ant-design/icons/lib/components/Icon"
import {IconProps, PluginLogOptProps} from "./PluginLogType"
import {PluginLogTypeToInfo} from "./defaultConstant"
import {AuthorImg} from "@/pages/plugins/funcTemplate"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePencilaltIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import useAdmin from "@/hook/useAdmin"
import {useStore} from "@/store"
import {pluginSupplementJSONConvertToData} from "@/pages/pluginEditor/utils/convert"
import {ImagePreviewList} from "../utilsUI/UtilsTemplate"
import {TextareaForImage} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextareaType"

import classNames from "classnames"
import styles from "./PluginLog.module.scss"
import UnLogin from "@/assets/unLogin.png"

/** @name 插件日志 */
export const PluginLogOpt: React.FC<PluginLogOptProps> = memo((props) => {
    const {plugin, latestAudit, info, hiddenLine, callback} = props

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
            if (!info.parentComment) {
                logType = "comment"
            } else {
                logType = "reply"
            }
        }

        return PluginLogTypeToInfo[logType] || PluginLogTypeToInfo["default"]
    }, [info.checkStatus, info.logType, info.parentComment])
    /** 角色tag */
    const roleTag = useMemo(() => {
        const isAuthors = info.isAuthors
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
    }, [info.isAuthors, info.userRole])

    /** 合并修改的角色tag */
    const mergeRoleTag = useMemo(() => {
        if (!["mergePass", "mergeNoPass"].includes(typeInfo.key)) return null
        if (!info.handleUser) return null

        const isAuthors = info.handleUser.isAuthor
        const role = info.handleUser.handleUserRole

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
    }, [typeInfo.key, info.handleUser])

    /** 回复时的被回复角色tag */
    const replyRoleTag = useMemo(() => {
        if (typeInfo.key !== "reply") return null
        if (!info.parentComment) return null

        const isAuthors = info.parentComment.isAuthors
        const role = info.parentComment.userRole

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
    }, [typeInfo.key, info.parentComment, info.isAuthors, info.userRole])

    /** 日志头部信息(用户|操作标识) */
    const header = useMemo(() => {
        const {key, content} = typeInfo

        if (["mergePass", "mergeNoPass"].includes(key)) {
            const {handleUser} = info
            if (!handleUser) return null
            return (
                <>
                    <AuthorImg src={handleUser.handleHeadImg || UnLogin} wrapperClassName={styles["img-style"]} />
                    <div className={styles["author-name"]}>{handleUser.handleUserName}</div>
                    {mergeRoleTag}
                    <div className={styles["log-content"]}>{content}</div>
                    <div className={classNames(styles["author-name"], styles["reply-name"])}>{info.userName}</div>
                    {roleTag}
                    <div className={styles["log-content"]}>的修改</div>
                </>
            )
        }

        if (key === "reply") {
            const {parentComment} = info
            if (!parentComment) return null
            return (
                <>
                    <AuthorImg src={info.headImg || UnLogin} wrapperClassName={styles["img-style"]} />
                    <div className={styles["author-name"]}>{info.userName}</div>
                    {roleTag}
                    <div className={styles["log-content"]}>{content}</div>
                    <div className={classNames(styles["author-name"], styles["reply-name"])}>
                        {parentComment.userName}
                    </div>
                    {replyRoleTag}
                </>
            )
        }

        return (
            <>
                <AuthorImg src={info.headImg || UnLogin} wrapperClassName={styles["img-style"]} />
                <div className={styles["author-name"]}>{info.userName}</div>
                {roleTag}
                <div className={styles["log-content"]}>{content}</div>
            </>
        )
    }, [typeInfo, info, roleTag, mergeRoleTag, replyRoleTag])

    /** 日志的额外附加信息是否显示 */
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
    // 额外信息 UI
    const additional = useMemo(() => {
        const {key} = typeInfo
        if (key === "update" || key === "applyMerge" || key === "mergeNoPass" || key === "checkNoPass") {
            let content = info.description
            if (!content) return null

            const strs = info.description.split("\n")
            const header = strs[0]
            if (["extra", "body"].includes(header)) {
                strs.shift()
                content = strs.join("\n")
            }

            return (
                <div className={classNames(styles["description-style"], "yakit-content-multiLine-ellipsis")}>
                    {content}
                </div>
            )
        }
        if (key === "comment") {
            const {text, imgs} = pluginSupplementJSONConvertToData(info.description) || {
                text: undefined,
                imgs: undefined
            }
            const isImgs = imgs && imgs.length > 0
            if (!text && !imgs) return null

            return (
                <>
                    {!!text && (
                        <div
                            className={classNames(styles["description-style"], "yakit-content-multiLine-ellipsis")}
                            title={text}
                        >
                            {text}
                        </div>
                    )}
                    {isImgs && (
                        <div style={text ? {marginTop: 8} : undefined} className={styles["comment-image-style"]}>
                            <ImagePreviewList imgs={imgs} />
                        </div>
                    )}
                </>
            )
        }
        if (key === "reply") {
            if (!info.parentComment) return null
            const {parentComment} = info
            // 回复评论
            const {text, imgs} = pluginSupplementJSONConvertToData(info.description) || {
                text: undefined,
                imgs: undefined
            }
            const isImgs = imgs && imgs.length > 0
            if (!text && !imgs) return null
            let replyText: string = ""
            let replyImgs: TextareaForImage[] | undefined = undefined
            if (parentComment.logType === "comment") {
                const {text: oldText, imgs: oldImgs} = pluginSupplementJSONConvertToData(
                    info.parentComment?.description || ""
                ) || {text: undefined, imgs: undefined}
                replyText = oldText || ""
                replyImgs = oldImgs
            } else {
                replyText = parentComment.description
            }
            // 被回复评论
            const isReplyImgs = replyImgs && replyImgs.length > 0
            if (!replyText && !replyImgs) return null

            return (
                <>
                    <div className={styles["reply-style"]}>
                        <div className={styles["reply-line"]}></div>
                        <div
                            className={styles["reply-content"]}
                            onClick={() => {
                                handleType("quotation")
                            }}
                        >
                            {!!replyText && (
                                <div
                                    className={classNames(styles["content-style"], "yakit-content-single-ellipsis")}
                                    title={replyText}
                                >
                                    {replyText}
                                </div>
                            )}
                            {isReplyImgs && <div>{`[图片] * ${replyImgs?.length}`}</div>}
                        </div>
                    </div>
                    {!!text && (
                        <div
                            style={text ? {marginTop: 20} : undefined}
                            className={classNames(
                                styles["comment-style"],
                                styles["description-style"],
                                "yakit-content-multiLine-ellipsis"
                            )}
                            title={text}
                        >
                            {text}
                        </div>
                    )}
                    {isImgs && (
                        <div style={text ? {marginTop: 20} : {marginTop: 8}} className={styles["comment-image-style"]}>
                            <ImagePreviewList imgs={imgs} />
                        </div>
                    )}
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
    // const showSupplement = useMemo(() => {
    // if (!userInfo.isLogin) return false
    // if (plugin.status !== 2) return false
    // if (info.id !== latestAudit?.id) return false
    // if (!info.loginIsPluginUser) return false
    // const strs = info.description.split("\n")
    // const header = strs[0]
    // if (!header) return
    // if (header === "extra") return true
    // return false
    // }, [userInfo.isLogin, plugin.status, latestAudit, info.loginIsPluginUser, info.description])
    // 是否展示回复
    const showReply = useMemo(() => {
        if (!userInfo.isLogin) return false
        if (typeInfo.key === "checkNoPass" && info.loginIsPluginUser) return true
        if (["comment", "reply"].includes(typeInfo.key)) return true
        return false
    }, [userInfo.isLogin, typeInfo.key, info.loginIsPluginUser])
    // 是否展示评论的删除按钮
    const showDel = useMemo(() => {
        if (!userInfo.isLogin) return false
        if (!["comment", "reply"].includes(typeInfo.key)) return false
        if (info.loginIsLogUser) return true
        if (admin.isAdmin) return true
        return false
    }, [userInfo.isLogin, typeInfo.key, info, admin.isAdmin])

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
                            {header}
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
                            {/* {showSupplement && (
                                <YakitButton
                                    onClick={() => {
                                        handleType("supplement")
                                    }}
                                >
                                    补充资料
                                </YakitButton>
                            )} */}
                            {showReply && (
                                <YakitButton
                                    className={styles["reply-btn"]}
                                    type='outline2'
                                    icon={<OutlinePencilaltIcon />}
                                    onClick={() => {
                                        handleType("reply")
                                    }}
                                >
                                    回复
                                </YakitButton>
                            )}
                            {showDel && (
                                <YakitButton
                                    className={styles["reply-btn"]}
                                    type='text'
                                    colors='danger'
                                    icon={<OutlineTrashIcon />}
                                    onClick={() => {
                                        handleType("deleteComment")
                                    }}
                                ></YakitButton>
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
