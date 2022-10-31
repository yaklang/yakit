import React, {ReactNode, useEffect, useLayoutEffect, useRef, useState} from "react"
import {Select, Button, Tag, TagProps, SelectProps, Tooltip, Space, Checkbox} from "antd"
import {useGetState, useDebounce, useThrottle} from "ahooks"
import {useHotkeys} from "react-hotkeys-hook"
import {} from "@ant-design/icons"

import "./BaseTags.scss"
export interface TagsListProps extends TagProps {
    data: string[]
    ellipsis?: boolean
    tagClassName?: string
}

// Tags展示组件
export const TagsList: React.FC<TagsListProps> = React.memo((props) => {
    const {data, ellipsis, tagClassName = "", ...otherProps} = props
    const tagListRef = useRef<any>(null)
    // 展示数据源
    const [dataSource, setDataSource] = useState<string[]>([])
    // 省略后隐藏项
    const [ellipsisTags, setEllipsisTags, getEllipsisTags] = useGetState<string[]>([])
    useEffect(() => {
        // 省略模式 动态计算
        if (ellipsis) {
            const {current} = tagListRef
            const boxWidth = current.offsetWidth
            let countWidth = 0 //计算当前宽度
            const lastItem = current.children.length - 1 // 最后一项Index
            const itemMargin = 8 //每一项的magin
            // ps: for循环不计入最后...扩展项
            let showTagsArr: string[] = []
            let ellipsisTagsArr: string[] = []
            for (let i = 0; i <= lastItem; i++) {
                // 当前项完整宽度(包含margin)
                let nowItemWidth = current.children[i].offsetWidth + itemMargin
                // 最后一项完整宽度
                let lastItemWidth = current.children[lastItem].offsetWidth + itemMargin
                // 计算当前项后宽度
                let nowWidth = countWidth + nowItemWidth + lastItemWidth
                if (nowWidth < boxWidth) {
                    countWidth += nowItemWidth
                    showTagsArr = [...showTagsArr, data[i]]
                } else {
                    ellipsisTagsArr = [...ellipsisTagsArr, data[i]]
                }
            }
            setDataSource(showTagsArr)
            setEllipsisTags(ellipsisTagsArr)
        } else {
            setDataSource(data)
        }
    }, [data])
    const tooltipStr = ellipsis && ellipsisTags.join("，")
    // console.log("ggg", dataSource, ellipsisTags)
    return (
        <div className='base-tags-list'>
            {/* 隐藏DOM元素 用于实时计算 */}
            <div style={{overflow: "hidden", height: 0}} ref={tagListRef}>
                {data.map((item) => (
                    <Tag className={`base-tags-list-tag ${tagClassName}`} key={item} {...otherProps}>
                        {item}
                    </Tag>
                ))}
            </div>
            {dataSource.map((item) => (
                <Tag className={`base-tags-list-tag ${tagClassName}`} key={item} {...otherProps}>
                    {item}
                </Tag>
            ))}
            {ellipsis && ellipsisTags.length > 0 && (
                <Tooltip title={tooltipStr}>
                    <Tag className={`base-tags-list-tag ${tagClassName}`} {...otherProps}>
                        ...
                    </Tag>
                </Tooltip>
            )}
        </div>
    )
})
interface HighPowerListProps {
    dataSource: DataObjProps[]
    checkedList: string[]
    cacheScrollTop: number
    handleCheckChange: (e: any, v: any) => void
    virtualListHeight?: number
}

