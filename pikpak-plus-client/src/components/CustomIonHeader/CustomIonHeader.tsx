import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonToast,
  IonProgressBar,
} from '@ionic/react'
import React, { useEffect, useState } from 'react'
import { moonOutline, sunnyOutline, powerOutline } from 'ionicons/icons'
import {
  deleteCookie,
  deleteLocalStorage,
  enableDarkMode,
  getItemFromLocalStorage,
  getWindowIsDarkThemeMode,
  setItemToLocalStorage,
} from '../../helpers/helpers'

interface CustomIonHeaderProps {
  title: string
}

const CustomIonHeader: React.FC<CustomIonHeaderProps> = ({ title }) => {
  // const email = localStorage.getItem('email')
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  let darkMode = getItemFromLocalStorage('darkMode')
  const initialDarkMode = getWindowIsDarkThemeMode()

  const getDarkModeIcon = (): string => {
    return darkMode === 'true' ? moonOutline : sunnyOutline
  }

  const [darkModeIcon, setDarkModeIcon] = useState(getDarkModeIcon())
  useEffect(() => {}, [isLoading])
  useEffect(() => {
    if (darkMode === null) {
      darkMode = initialDarkMode
      setDarkModeIcon(getDarkModeIcon())
      console.log('initialDarkMode', initialDarkMode)

      if (initialDarkMode === 'true') {
        setItemToLocalStorage('darkMode', 'true')
      } else {
        setItemToLocalStorage('darkMode', 'false')
      }
    }
    enableDarkMode()
  }, [])

  async function signOut() {
    try {
      setIsLoading(true)
      deleteCookie('auth')
      deleteLocalStorage()
      setShowToast({ message: 'Sign-out successful', color: 'success' })
      window.location.href = '/login'
    } catch (error) {
      setShowToast({
        message: `Error during  sign-out:, ${error}`,
        color: 'danger',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDarkMode = () => {
    darkMode = (darkMode !== 'true').toString()
    setItemToLocalStorage('darkMode', darkMode)
    setDarkModeIcon(getDarkModeIcon())
    enableDarkMode()
  }

  return (
    <>
      <IonHeader>
        <IonToolbar color="light">
          <IonTitle>{title}</IonTitle>
          <IonButton slot="end" fill="clear" onClick={toggleDarkMode}>
            <IonIcon
              color={darkMode === 'true' ? 'warning' : 'danger'}
              icon={darkModeIcon}
              slot="end"
              size="icon-only"
            />
          </IonButton>
          <IonButton
            color={'danger'}
            slot="end"
            onClick={signOut}
            aria-label="Logout"
          >
            <IonIcon icon={powerOutline} size="icon-only" />
          </IonButton>
        </IonToolbar>
        <IonProgressBar
          type="indeterminate"
          style={{ display: isLoading ? 'block' : 'none' }}
        />
      </IonHeader>

      <IonToast
        isOpen={!!showToast}
        onDidDismiss={() => setShowToast(null)}
        message={showToast?.message}
        duration={3000}
        color={showToast?.color}
      />
    </>
  )
}

export default CustomIonHeader
