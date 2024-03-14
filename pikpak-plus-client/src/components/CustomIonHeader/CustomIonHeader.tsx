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
import { logOut } from 'ionicons/icons'
import { deleteCookie, deleteLocalStorage } from '../../helpers/helpers'

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
  useEffect(() => {}, [isLoading])

  async function signOut() {
    try {
      setIsLoading(true)
      deleteCookie('auth')
      deleteLocalStorage()
      setShowToast({ message: 'Sign-out successful', color: 'success' })
      window.location.href = '/login'
    } catch (error) {
      setShowToast({
        message: `Error during sign-out:, ${error}`,
        color: 'danger',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <IonHeader>
        <IonToolbar color="light">
          <IonTitle>{title}</IonTitle>
          <IonButton color={'danger'} slot="end" onClick={signOut}>
            Logout &nbsp;
            <IonIcon icon={logOut} size="icon-only" />
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
