import React, {useEffect, useMemo, useRef, useState} from "react"
import {useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./AuditSearch.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {AuditSearchProps} from "./AuditSearchType"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import { defYakitAutoCompleteRef, YakitAutoComplete } from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import { YakitInput } from "@/components/yakitUI/YakitInput/YakitInput"
import { RemoteGV } from "@/yakitGV"
import { YakitAutoCompleteRefProps } from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import { grpcFetchLocalPluginDetail } from "@/pages/pluginHub/utils/grpc"
import { YakScript } from "@/pages/invoker/schema"
export const AuditSearch: React.FC<AuditSearchProps> = (props) => {
    const [checked, setChecked] = useState<boolean>(true)
    const [keywords, setKeywords] = useState<string>("")
    const auditCodeKeywordsRef = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const onSearch = useMemoizedFn((val) => {
        
    })
    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
    })
    const onSelectKeywords = useMemoizedFn((value) => {
        onSearch(value)
        setKeywords(value)
    })

    const [plugin, setPlugin] = useState<YakScript>()
    // 获取参数
    const handleFetchParams = useDebounceFn(
        useMemoizedFn(async () => {
            const newPlugin = await grpcFetchLocalPluginDetail({Name: "SyntaxFlow Searcher"}, true)
            console.log("ooioo",newPlugin);
            
            setPlugin(newPlugin)
        }),
        {wait: 300}
    ).run

    const getKindList = useMemo(()=>{
        const json = plugin?.Params.find((item) => item.Field === "kind")?.ExtraSetting

    },[plugin?.Params])

    useEffect(() => {
        handleFetchParams()
    }, [])

    return (
        <div className={styles["audit-search-box"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>搜索</div>
                <div className={styles["extra"]}>
                    <YakitCheckbox
                        checked={checked}
                        onChange={(e) => {
                            setChecked(e.target.checked)
                        }}
                        className={styles['checked-box']}
                    >
                        模糊搜索
                    </YakitCheckbox>
                </div>
            </div>
            <div className={styles["filter-box"]}>
                    {/* <YakitAutoComplete
                        ref={auditCodeKeywordsRef}
                        isCacheDefaultValue={false}
                        cacheHistoryDataKey={RemoteGV.AuditCodeKeywords}
                        onSelect={onSelectKeywords}
                        value={keywords}
                    > */}
                        <YakitInput.Search
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            placeholder='请输入关键词搜索'
                            onSearch={onSearch}
                            onPressEnter={onPressEnter}
                        />
                    {/* </YakitAutoComplete> */}
                </div>
        </div>
    )
}
