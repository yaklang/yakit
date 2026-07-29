import React, { useEffect, useRef, useState } from 'react'
import { YaklangEngineMode } from '../../types'
import { Sparklines, SparklinesCurve } from 'react-sparklines'
import { UIEngineList } from '../UIEngineList'
import { yakitPerf } from '@/utils/electronBridge'
import styles from './PerformanceDisplay.module.scss'

interface PerformanceDisplayProps {
  engineMode: YaklangEngineMode | undefined
  typeCallback: (type: 'break') => any
  engineLink: boolean
}

export const PerformanceDisplay: React.FC<PerformanceDisplayProps> = React.memo((props) => {
  // cpu和内存可视图数据
  const [cpu, setCpu] = useState<number[]>([])

  const [showLine, setShowLine] = useState<boolean>(true)
  const showLineTime = useRef<any>(null)

  useEffect(() => {
    yakitPerf.startComputePercent()
    const time = setInterval(() => {
      yakitPerf.fetchComputePercent().then((res) => setCpu(res))
    }, 500)

    return () => {
      clearInterval(time)
      yakitPerf.clearComputePercent()
    }
  }, [])

  const onWinResize = (e: UIEvent) => {
    if (showLineTime.current) clearTimeout(showLineTime.current)
    showLineTime.current = setTimeout(() => {
      if (document) {
        const header = document.getElementById('yakit-header')
        if (header) {
          setShowLine(header.clientWidth >= 1000)
        }
      }
    }, 100)
  }

  useEffect(() => {
    if (window) {
      window.addEventListener('resize', onWinResize)
      return () => {
        window.removeEventListener('resize', onWinResize)
        if (showLineTime.current) clearTimeout(showLineTime.current)
        showLineTime.current = null
      }
    }
  }, [])

  return (
    <div className={styles['system-func-wrapper']}>
      <div className={styles['cpu-wrapper']}>
        <div className={styles['cpu-title']}>
          <span className={styles['title-headline']}> CPU </span>
          <span className={styles['title-content']}>{`${cpu[cpu.length - 1] || 0}%`}</span>
        </div>

        {showLine && (
          <div className={styles['cpu-spark']}>
            <Sparklines data={cpu} width={50} height={10} max={50}>
              <SparklinesCurve color="#85899E" />
            </Sparklines>
          </div>
        )}
      </div>
      <UIEngineList {...props} />
    </div>
  )
})
