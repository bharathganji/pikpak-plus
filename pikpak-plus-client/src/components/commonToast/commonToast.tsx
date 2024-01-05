import React, { useEffect } from 'react'
import { IonToast } from '@ionic/react'

const CommonToast: React.FC<{
  message: string
  color: string
  duration: number
  showToast: boolean
  setShowToast: React.Dispatch<React.SetStateAction<boolean>>
}> = ({ message, color, duration, showToast, setShowToast }) => {
  useEffect(() => {
    if (showToast) {
      const timeout = setTimeout(() => {
        setShowToast(false)
      }, duration)

      return () => clearTimeout(timeout)
    }
  }, [showToast, duration, setShowToast])

  return (
    <IonToast
      isOpen={showToast}
      onDidDismiss={() => setShowToast(false)}
      message={message}
      duration={duration}
      color={color}
    />
  )
}

export default CommonToast
