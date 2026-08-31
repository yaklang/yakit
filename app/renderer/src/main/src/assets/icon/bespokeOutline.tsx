import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import type React from 'react'

interface IconProps extends CustomIconComponentProps {
  onClick: (e: React.MouseEvent) => void
  ref?: any
}

const OutlineTime = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 5.33333V8L10 10M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
)

/**
 * @description  Icon/Outline/time
 */
export const OutlineTimeIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineTime} {...props} />
}

const OutlinePayload = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <mask
      id="mask0_17364_13205"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="16"
      height="16"
    >
      <rect width="16" height="16" fill="currentColor" />
    </mask>
    <g mask="url(#mask0_17364_13205)">
      <rect x="2.6665" y="2" width="10.6667" height="12" rx="2" stroke="currentColor" />
      <path
        d="M5.3335 2V7.17153C5.3335 7.24587 5.41173 7.29422 5.47822 7.26097L6.62211 6.68903C6.65026 6.67495 6.6834 6.67495 6.71155 6.68903L7.85544 7.26097C7.92193 7.29422 8.00016 7.24587 8.00016 7.17153V2"
        stroke="currentColor"
        strokeLinecap="square"
      />
      <path
        d="M2.6665 12.6668C2.6665 11.9304 3.26346 11.3335 3.99984 11.3335H13.3332V12.0002C13.3332 13.1047 12.4377 14.0002 11.3332 14.0002H3.99984C3.26346 14.0002 2.6665 13.4032 2.6665 12.6668V12.6668Z"
        stroke="currentColor"
      />
      <rect x="2.6665" y="2" width="10.6667" height="12" rx="2" stroke="currentColor" />
    </g>
  </svg>
)

/**
 * @description  Icon/Outline/Payload
 * WebFuzzer 页面中下载下来的，图标库中没有这个图标  2023.8.28
 */
export const OutlinePayloadIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlinePayload} {...props} />
}

const OutlineOnlinePlugin = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <mask
      id="mask0_30847_28410"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="16"
      height="16"
    >
      <rect width="16" height="16" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_30847_28410)">
      <path
        d="M15.3333 6L7.99996 0.666668L0.666626 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.66663 8.66667V13C2.66663 13.5523 3.11434 14 3.66663 14H12.3333C12.8856 14 13.3333 13.5523 13.3333 13V7.33333"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.66663 10.6667H5.99996V14H3.66663C3.11434 14 2.66663 13.5523 2.66663 13V10.6667Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10.6667H7.33333C8.4379 10.6667 9.33333 11.5621 9.33333 12.6667V14H6V10.6667Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.66663 9C2.66663 8.07952 3.41282 7.33333 4.33329 7.33333V7.33333C5.25377 7.33333 5.99996 8.07952 5.99996 9V10.6667H2.66663V9Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
)

/**
 * @description  Icon/Outline/插件仓库
 */
export const OutlineOnlinePluginIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineOnlinePlugin} {...props} />
}

const OutlineOwnPlugin = () => (
  <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M1.69702 6.31818V3.28788C1.69702 2.85275 2.04977 2.5 2.4849 2.5H5.55211C6.10827 2.5 6.63932 2.73159 7.01775 3.13916L7.21217 3.34855H12.3334C12.7685 3.34855 13.1213 3.7013 13.1213 4.13643V4.86364"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1.69702 6.01522C1.69702 5.46294 2.14474 5.01522 2.69702 5.01522H13.3031C13.8554 5.01522 14.3031 5.46294 14.3031 6.01522V13.1971C14.3031 13.7494 13.8554 14.1971 13.3031 14.1971H2.69702C2.14474 14.1971 1.69702 13.7494 1.69702 13.1971V6.01522Z"
      stroke="currentColor"
    />
    <circle cx="7.99995" cy="8.01515" r="1.57576" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M10.3636 11.9547C10.3636 10.6493 9.30539 9.59104 7.99999 9.59104C6.69459 9.59104 5.63635 10.6493 5.63635 11.9547"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <ellipse
      cx="7.99995"
      cy="8.01513"
      rx="1.57576"
      ry="1.57576"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * @description  Icon/Outline/我的插件
 */
export const OutlineOwnPluginIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineOwnPlugin} {...props} />
}

