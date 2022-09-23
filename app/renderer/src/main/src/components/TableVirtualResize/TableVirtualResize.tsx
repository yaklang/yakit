import React, {ReactNode, useMemo, useRef} from "react"
import {useVirtualList} from "ahooks"
import classNames from "classnames"
import {TableVirtualResizeProps} from "./TableVirtualResizeType"
import style from "./TableVirtualResize.module.scss"
import {Button} from "antd"

export const TableVirtualResize = <T extends any>(props: TableVirtualResizeProps<T>) => {
    const {data, renderRow, columns} = props
    const containerRef = useRef(null)
    const wrapperRef = useRef(null)

    // const originalList = useMemo(() => Array.from(Array(99999).keys()), [])

    const [list] = useVirtualList(data, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: (index: number, data: T) => {
            return 28
        },
        overscan: 5
    })
    console.log("data", data)
    console.log("list", list)
    console.log("columns", columns)

    return (
        <>
            <div ref={containerRef} id='containerRef' style={{height: "100%", overflowY: "auto"}}>
                <div ref={wrapperRef} id='wrapperRef' className={classNames(style["virtual-table"])}>
                    {columns.map((columnsItem) => (
                        <div key={columnsItem.dataKey} className={classNames(style["virtual-table-col"])}>
                            <div className={classNames(style["virtual-table-title"])}>{columnsItem.title}</div>
                            <div className={classNames(style["virtual-table-row-list"])}>
                                {data.map((ele) => (
                                    <div
                                        className={classNames(style["virtual-table-row"], {
                                            [style["virtual-table-row-ellipsis"]]: true // columnsItem.ellipsis
                                        })}
                                    >
                                        {ele[columnsItem.dataKey] || "-"}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
