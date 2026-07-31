/**
 * Vitest stub for i18next-resources-to-backend.
 * Must return a module with `.type === 'backend'` for i18n.use().
 */
export default function resourcesToBackend(_load: (lng: string, ns: string) => Promise<unknown>) {
  return {
    type: 'backend' as const,
    init() {
      // no-op
    },
    read(language: string, namespace: string, callback: (err: unknown, data: unknown) => void) {
      try {
        callback(null, {})
      } catch (e) {
        callback(e, null)
      }
    },
  }
}
