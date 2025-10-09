import React, {useState} from "react"
import {NotepadActionProps, NotepadManageProps} from "./NotepadManageType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineClouddownloadIcon, OutlinePencilaltIcon, OutlineShareIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {Divider} from "antd"
import {API} from "@/services/swagger/resposeType"
import {useMemoizedFn} from "ahooks"
import {apiDeleteNotepadDetail, apiGetNotepadDetail, onBaseNotepadDown} from "./utils"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {isCommunityEdition} from "@/utils/envfile"
import {OnlineJudgment} from "@/pages/plugins/onlineJudgment/OnlineJudgment"
import {useGoEditNotepad} from "../hook/useGoEditNotepad"

const NotepadShareModal = React.lazy(() => import("../NotepadShareModal/NotepadShareModal"))
const NotepadManageOnline = React.lazy(() => import("./notepadManageOnline/NotepadManageOnline"))
const NotepadManageLocal = React.lazy(() => import("./notepadManageLocal/NotepadManageLocal"))

export const timeMap = {
    created_at: "最近创建时间",
    updated_at: "最近更新时间"
}

/**
 * @description 企业版是线上http;社区版是本地grpc
 */
const NotepadManage: React.FC<NotepadManageProps> = React.memo((props) => {
    return isCommunityEdition() ? (
        <NotepadManageLocal />
    ) : (
        <OnlineJudgment isJudgingLogin={true}>
            <NotepadManageOnline />
        </OnlineJudgment>
    )
})
export default NotepadManage

export const NotepadAction: React.FC<NotepadActionProps> = React.memo((props) => {
    const {record, userInfo, onSingleDownAfter, onShareAfter, onSingleRemoveAfter} = props

    const {goEditNotepad} = useGoEditNotepad()

    const [removeItemLoading, setRemoveItemLoading] = useState<boolean>(false)
    const [downItemLoading, setDownItemLoading] = useState<boolean>(false)
    const [editLoading, setEditLoading] = useState<boolean>(false)

    const onSingleDown = useMemoizedFn((record: API.GetNotepadList) => {
        setDownItemLoading(true)
        const downParams: API.NotepadDownloadRequest = {
            hash: record.hash
        }
        onBaseNotepadDown(downParams)
            .then((res) => {
                onSingleDownAfter(res)
            })
            .finally(() =>
                setTimeout(() => {
                    setDownItemLoading(false)
                }, 200)
            )
    })

    const onShare = useMemoizedFn((record: API.GetNotepadList) => {
        const m = showYakitModal({
            hiddenHeader: true,
            content: (
                <NotepadShareModal
                    notepadInfo={record}
                    onClose={() => {
                        m.destroy()
                        onShareAfter()
                    }}
                />
            ),
            onCancel: () => {
                m.destroy()
                onShareAfter()
            },
            footer: null
        })
    })
    const onSingleRemove = useMemoizedFn((record: API.GetNotepadList) => {
        setRemoveItemLoading(true)
        apiDeleteNotepadDetail({hash: record.hash})
            .then(() => {
                onSingleRemoveAfter()
            })
            .finally(() => {
                setTimeout(() => {
                    setRemoveItemLoading(false)
                }, 200)
            })
    })
    const onEdit = useMemoizedFn(() => {
        setEditLoading(true)
        apiGetNotepadDetail(record.hash)
            .then((res) => {
                goEditNotepad({notepadHash: res.hash, title: res.title})
            })
            .finally(() => {
                setTimeout(() => {
                    setEditLoading(false)
                }, 200)
            })
    })
    return (
        <div>
            <YakitButton
                type='text2'
                icon={<OutlinePencilaltIcon />}
                onClick={onEdit}
                loading={editLoading}
                disabled={removeItemLoading}
            />
            <Divider type='vertical' style={{margin: "0 8px"}} />
            <YakitButton
                type='text2'
                icon={<OutlineClouddownloadIcon />}
                onClick={() => onSingleDown(record)}
                loading={downItemLoading}
                disabled={removeItemLoading}
            />
            {record.notepadUserId === userInfo.user_id ? (
                <>
                    <Divider type='vertical' style={{margin: "0 8px"}} />
                    <YakitButton
                        type='text2'
                        icon={<OutlineShareIcon />}
                        onClick={() => onShare(record)}
                        disabled={removeItemLoading}
                    />
                    <Divider type='vertical' style={{margin: "0 8px"}} />
                    <YakitPopconfirm title='确定要删掉该文档吗' onConfirm={() => onSingleRemove(record)}>
                        <YakitButton danger type='text' icon={<OutlineTrashIcon />} loading={removeItemLoading} />
                    </YakitPopconfirm>
                </>
            ) : null}
        </div>
    )
})
