export interface BrowserTransformSelectionContract {
  deviceId: string
  profileId: string
  profileName: string
  browserName?: string
  origin?: string
  maxConcurrency?: number
}

export interface BrowserTransformSelectableDevice {
  id: string
  name: string
}

export interface BrowserTransformSelectableProfile {
  id: string
  name: string
  origin: string
  maxConcurrency: number
}

export function toBrowserTransformSelection(
  device: BrowserTransformSelectableDevice,
  profile: BrowserTransformSelectableProfile,
): BrowserTransformSelectionContract {
  return {
    deviceId: device.id,
    profileId: profile.id,
    profileName: profile.name,
    browserName: device.name,
    origin: profile.origin,
    maxConcurrency: profile.maxConcurrency,
  }
}

export function browserTransformRequestFields(
  selection?: Pick<BrowserTransformSelectionContract, 'deviceId' | 'profileId'>,
): { BrowserExtensionDeviceId?: string; BrowserTransformProfileId?: string } {
  if (!selection) return {}
  return {
    BrowserExtensionDeviceId: selection.deviceId,
    BrowserTransformProfileId: selection.profileId,
  }
}
