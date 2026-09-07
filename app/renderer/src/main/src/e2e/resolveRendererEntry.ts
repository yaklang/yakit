export const APP_RENDERER_ENTRY = 'app' as const
export const TABLE_VIRTUAL_FIXED_RIGHT_RENDERER_ENTRY = 'table-virtual-fixed-right' as const
export const E2E_FIXTURE_PROTOCOL_VERSION = 1 as const

export interface RendererStartupCapability {
  readonly name: string
  readonly protocolVersion: number
}

interface ResolveRendererEntryOptions {
  queryFixture: string | null | undefined
  startupCapability: RendererStartupCapability | null | undefined
}

export const resolveRendererEntry = ({ queryFixture, startupCapability }: ResolveRendererEntryOptions) => {
  if (
    queryFixture === TABLE_VIRTUAL_FIXED_RIGHT_RENDERER_ENTRY &&
    startupCapability?.name === TABLE_VIRTUAL_FIXED_RIGHT_RENDERER_ENTRY &&
    startupCapability.protocolVersion === E2E_FIXTURE_PROTOCOL_VERSION
  ) {
    return TABLE_VIRTUAL_FIXED_RIGHT_RENDERER_ENTRY
  }

  return APP_RENDERER_ENTRY
}
