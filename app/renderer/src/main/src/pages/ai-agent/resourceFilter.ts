export const RESOURCE_FILTER_OPTIONS = {
  all: { label: 'AIMentionTabs.all', value: 'all' },
  added: { label: 'YakitButton.added', value: 'added' },
} as const

export type ResourceFilterValue = (typeof RESOURCE_FILTER_OPTIONS)[keyof typeof RESOURCE_FILTER_OPTIONS]['value']
