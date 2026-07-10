import React from 'react'
import styles from './RobotControl.module.scss'

export interface RobotQrCodePlaceholderProps {
  /** @name 二维码内容，接口接入后传入真实链接 */
  value?: string
}

export const RobotQrCodePlaceholder: React.FC<RobotQrCodePlaceholderProps> = (props) => {
  const { value } = props

  return (
    <div className={styles['robot-scan-qr-box']}>
      {value ? (
        <img src={value} alt="" className={styles['robot-scan-qr-svg']} />
      ) : (
        <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className={styles['robot-scan-qr-svg']}>
          <rect width="120" height="120" fill="#fff" />
          <rect x="8" y="8" width="32" height="32" fill="#111" />
          <rect x="12" y="12" width="24" height="24" fill="#fff" />
          <rect x="16" y="16" width="16" height="16" fill="#111" />
          <rect x="80" y="8" width="32" height="32" fill="#111" />
          <rect x="84" y="12" width="24" height="24" fill="#fff" />
          <rect x="88" y="16" width="16" height="16" fill="#111" />
          <rect x="8" y="80" width="32" height="32" fill="#111" />
          <rect x="12" y="84" width="24" height="24" fill="#fff" />
          <rect x="16" y="88" width="16" height="16" fill="#111" />
          {[
            [48, 8],
            [56, 8],
            [64, 8],
            [48, 16],
            [64, 24],
            [48, 32],
            [56, 40],
            [64, 48],
            [48, 56],
            [72, 56],
            [80, 48],
            [96, 48],
            [104, 56],
            [88, 64],
            [96, 72],
            [104, 80],
            [48, 64],
            [56, 72],
            [48, 80],
            [56, 88],
            [64, 96],
            [72, 104],
            [80, 96],
            [96, 96],
            [104, 104],
          ].map(([x, y], index) => (
            <rect key={index} x={x} y={y} width="8" height="8" fill="#111" />
          ))}
        </svg>
      )}
    </div>
  )
}