const OutlineLocalPlugin = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="1.33337"
      y="2.66667"
      width="13.3333"
      height="9.33333"
      rx="1"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.99996 4.66667V8.66667M7.99996 8.66667L6.66663 7.55556M7.99996 8.66667L9.33329 7.55556"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6 10H10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.66663 14H11.3333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * @description  Icon/Outline/本地插件
 */
export const OutlineLocalPluginIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineLocalPlugin} {...props} />
}

const OutlineTrashSecond = () => (
  <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13.25 4.79631L12.5995 13.7907C12.5434 14.566 11.8903 15.1667 11.1033 15.1667H4.89668C4.10972 15.1667 3.45656 14.566 3.40049 13.7907L2.75 4.79631M13.25 4.79631H10.25M13.25 4.79631H14M2.75 4.79631H2M2.75 4.79631H5.75M10.25 4.79631V2.57408C10.25 2.16498 9.91421 1.83334 9.5 1.83334H6.5C6.08579 1.83334 5.75 2.16498 5.75 2.57408V4.79631M10.25 4.79631H5.75"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.53853 10.2592L6.05139 11.0926H7.09995M9.46137 10.2592L9.94851 11.0926H8.89995M7.40522 8.77662L7.99995 7.75925L8.59467 8.77662"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * @description  Icon/Outline/trash-2
 */
export const OutlineTrashSecondIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineTrashSecond} {...props} />
}

const OutlineModScanPortData = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <mask id="mask0_30057_207490" maskUnits="userSpaceOnUse" x="0" y="0" width="18" height="18">
      <rect width="18" height="18" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_30057_207490)">
      <path
        d="M13.5 6H14.5C15.6046 6 16.5 6.89543 16.5 8V13C16.5 14.1046 15.6046 15 14.5 15H3.5C2.39543 15 1.5 14.1046 1.5 13V8C1.5 6.89543 2.39543 6 3.5 6H4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6V4.75C13.5 4.19772 13.0523 3.75 12.5 3.75H12M4.5 6V4.75C4.5 4.19772 4.94772 3.75 5.5 3.75H6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 3.75V3.25C12 2.69772 11.5523 2.25 11 2.25H7C6.44772 2.25 6 2.69772 6 3.25V3.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4.5 9V12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.75 9V12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9V12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.25 9V12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 9V12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
)

/**
 * @description UI Kit/Icon/Outline/端口资产
 */
export const OutlineModScanPortDataIcon = (props: Partial<CustomIconComponentProps>) => {
  return <Icon component={OutlineModScanPortData} {...props} />
}

const OutlinCompile = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M8.3335 18.3332H5.00016C4.55814 18.3332 4.13421 18.1576 3.82165 17.845C3.50909 17.5325 3.3335 17.1085 3.3335 16.6665V3.33317C3.3335 2.89114 3.50909 2.46722 3.82165 2.15466C4.13421 1.8421 4.55814 1.6665 5.00016 1.6665H12.0835L16.6668 6.24984V11.4582M11.6668 1.6665V6.6665H16.6668M16.221 14.1665L18.3335 16.2498L16.221 18.3332M12.946 18.3332L10.8335 16.2498L12.946 14.1665"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * @description  Icon/Outline/Outline编译
 */
export const OutlinCompileIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlinCompile} {...props} />
}

const ReloadScanIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 10L6.35355 11.6464C6.15829 11.8417 6.15829 12.1583 6.35355 12.3536L8 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M16 10L17.6464 11.6464C17.8417 11.8417 17.8417 12.1583 17.6464 12.3536L16 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M13 9L11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const OutlineReloadScanIcon = (props: Partial<IconProps>) => {
  return <Icon component={ReloadScanIcon} {...props} />
}

const ScanRuleEditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 10L6.35355 11.6464C6.15829 11.8417 6.15829 12.1583 6.35355 12.3536L8 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M16 10L17.6464 11.6464C17.8417 11.8417 17.8417 12.1583 17.6464 12.3536L16 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M13 9L11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const OutlineScanRuleEditIcon = (props: Partial<IconProps>) => {
  return <Icon component={ScanRuleEditIcon} {...props} />
}

const ConfiguredIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 6.07374C3 5.1801 3.59284 4.3949 4.45233 4.15019L11.4564 2.15601C11.8145 2.05403 12.1941 2.05408 12.5522 2.15615L19.5482 4.14993C20.4074 4.39481 21 5.17989 21 6.07335V9.82122C21 15.1343 17.6491 19.8741 12.6147 21.7841C12.2197 21.934 11.7829 21.934 11.3878 21.7841C6.35199 19.8741 3 15.1332 3 9.81878V6.07374Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 11.5L11 15L17 9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const OutlineConfiguredIcon = (props: Partial<IconProps>) => {
  return <Icon component={ConfiguredIcon} {...props} />
}

const UnConfiguredIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 6.07374C3 5.1801 3.59284 4.3949 4.45233 4.15019L11.4564 2.15601C11.8145 2.05403 12.1941 2.05408 12.5522 2.15615L19.5482 4.14993C20.4074 4.39481 21 5.17989 21 6.07335V9.82122C21 15.1343 17.6491 19.8741 12.6147 21.7841C12.2197 21.934 11.7829 21.934 11.3878 21.7841C6.35199 19.8741 3 15.1332 3 9.81878V6.07374Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 15.5V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M12 7.50024L12.0042 12.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const OutlineUnConfiguredIcon = (props: Partial<IconProps>) => {
  return <Icon component={UnConfiguredIcon} {...props} />
}

const Home = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" viewBox="0 0 20 22" fill="none">
    <path
      d="M1.30005 5.99805L10 10.998M10 10.998L18.7001 5.99805M10 10.998L10 20.998M19 6.99795C18.9996 6.64722 18.9071 6.30276 18.7315 5.99911C18.556 5.69546 18.3037 5.44331 18 5.26795L11 1.26795C10.696 1.09241 10.3511 1 10 1C9.64893 1 9.30404 1.09241 9 1.26795L2 5.26795C1.69626 5.44331 1.44398 5.69546 1.26846 5.99911C1.09294 6.30276 1.00036 6.64722 1 6.99795V14.9979C1.00036 15.3487 1.09294 15.6931 1.26846 15.9968C1.44398 16.3004 1.69626 16.5526 2 16.7279L9 20.7279C9.30404 20.9035 9.64893 20.9959 10 20.9959C10.3511 20.9959 10.696 20.9035 11 20.7279L18 16.7279C18.3037 16.5526 18.556 16.3004 18.7315 15.9968C18.9071 15.6931 18.9996 15.3487 19 14.9979V6.99795Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * @description   Outline/home
 */
export const HomeIcon = (props: Partial<IconProps>) => {
  return <Icon component={Home} {...props} />
}

