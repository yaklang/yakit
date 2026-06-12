import Icon from '@ant-design/icons'
import { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'
import React from 'react'
import { v4 as uuidv4 } from 'uuid'

interface IconProps extends CustomIconComponentProps {
  onClick: (e: React.MouseEvent) => void
  ref?: any
}

const IRifyHomeGhost = () => {
  const id1 = uuidv4()
  const id2 = uuidv4()
  const id3 = uuidv4()
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="244" height="145" viewBox="0 0 244 145" fill="none">
      <g opacity="0.1">
        <path
          d="M223.275 124.247H244V20.7531H223.275V0H199.744V20.7531H223.275V124.247H199.654V145H223.275V124.247Z"
          fill={`url(#${id1})`}
        />
        <path
          d="M68.601 20.7531V0H0V20.7531H23.9832V124.247H0V145H68.601V124.247H44.7083V20.7531H68.601Z"
          fill={`url(#${id2})`}
        />
        <path
          d="M127.16 76.7591L165.352 145H184.629C185.082 144.994 185.526 144.871 185.917 144.642C186.309 144.413 186.634 144.086 186.862 143.694C187.09 143.301 187.213 142.856 187.218 142.402C187.223 141.949 187.111 141.5 186.892 141.103L150.147 75.3995C155.977 73.7758 161.347 70.8106 165.828 66.7397C170.31 62.6688 173.78 57.6055 175.96 51.9534C178.141 46.3013 178.972 40.217 178.387 34.1863C177.802 28.1555 175.817 22.3454 172.592 17.219C169.428 12.217 165.116 8.04467 160.015 5.04953C154.914 2.05439 149.173 0.322969 143.269 0H83.8092V145H104.535V76.9405L127.16 76.7591ZM104.535 56.0067V20.7529H142.998C144.944 20.8625 146.846 21.3692 148.589 22.242C150.333 23.1147 151.879 24.335 153.134 25.8279C155.435 28.4132 156.947 31.6046 157.493 35.0237C158.039 38.4428 157.595 41.9465 156.215 45.1211C154.834 48.2958 152.575 51.009 149.703 52.938C146.831 54.8669 143.468 55.9318 140.011 56.0067H104.535Z"
          fill={`url(#${id3})`}
        />
      </g>
      <defs>
        <linearGradient id={id1} x1="244" y1="-2.86955e-07" x2="214.643" y2="178.348" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E1DAEE" />
          <stop offset="1" stopColor="#7957B2" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={id2} x1="244" y1="-2.86955e-07" x2="214.643" y2="178.348" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E1DAEE" />
          <stop offset="1" stopColor="#7957B2" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={id3} x1="244" y1="-2.86955e-07" x2="214.643" y2="178.348" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E1DAEE" />
          <stop offset="1" stopColor="#7957B2" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  )
}
export const IRifyHomeGhostIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyHomeGhost} {...props} />
}

const IRifyDivergency = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="303" height="224" viewBox="0 0 303 224" fill="none">
      <g filter="url(#filter0_f_52129_126008)">
        <ellipse cx="206.5" cy="49.5" rx="76.5" ry="49.5" fill="#DC5CDF" />
      </g>
      <defs>
        <filter
          id="filter0_f_52129_126008"
          x="0"
          y="-130"
          width="413"
          height="359"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="65" result="effect1_foregroundBlur_52129_126008" />
        </filter>
      </defs>
    </svg>
  )
}

export const IRifyDivergencyIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyDivergency} {...props} />
}

const IRifyHomeSerious = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="24" viewBox="0 0 6 24" fill="none">
      <rect x="0.5" y="0.5" width="5" height="23" stroke="#B93939" />
      <rect x="1" y="21" width="4" height="2" fill="#B93939" />
    </svg>
  )
}

export const IRifyHomeSeriousIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyHomeSerious} {...props} />
}

const IRifyHomeHigh = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="24" viewBox="0 0 6 24" fill="none">
      <rect x="0.5" y="0.5" width="5" height="23" stroke="#F15757" />
      <rect x="0.5" y="21" width="5" height="2" fill="#F15757" />
    </svg>
  )
}

