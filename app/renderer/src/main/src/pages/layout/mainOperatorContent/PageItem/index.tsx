import React from 'react'
import { RouteToPageItem } from '@/routes/newRoute'
import { PageItemProps } from '../renderSubPage/RenderSubPageType'

const PageItem: React.FC<PageItemProps> = React.memo(
  (props) => {
    // useWhyDidYouUpdate("PageItem", {...props})
    return <RouteToPageItem {...props} />
  },
  (preProps, nextProps) => {
    if (preProps.routeKey !== nextProps.routeKey) return false
    if (preProps.yakScriptId !== nextProps.yakScriptId) return false
    return true
  },
)

export default PageItem
