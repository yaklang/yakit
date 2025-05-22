import React, {useCallback, useEffect, useRef, useState} from "react"
import {Ctx} from "@milkdown/kit/ctx"
import {slashFactory, SlashProvider} from "@milkdown/kit/plugin/slash"
import {useInstance} from "@milkdown/react"
import {usePluginViewContext} from "@prosemirror-adapter/react"
import styles from "./MentionListView.module.scss"
import {useDebounceEffect, useMemoizedFn} from "ahooks"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {apiGetUserSearch} from "@/pages/notepadManage/NotepadShareModal/utils"
import {API} from "@/services/swagger/resposeType"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {yakitNotify} from "@/utils/notification"
import {callCommand} from "@milkdown/kit/utils"
import {getMentionId, mentionCommand} from "../utils/mentionPlugin"
import {apiNotepadEit} from "./utils"
import classNames from "classnames"
import {InputRef} from "antd"
import {useStore} from "@/store"
export const mentionFactory = slashFactory("Commands")

interface MentionListViewProps {
    notepadHash: string
}
const mentionWidth = 240
const mentionTarget = "@"
export const MentionListView: React.FC<MentionListViewProps> = (props) => {
    const {notepadHash} = props
    const userInfo = useStore((s) => s.userInfo)
    const [isSendMessage, setIsSendMessage] = useState<boolean>(false)
    const [listLoading, setListLoading] = useState<boolean>(false)
    const [keyWord, setKeyWord] = useState<string>("")
    const [userList, setUserList] = useState<API.UserList[]>([])

    const [currentSelected, setCurrentSelected] = useState<API.UserList>()

    const ref = useRef<HTMLDivElement>(null)
    const slashProvider = useRef<SlashProvider>()
    const searchRef = useRef<InputRef>(null)

    const {view, prevState} = usePluginViewContext()
    const [loading, get] = useInstance()
    const action = useCallback(
        (fn: (ctx: Ctx) => void) => {
            if (loading) return
            get().action(fn)
        },
        [loading]
    )

    useEffect(() => {
        const div = ref.current
        if (loading || !div) {
            return
        }
        slashProvider.current = new SlashProvider({
            content: div,
            trigger: mentionTarget
        })
    }, [loading])

    useEffect(() => {
        return () => {
            // 单独的Effect中卸载，避免报错
            slashProvider.current?.destroy()
        }
    }, [])

    useDebounceEffect(
        () => {
            if (loading || !slashProvider.current) return
            slashProvider.current?.update(view, prevState)
            if (shouldShow()) {
                searchRef.current?.focus()
            }
        },
        [loading, view, prevState],
        {wait: 200, leading: true}
    )

    const shouldShow = useMemoizedFn(() => {
        if (!slashProvider.current) return false
        const currentTextBlockContent = slashProvider.current.getContent(view)

        if (!currentTextBlockContent) return false

        const target = currentTextBlockContent.at(-1)

        if (!target) return false

        return mentionTarget === target
    })

    const getUserList = useMemoizedFn((value) => {
        setListLoading(true)
        apiGetUserSearch({keywords: value})
            .then((res) => {
                // 需要过滤当前登录人
                const newData = [...(res.data || [])].filter((ele) => ele.id !== userInfo.user_id)
                if (newData.length > 0) {
                    setCurrentSelected(newData[0])
                }
                setUserList(newData)
            })
            .finally(() =>
                setTimeout(() => {
                    setListLoading(false)
                }, 200)
            )
    })

    const onSearch = useMemoizedFn((value: string) => {
        getUserList(value)
    })

    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
    })

    const onSelected = useMemoizedFn((row: API.UserList) => {
        setCurrentSelected(row)
        const mentionId = getMentionId()
        action(callCommand(mentionCommand.key, {userName: row.name, userId: row.id, mentionId}))
        // 关闭窗口
        view.focus()
        slashProvider.current?.hide()
        setKeyWord("")
        setUserList([])
        setCurrentSelected(undefined)
        // 发送通知
        if (isSendMessage) {
            const params: API.NotepadEitRequest = {
                eitUser: row.id,
                notepadHash,
                mentionId
            }
            apiNotepadEit(params)
        }
    })

    const onSure = useMemoizedFn(() => {
        if (!currentSelected) {
            yakitNotify("info", "请选择用户")
            return
        }
        onSelected(currentSelected)
    })

    return (
        <div
            aria-expanded='false'
            data-show='false'
            className={styles["mention"]}
            style={{width: mentionWidth}}
            ref={ref}
        >
            <YakitInput.Search
                ref={searchRef}
                value={keyWord}
                onChange={(e) => setKeyWord(e.target.value)}
                onSearch={onSearch}
                onPressEnter={onPressEnter}
                wrapperStyle={{marginTop: 12}}
            />
            <div className={styles["mention-user-list"]}>
                <RollingLoadList<API.UserList>
                    data={userList}
                    loadMoreData={() => {}}
                    renderRow={(row: API.UserList, i: number) => (
                        <div
                            className={classNames(styles["mention-user-item"], {
                                [styles["mention-user-item-selected"]]: currentSelected?.id === row.id
                            })}
                            onClick={() => onSelected(row)}
                        >
                            {row.name}({row.department})
                        </div>
                    )}
                    classNameRow={styles["mention-user-row"]}
                    page={1}
                    hasMore={false}
                    loading={listLoading}
                    defItemHeight={32}
                />
            </div>
            <div className={styles["mention-footer"]}>
                <div className={styles["checkbox"]}>
                    <YakitCheckbox checked={isSendMessage} onChange={(e) => setIsSendMessage(e.target.checked)} />
                    同时发送通知
                </div>
                <YakitButton type='primary' onClick={onSure}>
                    确定
                </YakitButton>
            </div>
        </div>
    )
}