const OutlineThought = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <g clipPath="url(#clip0_478_2653)">
      <path
        d="M4.26771 4.33411C4.10661 4.0545 4.01552 3.7401 4.00234 3.41768C3.99044 3.15136 4.03193 2.88535 4.12436 2.6353C4.21679 2.38524 4.3583 2.15619 4.54056 1.96162C4.72282 1.76704 4.94215 1.61088 5.18566 1.5023C5.42916 1.39372 5.69193 1.33492 5.95849 1.32937C6.22506 1.32381 6.49004 1.37161 6.73786 1.46995C6.98568 1.56829 7.21134 1.71518 7.40155 1.90199C7.59176 2.0888 7.74269 2.31176 7.84546 2.55775C7.94823 2.80373 8.00077 3.06778 7.99998 3.33437M7.99998 3.33437V11.9991M7.99998 3.33437C7.99919 3.06778 8.05185 2.80373 8.15463 2.55775C8.2574 2.31176 8.40832 2.0888 8.59854 1.90199C8.78875 1.71518 9.0144 1.56829 9.26222 1.46995C9.51004 1.37161 9.77502 1.32381 10.0416 1.32937C10.3082 1.33492 10.5709 1.39372 10.8144 1.5023C11.0579 1.61088 11.2773 1.76704 11.4595 1.96162C11.6418 2.15619 11.7833 2.38524 11.8757 2.6353C11.9682 2.88535 12.0096 3.15136 11.9977 3.41768C12.3896 3.51842 12.7533 3.70698 13.0615 3.9691C13.3696 4.23121 13.6141 4.56 13.7764 4.93057C13.9386 5.30113 14.0144 5.70376 13.998 6.10794C13.9816 6.51213 13.8734 6.90728 13.6816 7.26347M4.00234 3.41768C3.61051 3.51842 3.24674 3.70698 2.93859 3.9691C2.63044 4.23121 2.38598 4.56 2.22373 4.93057C2.06148 5.30113 1.98569 5.70376 2.00211 6.10794C2.01853 6.51213 2.12672 6.90728 2.31849 7.26347M2.7086 7.00016C2.57108 7.07647 2.44044 7.16416 2.31849 7.26347C1.98131 7.53736 1.71616 7.88948 1.54612 8.28919C1.37608 8.68891 1.30629 9.12411 1.34282 9.55694C1.37935 9.98977 1.52111 10.4071 1.75574 10.7727C1.99038 11.1382 2.3108 11.441 2.68912 11.6545M2.68912 11.6545C2.64241 12.0159 2.67029 12.383 2.77104 12.7332C2.8718 13.0834 3.04329 13.4093 3.27493 13.6906C3.50657 13.972 3.79343 14.2029 4.11781 14.369C4.44218 14.5352 4.79719 14.6331 5.16089 14.6567C5.52459 14.6803 5.88926 14.6291 6.2324 14.5062C6.57553 14.3834 6.88983 14.1915 7.1559 13.9425C7.42196 13.6934 7.63413 13.3924 7.77931 13.0582C7.92449 12.7239 7.99959 12.3635 7.99998 11.9991M2.68912 11.6545C3.08927 11.8801 3.54118 11.9992 4.00059 11.9989M7.99998 11.9991C8.00037 12.3635 8.07559 12.7239 8.22077 13.0582C8.36595 13.3924 8.57812 13.6934 8.84419 13.9425C9.11025 14.1915 9.42455 14.3834 9.76769 14.5062C10.1108 14.6291 10.4755 14.6803 10.8392 14.6567C11.2029 14.6331 11.5579 14.5352 11.8823 14.369C12.2066 14.2029 12.4935 13.972 12.7252 13.6906C12.9568 13.4093 13.1283 13.0834 13.229 12.7332C13.3298 12.383 13.3577 12.0159 13.311 11.6545M13.2916 7.00016C13.4291 7.07647 13.5596 7.16416 13.6816 7.26347C14.0188 7.53736 14.2839 7.88948 14.454 8.28919C14.624 8.68891 14.6938 9.12411 14.6573 9.55694C14.6207 9.98977 14.479 10.4071 14.2443 10.7727C14.0097 11.1382 13.6893 11.441 13.311 11.6545M13.311 11.6545C12.9108 11.8801 12.4591 11.9992 11.9997 11.9989M9.99991 8.66645C9.44026 8.4696 8.95155 8.11124 8.59559 7.63669C8.23963 7.16214 8.03239 6.5927 8.00009 6.00039C7.96779 6.5927 7.76056 7.16214 7.4046 7.63669C7.04863 8.11124 6.55993 8.4696 6.00027 8.66645M11.7325 4.33411C11.8938 4.05456 11.9851 3.74012 11.9985 3.41765"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_478_2653">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

/**
 * @description Outline/Thought Icon/Thought
 */
export const OutlineThoughtIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineThought} {...props} />
}

const OutlineBug = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <mask id="mask0_1_3136" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
      <rect width="24" height="24" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_1_3136)">
      <path
        d="M6.00012 10C6.00012 8.34315 7.34327 7 9.00012 7H15.0001C16.657 7 18.0001 8.34315 18.0001 10V15C18.0001 18.3137 15.3138 21 12.0001 21C8.68642 21 6.00012 18.3137 6.00012 15V10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M12 21V7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 13H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 13H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M15 6C15 4.34315 13.6569 3 12 3C10.3431 3 9 4.34315 9 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M21 6C21 7.65685 19.6569 9 18 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 21C3 19.3431 4.34315 18 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 6C3 7.65685 4.34315 9 6 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M21 21C21 19.3431 19.6569 18 18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  </svg>
)

/**
 * @description  Icon/Outline/Outlinebug
 */
export const OutlineBugIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineBug} {...props} />
}

const OutlineNotebook = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M2 6H6M2 10H6M2 14H6M2 18H6M16 2V22M6 2H18C19.1046 2 20 2.89543 20 4V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4C4 2.89543 4.89543 2 6 2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/*
 * @description Outline/Notebook
 */
export const OutlineNotebookIcon = (props: Partial<IconProps>) => {
  return <Icon component={OutlineNotebook} {...props} />
}
