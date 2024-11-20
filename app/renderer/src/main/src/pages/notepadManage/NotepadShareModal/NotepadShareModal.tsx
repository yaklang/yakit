import React, {ReactNode, useState} from "react"
import styles from "./NotepadShareModal.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineCheckIcon,
    OutlineChevrondownIcon,
    OutlineChevronleftIcon,
    OutlineChevronupIcon,
    OutlineCogIcon,
    OutlineUserIcon
} from "@/assets/icon/outline"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import {apiGetUserOrdinary, apiSetNotepadPermission} from "./utils"
import {API} from "@/services/swagger/resposeType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {yakitNotify} from "@/utils/notification"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import classNames from "classnames"
import {useStore} from "@/store"
import {judgeAvatar} from "@/pages/MainOperator"
import {randomAvatarColor} from "@/components/layout/FuncDomain"

interface NotepadShareModalProps {
    notepadInfo: API.GetNotepadList
    onClose: () => void
}

interface SelectUserProps {
    id: number
    name: string
}
interface NotepadCollaboratorInfoProps extends API.CollaboratorInfo {
    imgNode?: ReactNode
}
type NotepadPermissionType = "view" | "edit" | ""
const NotepadShareModal: React.FC<NotepadShareModalProps> = React.memo((props) => {
    const {notepadInfo, onClose} = props
    const userInfo = useStore((s) => s.userInfo)
    const [selectAuth, setSelectAuth] = useState<NotepadPermissionType>("view")
    const [searchValue, setSearchValue] = useState<string>("")
    const [confirmLoading, setConfirmLoading] = useState<boolean>(false)
    const [collaboratorLoading, setCollaboratorLoading] = useState<boolean>(false)

    const [manageVisible, setManageVisible] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [shareText, setShareText] = useState<string>("")
    const [userList, setUserList] = useState<API.UserList[]>([])
    const [selectUserList, setSelectUserList] = useState<SelectUserProps[]>([])
    //TODO - 需要后端补协作者权限
    const [collaborators, setCollaborators] = useState<NotepadCollaboratorInfoProps[]>(notepadInfo.collaborator || [])

    const onClear = useMemoizedFn(() => {
        setUserList([])
        setSelectUserList([])
    })
    const getUserOrdinary = useDebounceFn(
        useMemoizedFn((value: string) => {
            setSearchValue(value)
            if (!value) {
                setUserList([])
                return
            }
            setLoading(true)
            apiGetUserOrdinary({keywords: value})
                .then((res) => {
                    setUserList([...(res.data || [])])
                })
                .finally(() => setLoading(false))
        }),
        {wait: 200, leading: true}
    ).run
    const onChange = useMemoizedFn((value) => {
        const users = value.map((ele) => ({id: ele.value, name: ele.title}))
        setSelectUserList(users)
        setSearchValue("")
        setShareText(`${users.map((ele) => `@${ele.name}`)} 邀请你加入共享文档 ${notepadInfo.title}`)
    })
    const onSend = useMemoizedFn(() => {
        if (!shareText) return
        if (!selectUserList.length) return

        const param: API.PostNotepadPermissionRequest = {
            notepadHash: notepadInfo.hash,
            userId: selectUserList.map((ele) => ele.id),
            permissionType: selectAuth
        }
        setConfirmLoading(true)
        apiSetNotepadPermission(param)
            .then(() => {
                yakitNotify("success", "发送成功")
                onClose()
            })
            .finally(() =>
                setTimeout(() => {
                    setConfirmLoading(false)
                }, 200)
            )
    })
    const onSetAuth = useMemoizedFn((key, item) => {
        const param: API.PostNotepadPermissionRequest = {
            notepadHash: notepadInfo.hash,
            userId: [item.user_id],
            permissionType: key === "remove" ? "" : key
        }
        setCollaboratorLoading(true)
        apiSetNotepadPermission(param)
            .then(() => {
                switch (key) {
                    case "remove":
                        setCollaborators(collaborators.filter((ele) => ele.user_id !== item.user_id))
                        break

                    default:
                        const newList: NotepadCollaboratorInfoProps[] = collaborators.map((ele) =>
                            ele.user_id === item.user_id ? {...ele, role: key} : ele
                        )
                        setCollaborators(newList)
                        break
                }
            })
            .finally(() =>
                setTimeout(() => {
                    setCollaboratorLoading(false)
                }, 200)
            )
    })
    const options = useCreation(() => {
        return userList
            .map((ele) => ({
                value: ele.id,
                title: ele.name,
                label: (
                    <div className={styles["user-item"]}>
                        <img src={ele.head_img} alt={ele.name} className={styles["user-img"]} />
                        <span className={styles["user-name"]}>{ele.name}</span>
                    </div>
                )
            }))
            .filter((e) => e.value !== userInfo.user_id)
    }, [userList, userInfo.user_id])

    const collaboratorList: NotepadCollaboratorInfoProps[] = useCreation(() => {
        const newCollaborator: NotepadCollaboratorInfoProps[] =
            collaborators.map((ele) => ({
                ...ele,
                imgNode: judgeAvatar(
                    {companyHeadImg: ele.head_img, companyName: ele.user_name},
                    28,
                    randomAvatarColor()
                )
            })) || []
        const userRole: NotepadCollaboratorInfoProps[] = [
            {
                user_id: userInfo.user_id || 0,
                head_img: userInfo.companyHeadImg || "",
                user_name: userInfo.companyName || "",
                imgNode: judgeAvatar(
                    {companyHeadImg: userInfo.companyHeadImg, companyName: userInfo.companyName},
                    28,
                    randomAvatarColor()
                ),
                role: ""
            }
        ]
        return userRole.concat(newCollaborator)
    }, [collaborators, userInfo.user_id, userInfo.companyName, userInfo.companyHeadImg])
    return manageVisible ? (
        <NotepadPopoverModal
            title={
                <div className={styles["manage-title"]}>
                    <YakitButton
                        type='text2'
                        icon={<OutlineChevronleftIcon />}
                        onClick={() => setManageVisible(false)}
                    />
                    <span className={styles["manage-title-text"]}>管理协作者</span>
                </div>
            }
            content={
                <>
                    <div className={styles["manage-tip"]}>所有可访问此文档的用户</div>
                    <YakitSpin spinning={collaboratorLoading}>
                        <div className={styles["collaborator-list"]}>
                            {collaboratorList?.map((item, index) =>
                                item.user_id === userInfo.user_id ? (
                                    <div
                                        key={item.user_id}
                                        className={classNames(styles["manage-item"], styles["manage-item-author"])}
                                    >
                                        <div className={styles["user-item"]}>
                                            {item.imgNode}
                                            <span className={styles["user-name"]}>{item.user_name || "-"}</span>
                                            <YakitTag>作者</YakitTag>
                                        </div>
                                        <div className={styles["author-permission"]}>可管理</div>
                                    </div>
                                ) : (
                                    <div key={item.user_id} className={styles["manage-item"]}>
                                        <div className={styles["user-item"]}>
                                            <img src={item.head_img} alt='作者' className={styles["user-img"]} />
                                            <span className={styles["user-name"]}>{item.user_name}</span>
                                        </div>
                                        <AuthPopover
                                            enableRemove={true}
                                            currentRole={item.role as NotepadPermissionType}
                                            onSelect={(key) => onSetAuth(key, item)}
                                        />
                                    </div>
                                )
                            )}
                        </div>
                    </YakitSpin>
                </>
            }
        />
    ) : (
        <NotepadPopoverModal
            title={
                <>
                    <div className={styles["title-text"]}>分享文档</div>
                    <YakitButton type='text' size='large' onClick={() => setManageVisible(true)}>
                        管理协作者 <OutlineCogIcon />
                    </YakitButton>
                </>
            }
            content={
                <>
                    <div className={styles["notepad-user-select"]}>
                        <OutlineUserIcon className={styles["user-icon"]} />
                        <YakitSelect
                            mode='multiple'
                            placeholder='可搜索用户名邀请协作者'
                            options={options}
                            onSearch={getUserOrdinary}
                            searchValue={searchValue}
                            onClear={onClear}
                            allowClear={true}
                            notFoundContent={loading ? <YakitSpin size='small' /> : "暂无数据"}
                            onChange={onChange}
                            labelInValue
                            tagRender={(props) => {
                                return (
                                    <YakitTag
                                        className={styles["user-tag-render"]}
                                        closable={true}
                                        onClose={props.onClose}
                                    >
                                        {props.label}
                                    </YakitTag>
                                )
                            }}
                            wrapperClassName={styles["user-select"]}
                            optionFilterProp='title'
                        />
                        <AuthPopover
                            currentRole={selectAuth}
                            onSelect={setSelectAuth}
                            className={styles["user-authority"]}
                        />
                    </div>
                    {!!selectUserList.length && (
                        <div className={styles["notepad-text-body"]}>
                            <div>邀请通知:</div>
                            <YakitInput.TextArea
                                rows={3}
                                value={shareText}
                                onChange={(e) => {
                                    setShareText(e.target.value)
                                }}
                                status={(!shareText && "error") || ""}
                            />
                        </div>
                    )}
                    <div className={styles["notepad-footer"]}>
                        <YakitButton type='outline2' size='large' onClick={onClose}>
                            取消
                        </YakitButton>
                        <YakitButton
                            type='primary'
                            size='large'
                            loading={confirmLoading}
                            disabled={!selectUserList.length}
                            onClick={onSend}
                        >
                            发送邀请
                        </YakitButton>
                    </div>
                </>
            }
        />
    )
})

