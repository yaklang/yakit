import React, { useEffect, useRef, useState } from 'react'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { AIToolListItemProps, AIToolListProps, ToolQueryType } from './AIToolListType'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import { grpcDeleteAITool, grpcGetAIToolList, grpcToggleAIToolFavorite } from './utils'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import { SolidStarIcon, SolidToolIcon } from '@/assets/icon/solid'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineClipboardcopyIcon,
  OutlineDotsverticalIcon,
  OutlinePencilaltIcon,
  OutlineSearchIcon,
  OutlineStarIcon,
  OutlineTrashIcon,
} from '@/assets/icon/outline'
import styles from './AIToolList.module.scss'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { AITool, GetAIToolListRequest, GetAIToolListResponse, ToggleAIToolFavoriteRequest } from '../type/aiTool'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitMenuItemType } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { setClipboardText } from '@/utils/clipboard'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { ReActChatEventEnum, tagColors } from '../defaultConstant'
import { YakitRoundCornerTag } from '@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag'
import { yakitNotify } from '@/utils/notification'
import { AIToolEditorPageInfoProps } from '@/store/pageInfo'
import { TFunction, useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import i18n from '@/i18n/i18n'
const tOriginal = i18n.getFixedT(null, 'aiAgent')

/**
 * 工具类型选项
 *  - 全部：展示全部工具
 *  - 收藏：只展示收藏的工具
 */
export const toolTypeOptions = (t: TFunction) => {
  return [
    {
      label: t('AIToolList.all'),
      value: 'all',
    },
    {
      label: t('AIToolList.collect'),
      value: 'collect',
    },
  ]
}
/**
 * 工具操作菜单
 *  - 复制：将工具的名称复制到剪贴板
 *  - 删除：删除该工具
 */
export const toolMenu: (t: TFunction) => YakitMenuItemType[] = (t: TFunction) => {
  return [
    {
      key: 'copy',
      label: t('YakitButton.copy'),
      itemIcon: <OutlineClipboardcopyIcon />,
    },
    {
      key: 'delete',
      label: t('YakitButton.delete'),
      type: 'danger',
      itemIcon: <OutlineTrashIcon />,
    },
  ]
}
/**
 * 打开编辑页面
 * @param item AITool 模板数据
 * @param source 打开编辑页面的来源路由，默认为 YakitRoute.AI_Agent, 用于区分从哪个页面打开的编辑页面，方便编辑页面关闭时返回对应的页面
 * @returns
 */
export const handleModifyAITool = (item: AITool, source?: YakitRoute) => {
  if (!item.ID) {
    yakitNotify('error', tOriginal('AIToolList.templateIdError', { id: item.ID }))
    return
  }
  const params: AIToolEditorPageInfoProps = {
    id: item.ID,
    source: source || YakitRoute.AI_Agent,
  }
  emiter.emit(
    'openPage',
    JSON.stringify({
      route: YakitRoute.ModifyAITool,
      params,
    }),
  )
}
/**
 *
 * @param source 打开新建页面的来源路由，默认为 YakitRoute.AI_Agent, 用于区分从哪个页面打开的新建页面，方便编辑页面关闭时返回对应的页面
 */
export const handleAddAITool = (source?: YakitRoute) => {
  const params: AIToolEditorPageInfoProps = {
    id: 0,
    source: source || YakitRoute.AI_Agent,
  }
  emiter.emit(
    'openPage',
    JSON.stringify({
      route: YakitRoute.AddAITool,
      params,
    }),
  )
}
const AIToolList: React.FC<AIToolListProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [toolQueryType, setToolQueryType] = useState<ToolQueryType>('all')
  const [keyWord, setKeyWord] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [spinning, setSpinning] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(false)
  const [isRef, setIsRef] = useState<boolean>(false)
  const [recalculation, setRecalculation] = useState<boolean>(false)
  const [response, setResponse] = useState<GetAIToolListResponse>({
    Tools: [],
    Pagination: genDefaultPagination(20),
    Total: 0,
  })

  const toolListRef = useRef<HTMLDivElement>(null)
  const [inViewPort = true] = useInViewport(toolListRef)

  useEffect(() => {
    if (inViewPort) getList()
  }, [inViewPort])
  const getList = useMemoizedFn(async (page?: number) => {
    setLoading(true)
    const newQuery: GetAIToolListRequest = {
      Query: keyWord,
      ToolName: '',
      Pagination: {
        ...genDefaultPagination(20),
        Page: page || 1,
      },
      OnlyFavorites: toolQueryType === 'collect',
    }
    if (newQuery.Pagination.Page === 1) {
      setSpinning(true)
    }
    try {
      const res = await grpcGetAIToolList(newQuery)
      if (!res.Tools) res.Tools = []
      const newPage = +res.Pagination.Page
      const length = newPage === 1 ? res.Tools.length : res.Tools.length + response.Tools.length
      setHasMore(length < +res.Total)
      let newRes: GetAIToolListResponse = {
        Tools: newPage === 1 ? res?.Tools : [...response.Tools, ...(res?.Tools || [])],
        Pagination: res?.Pagination || {
          ...genDefaultPagination(20),
        },
        Total: res.Total,
      }
      setResponse(newRes)
      if (newPage === 1) {
        setIsRef(!isRef)
      }
    } catch (error) {}
    setTimeout(() => {
      setLoading(false)
      setSpinning(false)
    }, 300)
  })
  const onSearch = useMemoizedFn((value) => {
    setKeyWord(value)
    setTimeout(() => {
      getList()
    }, 200)
  })
  // const onPressEnter = useMemoizedFn((e) => {
  //     onSearch(e.target.value)
  // })
  const loadMoreData = useMemoizedFn(() => {
    getList(+response.Pagination.Page + 1)
  })
  const onToolQueryTypeChange = useMemoizedFn((e) => {
    setToolQueryType(e.target.value as ToolQueryType)
    setKeyWord('')
    setTimeout(() => {
      getList()
    }, 200)
  })
  const onSetData = useMemoizedFn((item: AITool) => {
    setResponse((preV) => ({
      ...preV,
      Tools: preV.Tools.map((ele) => {
        if (ele.Name === item.Name) {
          return { ...ele, IsFavorite: item.IsFavorite }
        }
        return { ...ele }
      }),
    }))
    setRecalculation((v) => !v)
  })
  const onSelect = useMemoizedFn((record) => {
    emiter.emit(
      'onReActChatEvent',
      JSON.stringify({
        type: ReActChatEventEnum.USE_AI_TOOL,
        params: { value: record },
      }),
    )
  })
  return (
    <div className={styles['ai-tool-list-wrapper']} ref={toolListRef}>
      <div className={styles['ai-tool-list-header']}>
        <div className={styles['ai-tool-list-header-left']}>
          <YakitRadioButtons
            size="small"
            buttonStyle="solid"
            value={toolQueryType}
            options={toolTypeOptions(t)}
            onChange={onToolQueryTypeChange}
          />
          <YakitRoundCornerTag>{response.Total}</YakitRoundCornerTag>
        </div>
        {/* <YakitButton icon={<OutlinePlussmIcon />} onClick={handleNewAITool} /> */}
      </div>
      <div className={styles['ai-tool-list-search']}>
        {/* <YakitInput.Search
                value={keyWord}
                onChange={(e) => setKeyWord(e.target.value)}
                onSearch={onSearch}
                onPressEnter={onPressEnter}
                wrapperStyle={{margin: "0 12px"}}
                allowClear
            /> */}
        <YakitInput
          prefix={<OutlineSearchIcon className={styles['search-icon']} />}
          allowClear
          placeholder={t('YakitInput.searchKeyWordPlaceholder')}
          value={keyWord}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div style={{ flex: 1, height: 0 }}>
        <YakitSpin spinning={spinning}>
          <RollingLoadList<AITool>
            data={response.Tools}
            loadMoreData={loadMoreData}
            renderRow={(rowData: AITool, index: number) => {
              return (
                <React.Fragment key={rowData.Name}>
                  <AIToolListItem item={rowData} onSetData={onSetData} onRefresh={getList} onSelect={onSelect} />
                </React.Fragment>
              )
            }}
            classNameRow={styles['ai-tool-list-item']}
            classNameList={styles['ai-tool-list']}
            page={+response.Pagination.Page}
            hasMore={hasMore}
            loading={loading}
            defItemHeight={120}
            rowKey="Name"
            isRef={isRef}
            recalculation={recalculation}
          />
        </YakitSpin>
      </div>
    </div>
  )
})
export default AIToolList

