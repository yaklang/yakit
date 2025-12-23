import React from "react"
import {FreeDialogForgeListProps} from "./type"
import {useCreation, useMemoizedFn} from "ahooks"
import {AITagList} from "../FreeDialogFileList/FreeDialogFileList"
import {AITagListProps} from "../FreeDialogFileList/type"

export const FreeDialogTagList: React.FC<FreeDialogForgeListProps> = React.memo((props) => {
    const {title, select, setSelect, type} = props
    const list: AITagListProps["list"] = useCreation(() => {
        return select.map((item) => ({
            type,
            key: item.id,
            value: item.name
        }))
    }, [select, type])
    const onClear = useMemoizedFn(() => {
        setSelect([])
    })
    const onRemove = useMemoizedFn((item) => {
        const newList = select.filter((ele) => ele.id !== item.key)
        setSelect(newList)
    })
    return <AITagList title={title} list={list} onRemove={onRemove} onClear={onClear} />
})