// 虚拟列表
export const HighPowerList: React.FC<HighPowerListProps> = (props) => {
    const {dataSource, checkedList, handleCheckChange, virtualListHeight = 200, cacheScrollTop} = props
    /*
     * 每项数据的dom元素高度为30px
     * 实际项目可能每项高度不一样
     * */
    const itemH = 30
    // 计算总高度
    const totalH = dataSource.length * itemH + "px"
    const [data, setData] = useState<DataObjProps[]>([]) // 可视区域数据
    const [totalHeight, setTotalHeight] = useState(totalH) // 长列表总高度 列表中每一项数据高度总和
    const [transform, setTransform] = useState("")
    const cacheScroll = useRef<number>(0)
    const listRef = useRef<any>(null)
    useEffect(() => {
        updateViewContent(cacheScrollTop)
    }, [])

    const handleScroll = (e) => {
        /*
         * 获取scrollTop
         * 此属性可以获取或者设置对象的最顶部到对象在当前窗口显示的范围内的顶边的距离
         * 也就是元素滚动条被向下拉动的距离
         * */
        updateViewContent(e.target.scrollTop)
    }

    const updateViewContent = (scrollTop = 0) => {
        cacheScroll.current = scrollTop
        // 计算可视区域里能放几个元素
        const viewCount = Math.ceil(virtualListHeight / itemH)
        // 计算可视区域开始的索引
        const start = Math.floor(scrollTop / itemH)
        // 计算可视区域结束索引
        const end = start + viewCount
        // 截取可视区域数据
        const viewData = dataSource.slice(start, end)
        // 控制滚动条滑动位置
        listRef.current.scrollTop = scrollTop
        setData(viewData)
        setTransform(`translate3d(0, ${start * itemH}px, 0)`)
    }

    return (
        <div className='virtual-list' style={{height: virtualListHeight}} onScroll={handleScroll} ref={listRef}>
            <div className='virtual-list-height' style={{height: totalHeight}} />
            <div className='view-content' style={{transform: transform}}>
                {data.map((item, idx) => (
                    <Checkbox
                        className={`default-check-box ${checkedList.includes(item.value) && "default-row-check-box"}`}
                        value={item.value}
                        key={`${idx}_${item.value}`}
                        onChange={(e) => handleCheckChange(e, cacheScroll.current)}
                        checked={checkedList.includes(item.value)}
                    >
                        {item.label}
                    </Checkbox>
                ))}
            </div>
        </div>
    )
}

// Tags下拉框组件
interface DataObjProps {
    label: string
    value: string
}
export interface TagsFilterProps extends SelectProps {
    data: string[] | DataObjProps[]
    defaultData?: string[]
    isShowAllCheck?: boolean
    submitValue: (v: string[]) => void
}
const {Option} = Select