const AIToolListItem: React.FC<AIToolListItemProps> = React.memo((props) => {
  const { item, onSetData, onRefresh, onSelect } = props
  const { t } = useI18nNamespaces(['yakitUi'])
  const [visible, setVisible] = useState<boolean>(false)
  const onFavorite = useMemoizedFn((e) => {
    e.stopPropagation()
    const params: ToggleAIToolFavoriteRequest = {
      ID: item.ID,
    }
    grpcToggleAIToolFavorite(params).then(() => {
      onSetData({
        ...item,
        IsFavorite: !item.IsFavorite,
      })
    })
  })
  const tags = useCreation(() => {
    const length = tagColors.length
    return (
      <div className={styles['ai-tool-list-item-keywords']}>
        {[...new Set(item.Keywords)].map((keyword) => {
          const number = Math.floor(Math.random() * length)
          return (
            <YakitTag
              size="small"
              key={keyword}
              className={styles['ai-tool-list-item-keywords-tag']}
              color={tagColors[number]}
            >
              {keyword}
            </YakitTag>
          )
        })}
      </div>
    )
  }, [item.Keywords])
  const menuSelect = useMemoizedFn((key: string) => {
    switch (key) {
      case 'copy':
        setClipboardText(item.Name)
        break
      case 'delete':
        onRemove()
        break
      default:
        break
    }
  })
  const onRemove = useMemoizedFn(() => {
    grpcDeleteAITool({ IDs: [item.ID] }).then(() => {
      onRefresh()
      yakitNotify('success', t('YakitNotification.deleted'))
    })
  })
  const onEdit = useMemoizedFn((e) => {
    e.stopPropagation()
    handleModifyAITool(item)
  })
  const onToolClick = useMemoizedFn((e) => {
    e.stopPropagation()
    onSelect(item)
  })
  return (
    <>
      <YakitPopover
        placement="right"
        overlayClassName={styles['terminal-popover']}
        content={<YakitEditor type={'yak'} value={item.Content} readOnly={true} />}
      >
        <div className={styles['ai-tool-list-item-content']} onClick={onToolClick}>
          <div className={styles['ai-tool-list-item-heard']}>
            <div className={styles['ai-tool-list-item-heard-name']}>
              <SolidToolIcon className={styles['tool-icon']} />
              <span className={styles['ai-tool-list-item-heard-name-text']}>{item.VerboseName || item.Name}</span>
            </div>
            <div
              className={styles['ai-tool-list-item-heard-extra']}
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              {item.IsFavorite ? (
                <YakitButton
                  type="text2"
                  icon={<SolidStarIcon className={styles['star-icon-active']} />}
                  onClick={onFavorite}
                />
              ) : (
                <YakitButton
                  type="text2"
                  icon={<OutlineStarIcon className={styles['star-icon']} />}
                  onClick={onFavorite}
                />
              )}
              <YakitButton type="text2" icon={<OutlinePencilaltIcon />} onClick={onEdit} />
              <YakitDropdownMenu
                menu={{
                  data: toolMenu(t),
                  onClick: ({ key }) => menuSelect(key),
                }}
                dropdown={{
                  trigger: ['click', 'contextMenu'],
                  placement: 'bottomLeft',
                  visible: visible,
                  onVisibleChange: setVisible,
                }}
              >
                <YakitButton isActive={visible} type="text2" size="small" icon={<OutlineDotsverticalIcon />} />
              </YakitDropdownMenu>
            </div>
          </div>
          <div className={styles['ai-tool-list-item-description']}>{item.Description}</div>
          {tags}
        </div>
      </YakitPopover>
    </>
  )
})
