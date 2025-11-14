import {OutlineArrowdownIcon, OutlineArrowupIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {Divider} from "antd"
import {memo, useEffect, useMemo, useRef, useState} from "react"
import style from "./HTTPFuzzerPageTable.module.scss"
import classNames from "classnames"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useInViewport, useUpdateEffect} from "ahooks"
import { FilterIcon } from "@/assets/newIcon"
import { HTTPFuzzerPageTableQuery } from "./HTTPFuzzerPageTable"

interface ExtractedFilterProps {
    onSearch: (data: Record<string, string | boolean>) => void
}

const ExtractedFilter: React.FC<ExtractedFilterProps> = memo((props) => {
    const ref = useRef<HTMLDivElement>(null)
    const {onSearch} = props
    const {t, i18n} = useI18nNamespaces(["history", "webFuzzer", "yakitUi"])
    const [show, setShow] = useState<boolean>(false)
    // 提取数据搜索
    const [extractedSearchVal, setExtractedSearchVal] = useState<string>("")
    const [extractedMatchType, setExtractedMatchType] = useState<"includes" | "notIncludes">("includes")
    const [extractedNotEmpty, setExtractedNotEmpty] = useState<boolean>(false)
    const handleSearch = () => {
        onSearch({
          ExtractedResults: extractedSearchVal,
          ExtractedResultsMatchType: extractedMatchType,
          ExtractedResultsNotEmpty: extractedNotEmpty
        })
    }
    const [inViewport] = useInViewport(ref)

    useUpdateEffect(() => {
        if (!inViewport) {
            setShow(false)
        }
    }, [inViewport])

    return (
        <div className={style["extracted-results-search"]} style={{padding: show ? undefined : "0 8px 8px"}} ref={ref}>
            {show ? (
                <div className={style["search-wrapper"]}>
                    <YakitSelect
                        value={extractedMatchType}
                        onChange={(val) => setExtractedMatchType(val as "includes" | "notIncludes")}
                        className={style["search-wrapper-select"]}
                        wrapperClassName={style["search-wrapper-select-wrapper"]}
                        size='middle'
                    >
                        <YakitSelect.Option value='includes'>{t("HTTPFuzzerPageTable.includes")}</YakitSelect.Option>
                        <YakitSelect.Option value='notIncludes'>
                            {t("HTTPFuzzerPageTable.notIncludes")}
                        </YakitSelect.Option>
                    </YakitSelect>
                    <YakitInput.Search
                        className={style["search-input"]}
                        size='middle'
                        value={extractedSearchVal}
                        placeholder={t("YakitInput.searchKeyWordPlaceholder")}
                        onChange={(e) => setExtractedSearchVal(e.target.value)}
                        onSearch={handleSearch}
                    />
                </div>
            ) : (
                <>
                    <div
                        className={classNames(style["body-length-filter"], {
                            [style["body-length-filter-active"]]: extractedSearchVal
                        })}
                        onClick={() => setShow(true)}
                    >
                      <OutlineSearchIcon className={style["outlineFilterIcon"]} />
                      {t("YakitInput.search")}
                    </div>
                    <Divider style={{margin: "4px 0"}} />
                    <div className={style["body-length-checkbox"]}>
                        <span className={style["tip"]}>{t("HTTPFuzzerPageTable.noEmpty")}</span>
                        <YakitCheckbox
                            checked={extractedNotEmpty}
                            onChange={(e) => {
                                const checked = e.target.checked
                                setExtractedNotEmpty(checked)
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    )
})

interface TableFilterAndSorterProps {
    sortStatus?: "asc" | "desc" | "none"
    handleSort: (status: "asc" | "desc" | "none") => void
    /**@name 范围筛选组件 */
    filterNode?: React.ReactNode
    filterType?: 'filter' | 'search',
    filterActive?: boolean
}

/**
 * @description 范围筛选 + 排序组合组件（用于 BodyLength 和 DurationMs）
 */
const TableFilterAndSorter: React.FC<TableFilterAndSorterProps> = memo((props) => {
    const ref = useRef<HTMLDivElement>(null)
    const {sortStatus = "none", handleSort, filterNode, filterType = 'filter', filterActive = false} = props
    const {t} = useI18nNamespaces(["history", "webFuzzer", "yakitUi"])
    const [inViewport] = useInViewport(ref)
    const [showRange, setShowRange] = useState<boolean>(false)

    useUpdateEffect(() => {
        if (!inViewport) {
            setShowRange(false)
        }
    }, [inViewport])

    const isSearch = useMemo(()=> filterType === 'search', [filterType])

    return (
        <div className={style["filter-box"]} ref={ref}>
            {showRange ? (
                /* 范围筛选输入区域 */
                <div className={style["range-input-number"]}>
                    {filterNode}
                </div>
            ) : (
                <>
                    {/* 排序按钮 */}
                    <div
                        className={classNames(style["filter-item"], {
                            [style["active-filter-item"]]: sortStatus === "asc",
                            [style["hover-filter-item"]]: sortStatus !== "asc"
                        })}
                        onClick={() => handleSort(sortStatus === "asc" ? "none" : "asc")}
                    >
                        <div className={style["icon"]}>
                            <OutlineArrowupIcon />
                        </div>
                        <div className={style["content"]}>{t("YakitTable.asc")}</div>
                    </div>
                    <div
                        className={classNames(style["filter-item"], {
                            [style["active-filter-item"]]: sortStatus === "desc",
                            [style["hover-filter-item"]]: sortStatus !== "desc"
                        })}
                        onClick={() => handleSort(sortStatus === "desc" ? "none" : "desc")}
                    >
                        <div className={style["icon"]}>
                            <OutlineArrowdownIcon />
                        </div>
                        <div className={style["content"]}>{t("YakitTable.desc")}</div>
                    </div>
                    <div
                        className={classNames(style["filter-item"],{
                            [style["active-filter-item"]]: filterActive,
                            [style["hover-filter-item"]]: !filterActive
                        })}
                        onClick={() => setShowRange(true)}
                    >
                        <div className={style["icon"]}>
                            {isSearch ? <OutlineSearchIcon/> : <FilterIcon/>}
                        </div>
                         <div className={style["content"]}>{t(isSearch ? "YakitInput.search":"YakitTable.filter")}</div>
                    </div>
                </>
            )}
        </div>
    )
})

interface StatusCodeInputFilterProps {
    query?: HTTPFuzzerPageTableQuery
    setQuery: (h: HTTPFuzzerPageTableQuery) => void
    onSure?: () => void
}

const StatusCodeInputFilter: React.FC<StatusCodeInputFilterProps> = memo((props) => {
    const {query, setQuery, onSure} = props
    const {t} = useI18nNamespaces(["history", "webFuzzer", "yakitUi"])
    const [statusCode, setStatusCode] = useState<string>("")
    
    useEffect(() => {
        setStatusCode(query?.StatusCode || "")
    }, [query?.StatusCode])
    
    return (
        <div className={style["status-code-input-filter"]}>
            <YakitInput.Search
                size='middle'
                value={statusCode}
                placeholder={t("YakitInput.supportInputFormat")}
                onChange={(e) => {
                    // 只允许输入数字、逗号和连字符，去掉所有其他字符
                    const value = e.target.value.replace(/[^0-9,-]/g, "")
                    setStatusCode(value)
                }}
                onSearch={() => {
                    setQuery({
                        ...query,
                        StatusCode: statusCode
                    })
                    onSure && onSure()
                }}
            />
        </div>
    )
})

export {ExtractedFilter, TableFilterAndSorter, StatusCodeInputFilter}
