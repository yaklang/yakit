import React, {useRef, useImperativeHandle, useState} from "react"
import {DiffMilkdownProps, MilkdownDiffEditorProps} from "./NotepadDiffType"
import {Milkdown, MilkdownProvider} from "@milkdown/react"
import {ProsemirrorAdapterProvider} from "@prosemirror-adapter/react"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import moment from "moment"
import {useMemoizedFn} from "ahooks"
import useInitEditorHooks from "@/components/MilkdownEditor/utils/initEditor"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {DiffMilkdownManager} from "./DiffManager"
import {editorViewCtx} from "@milkdown/kit/core"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {getMarkdown} from "@milkdown/kit/utils"
import {collabServiceCtx} from "@milkdown/plugin-collab"
import {useStore} from "@/store"
import {randomMilkdownUserColor} from "@/components/MilkdownEditor/MilkdownEditor"

const DiffMilkdown: React.FC<DiffMilkdownProps> = React.memo(
    React.forwardRef((props, ref) => {
        const userInfo = useStore((s) => s.userInfo)

        const {get, loading} = useInitEditorHooks({
            ...props,
            diffProps: {
                onDiff: (ctx) => onDiff(ctx)
            }
        })
        const diffManagerRef = useRef<DiffMilkdownManager>()

        useImperativeHandle(
            ref,
            () => ({
                onVersionComparison: (version, prevVersion) => {
                    // debugger
                    const editorview = get()?.ctx.get(editorViewCtx)
                    diffManagerRef.current?.init(editorview, version, prevVersion)
                    // const editorview = get()?.ctx.get(editorViewCtx)
                    // diffManagerRef.current?.versionComparison(editorview, version, prevVersion)
                }
            }),
            [diffManagerRef]
        )

        const onDiff = useMemoizedFn((ctx) => {
            const collabService = ctx.get(collabServiceCtx)
            const user = {
                userId: userInfo.user_id || 0,
                name: userInfo.companyName || "",
                color: `${randomMilkdownUserColor()}`,
                heardImg: userInfo.companyHeadImg || ""
            }
            // console.log("onDiff-user", user, collabService)
            diffManagerRef.current = new DiffMilkdownManager(collabService, user)
        })

        const renderVersions = useMemoizedFn(() => {
            const list = diffManagerRef.current?.getVersions()
            const editorview = get()?.ctx.get(editorViewCtx)
            if (!editorview) return
            // console.log("list", list)
            const m = showYakitModal({
                title: "历史版本",
                content: (
                    <div>
                        {list?.map((version: any, index) => {
                            return (
                                <div
                                    key={index}
                                    onClick={() => {
                                        const prevSnapshot = index > 0 ? (list.get(index - 1) as any) : null
                                        // console.log("editorview", editorview)
                                        diffManagerRef.current?.renderVersion(editorview, version, prevSnapshot)
                                    }}
                                >
                                    {moment(version.date).format("YYYY-MM-DD HH:mm:ss")}-{version.userName}
                                </div>
                            )
                        })}
                    </div>
                )
            })
        })
        const [checked, setChecked] = useState<boolean>(false)
        const diff = useMemoizedFn((e) => {
            const check = e.target.checked
            setChecked(check)
            const editorview = get()?.ctx.get(editorViewCtx)
            if (!editorview) return
            diffManagerRef.current?.liveTracking(editorview, check)
        })
        const onSaveVersions = useMemoizedFn(() => {
            diffManagerRef.current?.addVersion(get()?.action(getMarkdown()))
        })
        const unrenderVersion = useMemoizedFn(() => {
            const editorview = get()?.ctx.get(editorViewCtx)
            if (!editorview) return
            diffManagerRef.current?.unrenderVersion(editorview)
        })
        const setVersions = useMemoizedFn(() => {
            diffManagerRef.current?.setVersions()
        })
        const setSession = useMemoizedFn(() => {
            diffManagerRef.current?.setSession()
        })
        // const onDiff = useMemoizedFn(() => {
        //     diffManagerRef.current?.onDiff()
        // })
        return (
            <div>
                <div>
                    <YakitButton onClick={renderVersions}>历史</YakitButton>
                    <YakitButton onClick={onSaveVersions}>保存历史</YakitButton>
                    <YakitButton onClick={unrenderVersion}>恢复</YakitButton>
                    <YakitButton onClick={setVersions}>get versions</YakitButton>
                    <YakitButton onClick={setSession}>set Session</YakitButton>
                    {/* <YakitButton onClick={onDiff}>diff历史</YakitButton> */}

                    <YakitCheckbox checked={checked} onChange={diff}>
                        对比
                    </YakitCheckbox>
                </div>
                <Milkdown />
            </div>
        )
    })
)
export const MilkdownDiffEditor: React.FC<MilkdownDiffEditorProps> = React.memo(
    React.forwardRef((props, ref) => {
        return (
            <MilkdownProvider>
                <ProsemirrorAdapterProvider>
                    <DiffMilkdown {...props} ref={ref} />
                </ProsemirrorAdapterProvider>
            </MilkdownProvider>
        )
    })
)
