export type ProjectMagEventProps = {
  onSwitchEngine?: string
  onGetProjectInfo?: string
  onRefreshProjectList?: string
  onServerPushProjectChanged?: string
}

/** Server push payload for project (aligned with backend ProjectPush). */
export type ProjectPushPayload = {
  action?: 'create' | 'prompt_enter' | 'auto_enter'
  id?: number
  project_name?: string
  type?: string
}
