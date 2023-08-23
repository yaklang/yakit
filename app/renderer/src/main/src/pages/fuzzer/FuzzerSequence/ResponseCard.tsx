import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"
import { useCreation, useMap, useSize } from "ahooks"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { emptyFuzzer, FuzzerExtraShow, defaultAdvancedConfigValue, SecondNodeTitle, ResponseViewer, SecondNodeExtra, FuzzerResponse } from "../HTTPFuzzerPage"
import { ResponseCardProps } from "./FuzzerSequenceType"
import styles from './FuzzerSequence.module.scss'
import { Divider, Result } from "antd"
import { HTTPFuzzerPageTable, HTTPFuzzerPageTableQuery } from "../components/HTTPFuzzerPageTable/HTTPFuzzerPageTable"
import { OutlineReplyIcon } from "@/assets/icon/outline"

const { ipcRenderer } = window.require("electron")

const cachedTotal = 2
const ResponseCard: React.FC<ResponseCardProps> = React.memo((props) => {
    //   const {allSuccessResponse,allFailedResponse}=props;
    const { responseMap, showAllResponse, setShowAllResponse } = props
    const [showSuccess, setShowSuccess] = useState(true)
    const [query, setQuery] = useState<HTTPFuzzerPageTableQuery>()
    const [affixSearch, setAffixSearch] = useState<string>("")
    const [defaultResponseSearch, setDefaultResponseSearch] = useState<string>("")
    const [isRefresh, setIsRefresh] = useState<boolean>(false)

    const [extractedMap, { setAll, reset }] = useMap<string, string>()

    const isShowRef = useRef<boolean>(false)
    const secondNodeRef = useRef(null)
    const secondNodeSize = useSize(secondNodeRef)

    useEffect(() => {
        ipcRenderer.on("fetch-extracted-to-table", (e: any, data: { type: string, extractedMap: Map<string, string> }) => {
            if (data.type === 'allSequenceList') {
                setAll(data.extractedMap)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-extracted-to-table")
        }
    }, [])

    const isShow = useMemo(() => {
        if (showAllResponse) {
            isShowRef.current = showAllResponse
        }
        if (isShowRef.current) {
            return true
        }
        return showAllResponse
    }, [showAllResponse])

    const fuzzerData = useMemo(() => {
        const myArray1 = Array.from(responseMap);
        const length = myArray1.length
        const successFuzzer: FuzzerResponse[] = []
        const failedFuzzer: FuzzerResponse[] = []
        for (let index = 0; index < length; index++) {
            const element = myArray1[index][1];
            if (element) {
                successFuzzer.push(...element.successFuzzer)
                failedFuzzer.push(...element.failedFuzzer)
            }
        }
        return {
            successFuzzerLength: successFuzzer.length,
            failedFuzzerLength: failedFuzzer.length,
            successFuzzer,
            failedFuzzer
        }
    }, [responseMap])
    return (isShow ? <div className={styles['all-sequence-response-list']} style={{ display: showAllResponse ? '' : 'none' }}>
        <div className={styles['all-sequence-response-heard']}>
            <div className={styles['display-flex-center']}>
                <span style={{ marginRight: 8 }}>Responses</span>
                <SecondNodeTitle
                    cachedTotal={cachedTotal}
                    onlyOneResponse={false}
                    rsp={emptyFuzzer}
                    successFuzzerLength={fuzzerData.successFuzzerLength}
                    failedFuzzerLength={fuzzerData.failedFuzzerLength}
                    showSuccess={showSuccess}
                    setShowSuccess={(v) => {
                        setShowSuccess(v)
                        setQuery(undefined)
                    }}
                />
            </div>
            <div className={styles['all-sequence-response-heard-extra']}>
                <SecondNodeExtra
                    onlyOneResponse={false}
                    cachedTotal={cachedTotal}
                    rsp={emptyFuzzer}
                    valueSearch={affixSearch}
                    onSearchValueChange={(value) => {
                        setAffixSearch(value)
                        if (value === "" && defaultResponseSearch !== "") {
                            setDefaultResponseSearch("")
                        }
                    }}
                    onSearch={() => {
                        setDefaultResponseSearch(affixSearch)
                    }}
                    successFuzzer={fuzzerData.successFuzzer}
                    secondNodeSize={secondNodeSize}
                    query={query}
                    setQuery={(q) => setQuery({ ...q })}
                    sendPayloadsType='allSequenceList'
                />
                <Divider type='vertical' />
                <div className={styles['return-button']} onClick={() => setShowAllResponse()}>
                    <OutlineReplyIcon className={styles['reply-icon']} />
                    <span>返回</span>
                </div>
                {/* <YakitButton onClick={() => setShowAllResponse()} size='small' type='text' icon={<OutlineReplyIcon className={styles['reply-icon']}/>}>返回</YakitButton> */}
            </div>
        </div>
        <div ref={secondNodeRef} className={styles['all-sequence-response-table']}>
            {showSuccess && (
                <HTTPFuzzerPageTable
                    isRefresh={isRefresh}
                    success={showSuccess}
                    data={fuzzerData.successFuzzer}
                    query={query}
                    setQuery={setQuery}
                    extractedMap={extractedMap}
                    isEnd={true}
                    isShowDebug={false}
                />
            )}
            {!showSuccess && (
                <HTTPFuzzerPageTable
                    isRefresh={isRefresh}
                    success={showSuccess}
                    data={fuzzerData.failedFuzzer}
                    query={query}
                    setQuery={setQuery}
                    isEnd={true}
                    extractedMap={extractedMap}
                />
            )}
        </div>
    </div> : <></>)
})

export default ResponseCard