export const TagsFilter: React.FC<TagsFilterProps> = (props) => {
    const {data, isShowAllCheck = false, defaultData = [], submitValue, ...otherProps} = props
    const dataSource: DataObjProps[] = data.map((item) => {
        if (typeof item === "string") {
            return {label: item, value: item}
        }
        return item
    })
    const [checkedList, setCheckedList, getCheckList] = useGetState<string[]>(defaultData)
    const [indeterminate, setIndeterminate] = useState<boolean>(true)
    const [checkAll, setCheckAll] = useState<boolean>(false)
    // 当前选中项
    const [checkItem, setCheckItem, getCheckItem] = useGetState<string>("")
    // 受控模式控制浮层
    const [open, setOpen] = useState(false)
    // 缓存滚轮定位
    const [cacheScrollTop, setCacheScrollTop] = useState(0)
    useEffect(() => {
        if (!open) {
            setCacheScrollTop(0)
        }
    }, [open])
    // 键盘移动
    const goAnchor = (e) => {
        const nowCheckList = getCheckList()
        const nowCheckItem = getCheckItem()
        const {code} = e
        const isLeft = code === "ArrowLeft"
        const isRight = code === "ArrowRight"
        // 业务代码
        let index = nowCheckList.indexOf(nowCheckItem)
        let newIndex
        if (isLeft) {
            newIndex = index - 1 < 0 ? 0 : index - 1
        }
        if (isRight) {
            newIndex = index + 1 === nowCheckList.length ? nowCheckList.length - 1 : index + 1
        }
        // js锚点跳转
        let element = document.getElementById(nowCheckList[newIndex])
        setCheckItem(nowCheckList[newIndex])
        if (element) {
            element.scrollIntoView({behavior: "smooth"})
        }
    }

    // ps：在Select控件中失效
    // useHotkeys("right",()=>{
    //     console.log("right")
    // })
    // useHotkeys("left",()=>{
    //     console.log("left")
    // })

    useEffect(() => {
        document.addEventListener("keydown", (e) => goAnchor(e))
        return () => {
            document.removeEventListener("keydown", goAnchor)
        }
    }, [])

    const handleChange = (value: string[]) => {
        // console.log(`selected ${value}`)
        setCheckItem("")
        setCheckedList([])
        setCheckAll(false)
        setIndeterminate(false)
    }
    // 保留数组中非重复数据
    const filterNonUnique = (arr) => arr.filter((i) => arr.indexOf(i) === arr.lastIndexOf(i))
    const handleCheckChange = (e, value) => {
        let list = [...getCheckList(), e.target.value]
        // 定位选中项
        if (e.target.checked) {
            setCheckItem(e.target.value)
        }
        // 取消选中则去除重复项
        if (!e.target.checked) {
            if (e.target.value === checkItem) {
                setCheckItem("")
            }
            list = filterNonUnique(list)
        }
        setCacheScrollTop(value)
        setCheckedList(list)
        setIndeterminate(!!list.length && list.length < dataSource.length)
        setCheckAll(list.length === dataSource.length)
    }

    const handleCheckAllChange = (e) => {
        const checkAllData: string[] = dataSource.map((item) => item.value)
        setCheckedList(e.target.checked ? checkAllData : [])
        setIndeterminate(false)
        setCheckAll(e.target.checked)
    }

    const CheckboxOptions = () => {
        return (
            <div className='base-tags-filter-check-box'>
                {isShowAllCheck && (
                    <Checkbox
                        className={`default-check-box ${checkAll && "default-row-check-box"}`}
                        indeterminate={indeterminate}
                        onChange={handleCheckAllChange}
                        checked={checkAll}
                    >
                        全选
                    </Checkbox>
                )}
                <HighPowerList
                    dataSource={dataSource}
                    checkedList={checkedList}
                    cacheScrollTop={cacheScrollTop}
                    handleCheckChange={handleCheckChange}
                />
            </div>
        )
    }

    const tagRender = (p) => {
        const {label, value, closable} = p
        const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
            // console.log("onPreventMouseDown", event)
            event.preventDefault()
            event.stopPropagation()
            setCheckItem(value)
            // js锚点跳转
            let element = document.getElementById(value)
            if (element) {
                element.scrollIntoView({behavior: "smooth"})
            }
        }
        const onClose = () => {
            // console.log("checkItem",checkItem,value)
            let newArr = checkedList.filter((item) => item !== value)
            // 删除选中项
            if (checkItem === value) {
                setCheckItem("")
            }
            if (newArr.length) {
                setIndeterminate(true)
            } else {
                setIndeterminate(false)
            }
            setCheckedList(newArr)
            setCheckAll(false)
        }
        return (
            <Tag
                id={value}
                color={checkItem === value ? "processing" : undefined}
                onMouseDown={onPreventMouseDown}
                closable={closable}
                onClose={onClose}
                style={{marginRight: 3}}
            >
                {label}
            </Tag>
        )
    }

    const resetBtn = () => {
        setCheckedList(defaultData)
        setIndeterminate(!!defaultData.length && defaultData.length < dataSource.length)
        setCheckAll(defaultData.length === dataSource.length)
    }

    const submitBtn = () => {
        submitValue(checkedList)
        setOpen(false)
    }
    return (
        <div className='base-tags-filter'>
            <Select
                {...otherProps}
                allowClear={true}
                mode='multiple'
                showSearch={false}
                onChange={handleChange}
                value={checkedList}
                tagRender={tagRender}
                open={open}
                onDropdownVisibleChange={(visible) => setOpen(visible)}
                dropdownRender={(menu) => {
                    return (
                        <>
                            <CheckboxOptions />
                            <div className='base-tags-filter-select'>
                                <Button onClick={resetBtn} type='text' className='base-tags-filter-select-reset'>
                                    重置
                                </Button>
                                <Button onClick={submitBtn} type='text' className='base-tags-filter-select-submit'>
                                    确定
                                </Button>
                            </div>
                        </>
                    )
                }}
                dropdownStyle={{padding: 0, borderRadius: 6}}
            >
                {dataSource.map((item) => (
                    <Option key={item.value}>{item.label}</Option>
                ))}
            </Select>
        </div>
    )
}

// UI组件测试用例
export const Test: React.FC = () => {
    const [tagList, setTagList] = useState<string[]>([])
    const data = ["Apple", "Pear", "Orange"]
    let newData: string[] = []
    for (let i = 0; i < 10; i++) {
        data.map((item) => {
            newData.push(`${item}${i}`)
        })
    }
    return (
        <div>
            <TagsFilter
                data={newData}
                // data={[
                //     {
                //         label:"ppp",
                //         value:"999"
                //     },
                //     {
                //         label:"ppx",
                //         value:"888"
                //     },
                // ]}
                defaultData={tagList}
                submitValue={(value) => {
                    setTagList(value)
                }}
                // isShowAllCheck={true}
                style={{width: "200px"}}
            />
            <div style={{width: "20%"}}>
                <TagsList data={tagList} ellipsis={true} tagClassName='gg' />
            </div>
        </div>
    )
}
