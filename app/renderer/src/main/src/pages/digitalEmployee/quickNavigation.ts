import { YakitRoute } from '@/enums/yakitRoute'

type QuickNavigationSubscriber = (route: YakitRoute) => void

let pendingRoute: YakitRoute | undefined
let subscriber: QuickNavigationSubscriber | undefined

export const requestDigitalEmployeeQuickNavigation = (route: YakitRoute) => {
  if (subscriber) {
    subscriber(route)
    return
  }
  pendingRoute = route
}

export const subscribeDigitalEmployeeQuickNavigation = (nextSubscriber: QuickNavigationSubscriber) => {
  subscriber = nextSubscriber
  if (pendingRoute) {
    const route = pendingRoute
    pendingRoute = undefined
    nextSubscriber(route)
  }

  return () => {
    if (subscriber === nextSubscriber) subscriber = undefined
  }
}
