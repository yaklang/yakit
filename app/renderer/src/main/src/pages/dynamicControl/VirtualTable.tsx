import React, {ReactNode, useEffect, useRef, useState, useMemo} from "react"
import styles from "./VirtualTable.module.scss"
import classNames from "classnames"
import {useVirtualList, useThrottleFn} from "ahooks"
import ReactResizeDetector from "react-resize-detector"
import {LoadingOutlined} from "@ant-design/icons"
import {Spin, Popover} from "antd"
import {FilterIcon} from "@/assets/newIcon"
import { YakitPopover } from "@/components/yakitUI/YakitPopover/YakitPopover"

interface VirtualTableTitleProps {
    columns: VirtualColumns[]
}

const VirtualTableTitle: React.FC<VirtualTableTitleProps> = (props) => {
    const {columns} = props
    return (
        <div className={styles["virtual-table-title"]}>
            {columns.map((item,index) => {
                return (
                    <div
                        key={`${item.title}-${index}`}
                        style={item?.width ? {width: item.width} : {}}
                        className={classNames({
                            [styles["virtual-table-title-flex"]]: !!!item.width,
                            [styles["virtual-table-title-item"]]: !!!item?.filterProps,
                            [styles["virtual-table-title-filter"]]: !!item?.filterProps
                        })}
                    >
                        <div
                            className={classNames({
                                [styles["virtual-table-title-item"]]: !!item?.filterProps
                            })}
                        >
                            {item.title}
                        </div>
                        {item?.filterProps && (
                            <YakitPopover
                                placement={item?.filterProps.popoverDirection?item?.filterProps.popoverDirection:'bottom'}
                                trigger={'click'}
                                content={item?.filterProps.filterRender}
                                overlayClassName={(styles["ui-op-setting-dropdown"])}
                                // visible={opensPopover[filterKey]}
                            >
                                <div
                                    onClick={() => {}}
                                    className={classNames(styles["virtual-table-title-filter-icon"])}
                                >
                                    <FilterIcon />
                                </div>
                            </YakitPopover>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

interface VirtualTableContentProps {
    columns: VirtualColumns[]
    dataSource: any[]
    loading?: boolean
    hasMore?: boolean
    page: number
    defItemHeight: number
    defOverscan?: number
    loadMoreData?:()=>void
}

const VirtualTableContent: React.FC<VirtualTableContentProps> = (props) => {
    const {columns, dataSource, loading, hasMore, page, defItemHeight, defOverscan,loadMoreData} = props
    const containerRef = useRef(null)
    const wrapperRef = useRef(null)

    const [vlistWidth, setVListWidth] = useState(260)
    const [vlistHeigth, setVListHeight] = useState(600)

    const [list] = useVirtualList(dataSource, {
        containerTarget: containerRef,
        wrapperTarget: wrapperRef,
        itemHeight: defItemHeight,
        overscan: defOverscan || 5
    })

    const onScrollCapture = useThrottleFn(
        () => {
            if (wrapperRef && containerRef && !loading && hasMore) {
                const dom = containerRef.current || {
                    scrollTop: 0,
                    clientHeight: 0,
                    scrollHeight: 0
                }
                const contentScrollTop = dom.scrollTop //滚动条距离顶部
                const clientHeight = dom.clientHeight //可视区域
                const scrollHeight = dom.scrollHeight //滚动条内容的总高度
                const scrollBottom = scrollHeight - contentScrollTop - clientHeight
                if (scrollBottom <= 500) {
                    // console.log("获取数据的方法")
                    loadMoreData&&loadMoreData() // 获取数据的方法
                }
            }
        },
        {wait: 200, leading: false}
    )

        
    return (
        <div className={styles["virtual-table-content"]}>
            <ReactResizeDetector
                onResize={(width, height) => {
                    if (!width || !height) {
                        return
                    }
                    setVListWidth(width - 90)
                    setVListHeight(height)
                }}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <div
                ref={containerRef}
                style={{height: vlistHeigth, overflow: "overlay"}}
                onScroll={() => onScrollCapture.run()}
            >
                <div ref={wrapperRef}>
                    {list.map((ele) => (
                        <div className={styles["virtual-table-content-list"]} key={ele.index}>
                            {columns.map((item) => {
                                return (
                                    <div
                                        key={`${ele.index}-${item.title}`}
                                        style={item?.width ? {width: item.width} : {}}
                                        className={classNames(styles["virtual-table-content-item"], {
                                            [styles["virtual-table-content-flex"]]: !!!item.width
                                        })}
                                    >
                                        {item?.render ? 
                                        item.dataIndex?item.render(ele.data[item.dataIndex] ,ele.data) :item.render(ele.data,dataSource)
                                        : "-"}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                    {loading && hasMore && (
                        <div className='grid-block text-center'>
                            <LoadingOutlined />
                        </div>
                    )}
                    {!loading && !hasMore && (page || 0) > 0 && (
                        <div className='grid-block text-center no-more-text'>暂无更多数据</div>
                    )}
                </div>
            </div>
        </div>
    )
}

interface TableTitleFilter {
    filterRender?: () => ReactNode
    popoverDirection?: "left"|"right"|"top"|"bottom"
}

export interface VirtualColumns {
    title: ReactNode
    dataIndex?: string
    render?: (item?: any, all?: any) => ReactNode
    width?: number
    filterProps?: TableTitleFilter
}

interface VirtualTableProps {
    loading?: boolean
    className?: string
    columns: VirtualColumns[]
    dataSource: any[]
    loadMoreData?: ()=>void
    hasMore?:boolean
}

export const VirtualTable: React.FC<VirtualTableProps> = (props) => {
    const {loading, className, columns, dataSource,loadMoreData,hasMore} = props
    return (
        <div className={classNames(styles["virtual-table"], className)}>
            <VirtualTableTitle columns={columns} />
            <VirtualTableContent
                page={1}
                columns={columns}
                dataSource={dataSource}
                loading={loading}
                hasMore={hasMore}
                defItemHeight={44}
                loadMoreData={loadMoreData}
            />
        </div>
    )
}
