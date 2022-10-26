import React, {ReactNode, useEffect, useLayoutEffect, useRef, useState} from "react"
import {Select, Button, Tag, TagProps, SelectProps, Tooltip, Space, Checkbox} from "antd"
import {useGetState, useDebounce, useThrottle} from "ahooks"
import {useHotkeys} from "react-hotkeys-hook"
import {} from "@ant-design/icons"

import "./BaseTags.scss"
export interface TagsListProps {
    data: string[]
    ellipsis?: boolean
    tag?: TagProps
    tagClassName?: string
}

// Tags展示组件
export const TagsList: React.FC<TagsListProps> = React.memo((props) => {
    const {data, ellipsis, tag, tagClassName = ""} = props
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
                    <Tag className={`base-tags-list-tag ${tagClassName}`} key={item} {...tag}>
                        {item}
                    </Tag>
                ))}
            </div>
            {dataSource.map((item) => (
                <Tag className={`base-tags-list-tag ${tagClassName}`} key={item} {...tag}>
                    {item}
                </Tag>
            ))}
            {ellipsis && ellipsisTags.length > 0 && (
                <Tooltip title={tooltipStr}>
                    <Tag className={`base-tags-list-tag ${tagClassName}`} {...tag}>
                        ...
                    </Tag>
                </Tooltip>
            )}
        </div>
    )
})

// Tags下拉框组件
interface TagsFilterDataProps {
    key: string | number
    value: string
}
interface DataObjProps{
    label:string
    value:string
}
export interface TagsFilterProps {
    data: string[]|DataObjProps[]
    defaultData?: string[]
    isShowAllCheck?: boolean
    selectProps?: SelectProps
    submitValue: (v: string[]) => void
}
const {Option} = Select

export const TagsFilter: React.FC<TagsFilterProps> = (props) => {
    const {selectProps, data, isShowAllCheck = false, defaultData = [], submitValue} = props
    const dataSource:DataObjProps[] = data.map((item)=>{
        if(typeof item==="string"){
            return {label:item,value:item}
        }
        return item
    })
    const [checkedList, setCheckedList,getCheckList] = useGetState<string[]>(defaultData)
    const [indeterminate, setIndeterminate] = useState<boolean>(true)
    const [checkAll, setCheckAll] = useState<boolean>(false)
    // 当前选中项
    const [checkItem, setCheckItem,getCheckItem] = useGetState<string>("")
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
        document.addEventListener("keydown",(e)=>goAnchor(e) )
        return ()=>{
            document.removeEventListener("keydown",goAnchor)
        }
    }, [])

    const handleChange = (value: string[]) => {
        // console.log(`selected ${value}`)
        setCheckedList([])
        setCheckAll(false)
        setIndeterminate(false)
    }

    const handleCheckChange = (list) => {
        setCheckedList(list)
        setIndeterminate(!!list.length && list.length < dataSource.length)
        setCheckAll(list.length === dataSource.length)
    }

    const handleCheckAllChange = (e) => {
        const checkAllData:string[] = dataSource.map((item)=>item.value)
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
                <Checkbox.Group className='default-check-group-box' value={checkedList} onChange={handleCheckChange}>
                    {dataSource.map((item, idx) => (
                        <Checkbox
                            className={`default-check-box ${checkedList.includes(item.value) && "default-row-check-box"}`}
                            value={item.value}
                            key={`${idx}_${item.value}`}
                        >
                            {item.label}
                        </Checkbox>
                    ))}
                </Checkbox.Group>
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
            let newArr = checkedList.filter((item) => item !== value)
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
        handleCheckChange(defaultData)
    }

    const submitBtn = () => {
        submitValue(checkedList)
    }
    return (
        <div className='base-tags-filter'>
            <Select
                {...selectProps}
                allowClear={true}
                mode='multiple'
                showSearch={false}
                onChange={handleChange}
                value={checkedList}
                tagRender={tagRender}
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
            >
                {dataSource.map((item) => (
                    <Option key={item.value}>{item.label}</Option>
                ))}
            </Select>
        </div>
    )
}

// UI组件测试用例
export const HTTPHacker: React.FC = () => {
    const [tagList, setTagList] = useState<string[]>(["Orange"])
    return (
        <div>
            <TagsFilter
                data={["Apple", "Pear", "Orange", "Apple1", "Pear1", "Orange1"]}
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
                isShowAllCheck={true}
                selectProps={{style: {width: "200px"}}}
            />
            <div style={{width: 200}}>
                <TagsList data={tagList} ellipsis={true} tagClassName='gg' />
            </div>
        </div>
    )
}