export const IRifyHomeHighIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyHomeHigh} {...props} />
}

const IRifyHomeMedium = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="24" viewBox="0 0 6 24" fill="none">
      <rect x="0.5" y="0.5" width="5" height="23" stroke="#F6A823" />
      <rect x="1" y="9" width="4" height="14" fill="#F6A823" />
    </svg>
  )
}

export const IRifyHomeMediumIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyHomeMedium} {...props} />
}

const IRifyHomeLow = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="24" viewBox="0 0 6 24" fill="none">
      <rect x="0.5" y="0.5" width="5" height="23" stroke="#FFCE1E" />
      <rect x="1" y="9" width="4" height="14" fill="#FFCE1E" />
    </svg>
  )
}

export const IRifyHomeLowIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyHomeLow} {...props} />
}

const IRifyQuickAccessJavaDecompiler = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path
      d="M23.2728 4.18189C23.3732 4.18189 23.4546 4.26329 23.4546 4.3637C23.4546 4.46412 23.3732 4.54552 23.2728 4.54552L8.00006 4.54552C7.89964 4.54552 7.81824 4.46412 7.81824 4.3637C7.81824 4.26329 7.89964 4.18188 8.00006 4.18188L23.2728 4.18189Z"
      fill="#353639"
    />
    <path
      d="M24.7273 5.63648C24.8277 5.63648 24.9091 5.71788 24.9091 5.81829C24.9091 5.91871 24.8277 6.00011 24.7273 6.00011L6.54547 6.00011C6.44505 6.00011 6.36365 5.91871 6.36365 5.81829C6.36365 5.71788 6.44505 5.63647 6.54547 5.63647L24.7273 5.63648Z"
      fill="#353639"
    />
    <path
      d="M26.5455 20.3637V8.72736C26.5455 8.12487 26.0571 7.63645 25.4546 7.63645H6.54548C5.94298 7.63645 5.45457 8.12487 5.45457 8.72736V20.3637C5.45457 20.5646 5.29176 20.7274 5.09093 20.7274C4.8901 20.7274 4.72729 20.5646 4.72729 20.3637V8.72736C4.72729 7.72321 5.54132 6.90918 6.54548 6.90918H25.4546C26.4587 6.90918 27.2727 7.72321 27.2727 8.72736V20.3637C27.2727 20.5646 27.1099 20.7274 26.9091 20.7274C26.7083 20.7274 26.5455 20.5646 26.5455 20.3637Z"
      fill="#353639"
    />
    <path
      d="M8.57312 26.3479C8.57308 27.0634 8.42449 27.5867 8.12781 27.9358C7.79622 28.3023 7.27289 28.4855 6.54871 28.4856C5.92034 28.4856 5.43997 28.3112 5.11707 27.9622C4.78544 27.6131 4.62 27.1326 4.62 26.5217V26.3215H5.6405V26.5139C5.64064 27.2292 5.94679 27.5872 6.56628 27.5872C6.90637 27.5871 7.15926 27.4821 7.31628 27.2815C7.47337 27.0808 7.55163 26.7578 7.55164 26.3127V22.1321H8.57312V26.3479ZM15.1102 28.3635H14.0194L13.452 26.801H10.8427L10.2753 28.3635H9.18445L11.5673 22.1321H12.7274L15.1102 28.3635ZM17.9706 27.2112H17.9969L19.7069 22.1321H20.8153L18.5985 28.3635H17.368L15.1512 22.1321H16.2596L17.9706 27.2112ZM26.787 28.3635H25.6952L25.1288 26.801H22.5194L21.952 28.3635H20.8612L23.243 22.1321H24.4042L26.787 28.3635ZM11.1483 25.9631H13.1464L12.1698 23.2317H12.1346L11.1483 25.9631ZM22.8241 25.9631H24.8231L23.8456 23.2317H23.8104L22.8241 25.9631Z"
      fill="#7957B2"
    />
    <path
      d="M16.9773 12.743C17.1695 12.8007 17.2785 13.0031 17.2209 13.1954L15.4758 19.0136L15.4474 19.0818C15.3673 19.2307 15.191 19.3077 15.0227 19.2572C14.8304 19.1994 14.7214 18.9971 14.7791 18.8048L16.5241 12.9866C16.5818 12.7942 16.7849 12.6853 16.9773 12.743ZM13.2102 14.2252C13.3592 14.1452 13.5487 14.1777 13.6612 14.3126C13.7898 14.4669 13.7686 14.6961 13.6143 14.8247L12.2038 16.0001L13.6143 17.1755L13.6662 17.2281C13.7717 17.3602 13.7737 17.5526 13.6612 17.6876C13.5487 17.8225 13.3592 17.855 13.2102 17.7749L13.1491 17.7338L11.4034 16.2792C11.3206 16.2101 11.2727 16.1079 11.2727 16.0001C11.2727 15.8923 11.3206 15.7901 11.4034 15.721L13.1491 14.2664L13.2102 14.2252ZM18.3388 14.3126C18.4513 14.1777 18.6408 14.1452 18.7898 14.2252L18.8508 14.2664L20.5966 15.721C20.6793 15.7901 20.7273 15.8923 20.7273 16.0001C20.7273 16.1079 20.6793 16.2101 20.5966 16.2792L18.8508 17.7338C18.6966 17.8623 18.4673 17.8418 18.3388 17.6876C18.2102 17.5333 18.2313 17.3041 18.3856 17.1755L19.7954 16.0001L18.3856 14.8247L18.3338 14.7721C18.2283 14.64 18.2263 14.4475 18.3388 14.3126Z"
      fill="#353639"
    />
    <path
      d="M5.09094 8.72725C5.09094 7.92393 5.74216 7.27271 6.54549 7.27271H25.4546C26.2579 7.27271 26.9091 7.92393 26.9091 8.72725V10.1818H5.09094V8.72725Z"
      fill="#7957B2"
    />
    <path
      d="M26.5455 8.72736C26.5455 8.12487 26.0571 7.63645 25.4546 7.63645H6.54548C5.94298 7.63645 5.45457 8.12487 5.45457 8.72736V9.81827H26.5455V8.72736ZM27.2727 10.5455H4.72729V8.72736C4.72729 7.72321 5.54132 6.90918 6.54548 6.90918H25.4546C26.4587 6.90918 27.2727 7.72321 27.2727 8.72736V10.5455Z"
      fill="#353639"
    />
    <path
      d="M6.94811 8.36353L7.02126 8.37063C7.18701 8.4045 7.31175 8.5514 7.31175 8.72716C7.31175 8.90292 7.18701 9.04982 7.02126 9.0837L6.94811 9.0908H6.90905C6.70822 9.0908 6.54541 8.92799 6.54541 8.72716C6.54541 8.52633 6.70822 8.36353 6.90905 8.36353H6.94811ZM8.58447 8.36353L8.65763 8.37063C8.82337 8.4045 8.94811 8.5514 8.94811 8.72716C8.94811 8.90292 8.82337 9.04982 8.65763 9.0837L8.58447 9.0908H8.50635C8.30556 9.09074 8.14271 8.92796 8.14271 8.72716C8.14271 8.52636 8.30556 8.36358 8.50635 8.36353H8.58447ZM10.1818 8.36353C10.3826 8.36353 10.5454 8.52633 10.5454 8.72716C10.5454 8.92799 10.3826 9.0908 10.1818 9.0908H10.1427C9.94193 9.09074 9.77907 8.92796 9.77907 8.72716C9.77907 8.52636 9.94193 8.36358 10.1427 8.36353H10.1818Z"
      fill="#353639"
    />
  </svg>
)

export const IRifyQuickAccessJavaDecompilerIcon = (props: Partial<IconProps>) => {
  return <Icon component={IRifyQuickAccessJavaDecompiler} {...props} />
}