interface AuthPopoverProps {
    currentRole?: NotepadPermissionType
    enableRemove?: boolean
    className?: string
    onSelect?: (key: NotepadPermissionType) => void
}
const AuthPopover: React.FC<AuthPopoverProps> = React.memo((props) => {
    const {currentRole, enableRemove, onSelect, className = ""} = props
    const [authVisibleMenu, setAuthVisibleMenu] = useState<boolean>(false)
    const menuList: YakitMenuItemType[] = useCreation(() => {
        let menu: YakitMenuItemType[] = [
            {key: "view", label: "可阅读"},
            {key: "edit", label: "可编辑"}
        ]
        if (enableRemove) {
            menu = [...menu, {type: "divider"}, {key: "remove", label: "移除", type: "danger"}]
        }
        return menu
    }, [enableRemove])
    const text = useCreation(() => {
        switch (currentRole) {
            case "view":
                return "可阅读"
            case "edit":
                return "可编辑"
            default:
                return "移除"
        }
    }, [currentRole])
    return (
        <YakitPopover
            visible={authVisibleMenu}
            onVisibleChange={setAuthVisibleMenu}
            content={
                <div className={styles["auth-popover-menu-list"]}>
                    {menuList.map((ele, index) =>
                        ele.type === "divider" ? (
                            <div key={index} className={styles["divider-line"]} />
                        ) : (
                            <div
                                key={ele.key}
                                className={classNames(styles["menu-item"], {
                                    [styles["menu-item-danger"]]: ele.type === "danger"
                                })}
                                onClick={() => {
                                    onSelect && onSelect(ele.key as NotepadPermissionType)
                                    setAuthVisibleMenu(false)
                                }}
                            >
                                {ele.label}
                                {currentRole === ele.key && <OutlineCheckIcon className={styles["check-icon"]} />}
                            </div>
                        )
                    )}
                </div>
            }
            overlayClassName={styles["auth-popover"]}
            placement='bottom'
        >
            <YakitButton type='text' className={className}>
                {text}
                {authVisibleMenu ? <OutlineChevrondownIcon /> : <OutlineChevronupIcon />}
            </YakitButton>
        </YakitPopover>
    )
})

interface NotepadPopoverModalProps {
    title: ReactNode
    content: ReactNode
}
const NotepadPopoverModal: React.FC<NotepadPopoverModalProps> = React.memo((props) => {
    const {title, content} = props
    return (
        <div className={styles["notepad-share-modal"]}>
            <div className={styles["notepad-title"]}>{title}</div>
            <div className={styles["notepad-content"]}>{content}</div>
        </div>
    )
})

export default NotepadShareModal
