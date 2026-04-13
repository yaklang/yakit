import React, { useEffect, useRef, useState } from 'react'
import { useCreation, useInViewport, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { OutlinePlussmIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import styles from './AIReActTaskChat.module.scss'
import { AIMaterialsData } from '@/pages/ai-agent/aiChatWelcome/type'
import { YakitRoute } from '@/enums/yakitRoute'
import emiter from '@/utils/eventBus/eventBus'
import { getAIRecommendIconByType } from '../hooks/useGetAIMaterialsData'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { AIReActTaskEmptyProps, AIReActTaskRecommendProps } from './AIReActTaskChatType'
import FilePreviewRecentList from '@/pages/ai-agent/components/aiFileSystemList/FilePreview/components/FilePreviewRecentList'
import useChatIPCStore from '@/pages/ai-agent/useContext/ChatIPCContent/useStore'
import { getNameByPath } from '@/pages/yakRunner/utils'
import { AITabsEnum } from '@/pages/ai-agent/defaultConstant'

const AIReActTaskEmpty: React.FC<AIReActTaskEmptyProps> = React.memo((props) => {
  const { loadingAIMaterials, randomAIMaterialsData, onRefresh, onClickItem } = props

  const taskEmptyRef = useRef<HTMLDivElement>(null)
  const [inViewPort = true] = useInViewport(taskEmptyRef)

  const { grpcFolders } = useChatIPCStore().chatIPCData
  const [sessionFiles, setSessionFiles] = useState<Array<(typeof grpcFolders)[number] & { name: string }>>([])

  useEffect(() => {
    let isActive = true

    const fetchSessionFiles = async () => {
      const files = await Promise.all(
        grpcFolders.map(async (item) => ({
          ...item,
          name: await getNameByPath(item.path),
        })),
      )

      if (isActive) {
        setSessionFiles(files)
      }
    }

    fetchSessionFiles()

    return () => {
      isActive = false
    }
  }, [grpcFolders])

  useUpdateEffect(() => {
    if (inViewPort) {
      onRefresh()
    }
  }, [inViewPort])

  const handleViewFile = useMemoizedFn((item) => {
    emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.File_System }))
    setTimeout(() => {
      emiter.emit('fileSystemDefaultExpand', item.path)
    }, 800)
  })

  return (
    <YakitSpin spinning={loadingAIMaterials} wrapperClassName={styles['spin-wrapper']}>
      <div className={styles['re-act-task-empty-wrapper']} ref={taskEmptyRef}>
        <div className={styles['heard']}>
          <div className={styles['title']}>扩展资源</div>
          <div className={styles['sub-title']}>专注于安全编码与漏洞分析的智能助手</div>
        </div>
        <div className={styles['list-wrapper']}>
          {Object.keys(randomAIMaterialsData).map((key) => {
            const aiItem: AIMaterialsData = randomAIMaterialsData[key as keyof typeof randomAIMaterialsData]
            return aiItem.data.length > 0 ? (
              <AIReActTaskRecommend
                key={aiItem.type}
                title={aiItem.type}
                data={aiItem.data}
                onClickItem={(item) => onClickItem(item, aiItem.mentionType)}
              />
            ) : (
              <React.Fragment key={aiItem.type}></React.Fragment>
            )
          })}
          <FilePreviewRecentList title="本次会话文件" files={sessionFiles} onClickItem={handleViewFile} />
        </div>
      </div>
    </YakitSpin>
  )
})

export default AIReActTaskEmpty

const AIReActTaskRecommend: React.FC<AIReActTaskRecommendProps> = React.memo((props) => {
  const { title, data, onClickItem } = props
  const icons = useCreation(() => {
    return getAIRecommendIconByType(title)
  }, [title])
  const onAdd = useMemoizedFn(() => {
    switch (title) {
      case '技能':
        emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.AddAIForge }))
        break
      case '知识库':
        emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.AI_REPOSITORY }))
        break
      case '工具':
        emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.AddAITool }))
        break

      default:
        break
    }
  })
  return (
    <div className={styles['re-act-recommend-list-wrapper']}>
      <div className={styles['re-act-recommend-list-heard']}>
        <div className={styles['title']}>
          <div className={styles['icon']}>{icons.icon}</div>
          <div className={styles['hover-icon']}>{icons.hoverIcon}</div>
          {title}
        </div>
        <YakitButton icon={<OutlinePlussmIcon />} className={styles['add-btn']} type="text" onClick={onAdd}>
          新建
        </YakitButton>
      </div>
      <div className={styles['re-act-recommend-list']}>
        {data.map((item, index) => (
          <div
            key={index} //不需要缓存，每次刷新重新渲染
            className={styles['re-act-recommend-list-item']}
            onClick={() => onClickItem(item)}
          >
            <span className={styles['text']}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
})
