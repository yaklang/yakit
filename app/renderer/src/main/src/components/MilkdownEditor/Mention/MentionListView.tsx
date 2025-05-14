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
import {mentionCommand} from "../utils/mentionPlugin"
export const mentionFactory = slashFactory("Commands")

interface MentionListViewProps {
    notepadHash: string
}
const mentionWidth = 240
const mentionTarget = "@"
export const MentionListView: React.FC<MentionListViewProps> = (props) => {
    const {notepadHash} = props
    const [isSendMessage, setIsSendMessage] = useState<boolean>(false)
    const [listLoading, setListLoading] = useState<boolean>(false)
    const [keyWord, setKeyWord] = useState<string>("")
    const [userList, setUserList] = useState<API.UserList[]>([])

    const [currentSelected, setCurrentSelected] = useState<API.UserList>()

    const ref = useRef<HTMLDivElement>(null)
    const slashProvider = useRef<SlashProvider>()

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
        },
        [loading, view, prevState],
        {wait: 200, leading: true}
    )

    const getUserList = useMemoizedFn((value) => {
        setListLoading(true)
        apiGetUserSearch({keywords: value})
            .then((res) => {
                setUserList([...(res.data || [])])
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
        action(callCommand(mentionCommand.key, row.name))
        // 关闭窗口
        view.focus()
        slashProvider.current?.hide()
        // 发送通知
        if (isSendMessage) {
            const params = {
                userId: row.id,
                notepadHash
            }
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
                        <div className={styles["mention-user-item"]} onClick={() => onSelected(row)}>
                            {row.name}
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
