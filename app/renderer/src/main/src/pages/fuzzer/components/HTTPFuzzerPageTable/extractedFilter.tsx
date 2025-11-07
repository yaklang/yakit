import {OutlineFilterIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {Divider} from "antd"
import {memo, useRef, useState} from "react"
import style from "./HTTPFuzzerPageTable.module.scss"
import classNames from "classnames"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useInViewport, useUpdateEffect} from "ahooks"

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

export default ExtractedFilter
