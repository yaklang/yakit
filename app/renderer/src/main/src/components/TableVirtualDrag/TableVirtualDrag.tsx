import React, {useRef} from "react"
import {TableVirtualDragProps} from "./TableVirtualDragType"
import styleResize from "../TableVirtualResize/TableVirtualResize.module.scss"
import style from "./TableVirtualDrag.module.scss"
import classNames from "classnames"
import {Divider} from "antd"
import {useVirtualList} from "ahooks"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"

const TableVirtualDragFunction = <T extends any>(props: TableVirtualDragProps<T>) => {
    const {renderTitle, data, title, pagination, rowSelection, extra, titleHeight} = props
    const containerRef = useRef<any>(null)
    const wrapperRef = useRef<any>(null)
    const [list, scrollTo] = useVirtualList(data, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: 28,
        overscan: 10
    })
    return (
        <div className={classNames(styleResize["virtual-table"])}>
            {renderTitle ? (
                renderTitle
            ) : (
                <div className={classNames(styleResize["virtual-table-heard"])}>
                    <div className={classNames(style["virtual-table-heard-left"])}>
                        {title && typeof title === "string" && (
                            <div className={classNames(style["virtual-table-heard-title"])}>{title}</div>
                        )}
                        {title && React.isValidElement(title) && title}
                        {props.isShowTotal && pagination?.total && (
                            <div className={style["virtual-table-heard-right"]}>
                                <div className={style["virtual-table-heard-right-item"]}>
                                    <span className={style["virtual-table-heard-right-text"]}>Total</span>
                                    <span className={style["virtual-table-heard-right-number"]}>
                                        {pagination?.total}
                                    </span>
                                </div>
                                <Divider type='vertical' />
                                <div className={style["virtual-table-heard-right-item"]}>
                                    <span className={style["virtual-table-heard-right-text"]}>Selected</span>
                                    <span className={style["virtual-table-heard-right-number"]}>
                                        {rowSelection?.selectedRowKeys?.length}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    {extra && React.isValidElement(extra) && (
                        <div className={classNames(style["virtual-table-heard-right"])}>{extra}</div>
                    )}
                </div>
            )}
            <div
                className={classNames(style["virtual-table-drag-body"])}
                style={{
                    height:
                        ((renderTitle || title || extra) && `calc(100% - ${titleHeight ? titleHeight : 42}px)`) ||
                        "100%"
                }}
            >
                <table ref={containerRef} className={classNames(style["virtual-table-drag"])}>
                    {/* <colgroup>
                    <col span={2} style={{backgroundColor: "red", width: 20}} />
                    <col style={{backgroundColor: "yellow"}} />
                </colgroup> */}
                    <tr className={style["virtual-table-drag-title"]}>
                        <th style={{width: 200}}>
                            <YakitCheckbox
                            // onChange={(e) => {
                            //     onChangeCheckbox(e.target.checked)
                            // }}
                            // checked={isAll}
                            />
                            Month
                        </th>
                        <th>Savings</th>
                        <th>Savings</th>
                    </tr>
                    <tbody ref={wrapperRef} className={classNames(style["virtual-table-drag-tbody"])}>
                        {list.map((ele) => {
                            return (
                                <tr className={classNames(style["virtual-table-drag-tbody-row"])}>
                                    <td>{ele.data["Index"]}</td>
                                    <td>$100</td>
                                    <td>$100</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

/**
 * @description: 简版
 */
export const TableVirtualDrag = React.forwardRef(TableVirtualDragFunction) as <T>(
    props: TableVirtualDragProps<T> & {ref?: React.ForwardedRef<HTMLUListElement>}
) => ReturnType<typeof TableVirtualDragFunction>
