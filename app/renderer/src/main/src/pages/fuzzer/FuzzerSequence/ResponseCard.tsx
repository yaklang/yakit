import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useMap, useSize } from 'ahooks'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { SecondNodeTitle, SecondNodeExtra, FuzzerResponse, FuzzerShowSuccess } from '../HTTPFuzzerPage'
import { ResponseCardProps } from './FuzzerSequenceType'
import styles from './FuzzerSequence.module.scss'
import { Divider } from 'antd'
import { HTTPFuzzerPageTable, HTTPFuzzerPageTableQuery } from '../components/HTTPFuzzerPageTable/HTTPFuzzerPageTable'
import { OutlineReplyIcon } from '@/assets/icon/outline'
import { emptyFuzzer } from '@/defaultConstants/HTTPFuzzerPage'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const { ipcRenderer } = window.require('electron')

const cachedTotal = 2
const ResponseCard: React.FC<ResponseCardProps> = React.memo((props) => {
  //   const {allSuccessResponse,allFailedResponse}=props;
  const { responseMap, showAllResponse, setShowAllResponse } = props
  const { t, i18n } = useI18nNamespaces(['yakitUi', 'webFuzzer'])
  const [showSuccess, setShowSuccess] = useState<FuzzerShowSuccess>('true')
  const [query, setQuery] = useState<HTTPFuzzerPageTableQuery>()

  const [extractedMap, { setAll }] = useMap<string, string>()

  const isShowRef = useRef<boolean>(false)
  const secondNodeRef = useRef(null)
  const secondNodeSize = useSize(secondNodeRef)

  useEffect(() => {
    ipcRenderer.on('fetch-extracted-to-table', (e: any, data: { type: string; extractedMap: Map<string, string> }) => {
      if (data.type === 'allSequenceList') {
        setAll(data.extractedMap)
      }
    })
    return () => {
      ipcRenderer.removeAllListeners('fetch-extracted-to-table')
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
    const myArray1 = Array.from(responseMap)
    const length = myArray1.length
    const successFuzzer: FuzzerResponse[] = []
    const failedFuzzer: FuzzerResponse[] = []
    for (let index = 0; index < length; index++) {
      const element = myArray1[index][1]
      if (element) {
        successFuzzer.push(...element.successFuzzer)
        failedFuzzer.push(...element.failedFuzzer)
      }
    }
    return {
      successFuzzerLength: successFuzzer.length,
      failedFuzzerLength: failedFuzzer.length,
      successFuzzer,
      failedFuzzer,
    }
  }, [responseMap])

  return isShow ? (
    <div className={styles['all-sequence-response-list']} style={{ display: showAllResponse ? '' : 'none' }}>
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
            size="middle"
            showConcurrentAndLoad={false}
          />
        </div>
        <div className={styles['all-sequence-response-heard-extra']}>
          <SecondNodeExtra
            onlyOneResponse={false}
            cachedTotal={cachedTotal}
            rsp={emptyFuzzer}
            getSuccessResponses={() => fuzzerData.successFuzzer}
            failedCount={fuzzerData.failedFuzzerLength}
            secondNodeSize={secondNodeSize}
            query={query}
            setQuery={setQuery}
            sendPayloadsType="allSequenceList"
            size="middle"
            setShowExtra={() => {}}
            showResponseInfoSecondEditor={true}
            setShowResponseInfoSecondEditor={() => {}}
          />
          <Divider type="vertical" style={{ marginRight: 0 }} />
          <YakitButton onClick={() => setShowAllResponse()} type="text2" icon={<OutlineReplyIcon />}>
            {t('YakitButton.back')}
          </YakitButton>
        </div>
      </div>
      <div
        ref={secondNodeRef}
        className={styles['all-sequence-response-table']}
        style={{ border: '1px solid var(--Colors-Use-Neutral-Border)' }}
      >
        {showSuccess === 'true' && (
          <HTTPFuzzerPageTable
            success={true}
            data={fuzzerData.successFuzzer}
            query={query}
            setQuery={setQuery}
            extractedMap={extractedMap}
            isEnd={true}
            isShowDebug={false}
          />
        )}
        {showSuccess === 'false' && (
          <HTTPFuzzerPageTable
            success={false}
            data={fuzzerData.failedFuzzer}
            query={query}
            setQuery={setQuery}
            isEnd={true}
            extractedMap={extractedMap}
          />
        )}
      </div>
    </div>
  ) : (
    <></>
  )
})

export default ResponseCard
