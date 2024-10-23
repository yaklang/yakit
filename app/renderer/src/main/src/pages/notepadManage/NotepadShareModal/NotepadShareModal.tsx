import React, {useState} from "react"
import styles from "./NotepadShareModal.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineChevrondownIcon, OutlineChevronupIcon, OutlineCogIcon, OutlineUserIcon} from "@/assets/icon/outline"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {share} from "rxjs/operators"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import {apiGetUserOrdinary} from "./utils"
import {API} from "@/services/swagger/resposeType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {yakitNotify} from "@/utils/notification"

interface NotepadShareModalProps {
    documentName: string
    onClose: () => void
}

interface SelectUserProps {
    id: number
    name: string
}
const NotepadShareModal: React.FC<NotepadShareModalProps> = React.memo((props) => {
    const {documentName, onClose} = props
    const [authority, setAuthority] = useState<string>("可阅读")
    const [searchValue, setSearchValue] = useState<string>("")

    const [authVisible, setAuthVisible] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [shareText, setShareText] = useState<string>("")
    const [userList, setUserList] = useState<API.UserList[]>([])
    const [selectUserList, setSelectUserList] = useState<SelectUserProps[]>([])
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
        setShareText(`${users.map((ele) => `@${ele.name}`)} 邀请你加入共享文档 ${documentName}`)
    })
    const onRemove = useMemoizedFn((value) => {
        setSelectUserList((pre) => pre.filter((item) => item === value))
    })
    const onSend = useMemoizedFn(() => {
        if (!shareText) return
        if (!selectUserList.length) return
        yakitNotify("success", "发送成功")
    })
    const options = useCreation(() => {
        return userList.map((ele) => ({
            value: ele.id,
            title: ele.name,
            label: (
                <div className={styles["user-item"]}>
                    <img src={ele.head_img} alt={ele.name} className={styles["user-img"]} />
                    <span className={styles["user-name"]}>{ele.name}</span>
                </div>
            )
        }))
    }, [userList])
    return (
        <div className={styles["notepad-share-modal"]}>
            <div className={styles["notepad-title"]}>
                <div className={styles["title-text"]}>分享文档</div>
                <YakitButton type='text' size='large'>
                    管理协作者 <OutlineCogIcon />
                </YakitButton>
            </div>
            <div className={styles["notepad-content"]}>
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
                                    onClose={() => onRemove(props.value)}
                                >
                                    {props.label}
                                </YakitTag>
                            )
                        }}
                        wrapperClassName={styles["user-select"]}
                        optionFilterProp='title'
                    />
                    <YakitDropdownMenu
                        menu={{
                            width: 60,
                            data: [
                                {key: "read", label: "可阅读"},
                                {key: "edit", label: "可编辑"}
                            ],
                            onClick: ({key}) => {
                                switch (key) {
                                    case "read":
                                        setAuthority("可阅读")
                                        break
                                    case "edit":
                                        setAuthority("可编辑")
                                        break
                                    default:
                                        break
                                }
                            }
                        }}
                        dropdown={{
                            trigger: ["click"],
                            placement: "bottom",
                            visible: authVisible,
                            onVisibleChange: setAuthVisible
                        }}
                    >
                        <YakitButton type='text' className={styles["user-authority"]}>
                            {authority}
                            {authVisible ? <OutlineChevrondownIcon /> : <OutlineChevronupIcon />}
                        </YakitButton>
                    </YakitDropdownMenu>
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
                    <YakitButton type='primary' size='large' disabled={!selectUserList.length} onClick={onSend}>
                        发送邀请
                    </YakitButton>
                </div>
            </div>
        </div>
    )
})

export default NotepadShareModal
