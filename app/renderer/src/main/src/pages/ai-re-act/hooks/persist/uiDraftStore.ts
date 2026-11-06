const drafts = new Map<string, Map<string, unknown>>()

export function setUIDraft(sessionId: string, id: string, state: unknown) {
  let byId = drafts.get(sessionId)
  if (!byId) {
    byId = new Map()
    drafts.set(sessionId, byId)
  }
  byId.set(id, state)
}

export function getUIDraft(sessionId: string, id: string) {
  return drafts.get(sessionId)?.get(id)
}

export function clearUIDrafts(sessionId: string) {
  drafts.delete(sessionId)
}

export function clearAllUIDrafts() {
  drafts.clear()
}
