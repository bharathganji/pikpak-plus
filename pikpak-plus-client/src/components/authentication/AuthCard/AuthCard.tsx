import React, { useState } from 'react'
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonInput,
  IonButton,
  IonIcon,
  IonToast,
} from '@ionic/react'
import './AuthCard.css'
import { logInOutline, personCircleOutline } from 'ionicons/icons'

// @ts-expect-error Description of why the @ts-expect-error is necessary
import { ReactComponent as Logo } from '../../../assets/pikpkak_plus.svg'

type nextTitleType = {
  text: string
  redirect: string
}

type AuthProps = {
  titleHeading: string
  nextTitle: nextTitleType
  callbackFunc: any
}

const AuthCard: React.FC<AuthProps> = ({
  titleHeading,
  nextTitle,
  callbackFunc,
}: AuthProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)

  const handleSignIn = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const passwordRegex = /^.{6,}$/

    if (!emailRegex.test(email)) {
      setShowToast({
        message: 'Invalid Email',
        color: 'danger',
      })
      return
    }

    if (!passwordRegex.test(password)) {
      setPassword('')
      setShowToast({
        message: 'Password should be at least 6 characters',
        color: 'danger',
      })
      return
    }

    callbackFunc(email, password)
  }
  const handleOnSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (email && password) {
      event.preventDefault()
      handleSignIn()
    }
  }

  return (
    <div className="backg">
      <Logo />
      <IonCard color="light" className="custom-auth-container ">
        <IonCardHeader className="content-container">
          <IonCardTitle className="content-container-title">
            {titleHeading}
            <IonIcon size={'default'} icon={personCircleOutline}></IonIcon>
          </IonCardTitle>
          <IonCardSubtitle>Enter your credentials</IonCardSubtitle>
        </IonCardHeader>

        <form onSubmit={handleOnSubmit}>
          <IonCardContent className="content-container">
            <IonInput
              placeholder="Enter Email"
              label="Email"
              labelPlacement="floating"
              fill="outline"
              value={email}
              onIonInput={(e) => setEmail(e.detail.value!)}
            />
            <IonInput
              placeholder="Enter Password"
              label="Password"
              labelPlacement="floating"
              fill="outline"
              type="password"
              value={password}
              onIonChange={(e) => setPassword(e.detail.value!)}
            />
            <IonButton
              shape="round"
              expand="full"
              color={'tertiary'}
              type="submit"
            >
              Submit
            </IonButton>
            <IonButton
              fill="clear"
              expand="full"
              color={'tertiary'}
              shape="round"
              className="content-container-title1"
              href={nextTitle.redirect}
            >
              <span>{nextTitle.text}</span>
              <IonIcon icon={logInOutline}></IonIcon>
            </IonButton>
          </IonCardContent>
        </form>

        <IonToast
          isOpen={!!showToast}
          onDidDismiss={() => setShowToast(null)}
          message={showToast?.message}
          duration={3000}
          color={showToast?.color}
        />
      </IonCard>
    </div>
  )
}

export default AuthCard
