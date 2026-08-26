import { YakitRoute } from '@/enums/yakitRoute'

let pendingRoute: YakitRoute | undefined

export const requestDigitalEmployeeQuickNavigation = (route: YakitRoute) => {
  pendingRoute = route
}

export const consumeDigitalEmployeeQuickNavigation = () => {
  const route = pendingRoute
  pendingRoute = undefined
  return route
}
