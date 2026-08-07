export const readWebFuzzerTabState = async () =>
  browser.execute(() => {
    const tabList = document.querySelector('[data-testid="web-fuzzer-tab-list"]')
    const tabs = Array.from(document.querySelectorAll('[data-testid="web-fuzzer-tab"]')).map((element) => ({
      id: element.getAttribute('data-page-id') || '',
      groupId: element.getAttribute('data-group-id') || '0',
      name: element.getAttribute('data-tab-name') || '',
      active: element.getAttribute('data-active') === 'true',
      sort: Number(element.getAttribute('data-sort') || 0),
    }))
    const groups = Array.from(document.querySelectorAll('[data-testid="web-fuzzer-tab-group"]')).map((element) => {
      const groupNameElement = element.firstElementChild
      return {
        id: element.getAttribute('data-page-id') || '',
        name: element.getAttribute('data-group-name') || '',
        expanded: element.getAttribute('data-expanded') === 'true',
        color: element.getAttribute('data-group-color') || '',
        renderedColor: groupNameElement ? getComputedStyle(groupNameElement).backgroundColor : '',
        sort: Number(element.getAttribute('data-sort') || 0),
      }
    })
    return {
      exists: !!tabList,
      visible: !!tabList && tabList.getClientRects().length > 0,
      tabs,
      groups,
    }
  })

const includesExpectedNodes = (actual, expected) => {
  if (!actual.exists) return false
  if (expected.visible !== undefined && actual.visible !== expected.visible) return false
  if (expected.tabCount !== undefined && actual.tabs.length !== expected.tabCount) return false
  if (expected.groupCount !== undefined && actual.groups.length !== expected.groupCount) return false
  if (expected.activeTabId !== undefined) {
    const activeTab = actual.tabs.find((tab) => tab.active)
    if (activeTab?.id !== expected.activeTabId) return false
  }
  for (const expectedGroup of expected.groups || []) {
    const actualGroup = actual.groups.find((group) => group.id === expectedGroup.id)
    if (!actualGroup) return false
    if (expectedGroup.name !== undefined && actualGroup.name !== expectedGroup.name) return false
    if (expectedGroup.expanded !== undefined && actualGroup.expanded !== expectedGroup.expanded) return false
    if (expectedGroup.color !== undefined && actualGroup.color !== expectedGroup.color) return false
    if (expectedGroup.renderedColor !== undefined && actualGroup.renderedColor !== expectedGroup.renderedColor) return false
    if (expectedGroup.sort !== undefined && actualGroup.sort !== expectedGroup.sort) return false
  }
  for (const expectedTab of expected.tabs || []) {
    const actualTab = actual.tabs.find((tab) => tab.id === expectedTab.id)
    if (!actualTab) return false
    if (expectedTab.name !== undefined && actualTab.name !== expectedTab.name) return false
    if (expectedTab.groupId !== undefined && actualTab.groupId !== expectedTab.groupId) return false
    if (expectedTab.active !== undefined && actualTab.active !== expectedTab.active) return false
    if (expectedTab.sort !== undefined && actualTab.sort !== expectedTab.sort) return false
  }
  for (const absentId of expected.absentIds || []) {
    if (actual.tabs.some((tab) => tab.id === absentId) || actual.groups.some((group) => group.id === absentId)) {
      return false
    }
  }
  return true
}

export const waitForWebFuzzerTabState = async (expected, label) => {
  let latest
  try {
    await browser.waitUntil(
      async () => {
        latest = await readWebFuzzerTabState()
        return includesExpectedNodes(latest, expected)
      },
      {
        timeout: 20_000,
        interval: 100,
        timeoutMsg: `Web Fuzzer UI did not reach ${label}`,
      },
    )
  } catch (error) {
    throw new Error(`Web Fuzzer UI did not reach ${label}; latest DOM state: ${JSON.stringify(latest)}`, {
      cause: error,
    })
  }
  return latest
}
