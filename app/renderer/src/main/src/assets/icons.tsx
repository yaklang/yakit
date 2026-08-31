import type React from 'react'
import Icon from '@ant-design/icons'
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon'

export { LineConversionIcon } from './icons/lineConversion'
export { LineMenunIcon } from './icons/lineMenu'
export { SelectIcon } from './icons/select'
export { ControlMyselfIcon, ControlOtherIcon } from './icons/dynamicControl'
export { TraceSvgSvgIcon } from './icons/traceSvg'

const OnlineComment = () => (
  <svg width="1em" height="1em" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <title>切片</title>
    <defs>
      <polygon id="path-1" points="2.98427553e-16 0 14 0 14 14 2.98427553e-16 14"></polygon>
    </defs>
    <g id="页面-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <g id="官网/资源/插件详情页-蓝色" transform="translate(-1451.000000, -854.000000)">
        <g id="用户评论" transform="translate(384.000000, 622.000000)">
          <g id="编组-5" transform="translate(0.000000, 176.000000)">
            <g id="其他/插件卡片/下载量备份" transform="translate(1065.000000, 54.000000)">
              <g id="icon/基础/star-默认" transform="translate(2.000000, 2.000000)">
                <g id="编组" transform="translate(1.000000, 1.000000)">
                  <mask id="mask-2" fill="white">
                    <use xlinkHref="#path-1"></use>
                  </mask>
                  <g id="Clip-2"></g>
                  <path
                    d="M4.65166922,9.82696164 C4.42646552,9.6443459 4.39202557,9.31372235 4.57464132,9.08851866 C4.75734108,8.86331497 5.08796464,8.82887502 5.31316834,9.01149077 C5.31644434,9.01417877 5.31972033,9.01695076 5.32299633,9.01972276 C5.7936477,9.41191822 6.38727491,9.62620192 6.9999701,9.62502592 C7.62156927,9.62502592 8.20872849,9.40889422 8.67652387,9.01989076 C8.89945958,8.83450301 9.23050314,8.86499497 9.41589089,9.08793066 C9.60127864,9.31086636 9.57078669,9.6419099 9.34776698,9.82729764 C8.68861986,10.3761529 7.85769296,10.6761165 6.9999701,10.6750279 C6.14199524,10.6762005 5.31090035,10.3760689 4.65166922,9.82696164 Z M2.2564124,10.988092 L1.97333278,12.0266666 L3.0119074,11.743587 C3.14765122,11.7064591 3.29263503,11.725443 3.41426687,11.7962549 C3.59159063,11.8990708 3.76849439,12.0027266 3.94497816,12.1070545 C4.86780093,12.6604457 5.92401553,12.9519253 6.9999701,12.9500029 C10.2861297,12.9500029 12.9500182,10.286189 12.9500182,7.00002954 C12.9500182,3.71387008 10.2861297,1.04998175 6.9999701,1.04998175 C3.71381047,1.04998175 1.05000601,3.71387008 1.05000601,7.00002954 C1.05000601,7.99400017 1.29360568,8.95159885 1.75266507,9.80772567 C1.81356499,9.92112551 1.96468079,10.1821972 2.20164448,10.5826246 C2.27405238,10.7047604 2.29379235,10.8510882 2.2564124,10.988092 Z M1.18507783,10.9259321 C1.00447807,10.6193326 0.886206224,10.4137008 0.827406302,10.303997 C0.282667026,9.28801839 -0.00167259625,8.15284395 1.86517468e-14,7.00002954 C1.86517468e-14,3.13410288 3.13404324,-1.67999768e-05 6.9999701,-1.67999768e-05 C10.865897,-1.67999768e-05 14.0000168,3.13410288 14.0000168,7.00002954 C14.0000168,10.8659562 10.865897,14 6.9999701,14 C5.73375578,14.0019239 4.49089343,13.6587004 3.40494288,13.0073653 C3.29557502,12.9426013 3.18587117,12.8782574 3.07599931,12.8144175 L1.36307359,13.2816249 C0.971046111,13.3883887 0.611610589,13.0287852 0.718542447,12.6369258 L1.18507783,10.9259321 Z"
                    id="Fill-1"
                    fill="currentColor"
                  ></path>
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  </svg>
)

export const OnlineCommentIcon: React.FC = (props: any) => {
  return <Icon component={OnlineComment} {...props} />
}

const Import = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <path
        d="M8 7H5C3.89543 7 3 7.89543 3 9V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7H16M15 11L12 14M12 14L9 11M12 14L12 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
)

export const ImportIcon: React.FC = (props: any) => {
  return <Icon component={Import} {...props} />
}
