import React, { useRef, useState } from 'react'
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
  const emailRef = useRef<HTMLIonInputElement>(null)
  const passwordRef = useRef<HTMLIonInputElement>(null)
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)

  const handleSignIn = () => {
    const email = emailRef.current?.value || ''
    const password = passwordRef.current?.value || ''

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const passwordRegex = /^.{6,}$/

    if (!emailRegex.test(email.toString().trim())) {
      setShowToast({
        message: 'Invalid Email',
        color: 'danger',
      })
      return
    }

    if (!passwordRegex.test(password.toString())) {
      passwordRef.current!.value = '' // Clear the password field
      setShowToast({
        message: 'Password should be at least 6 characters',
        color: 'danger',
      })
      return
    }

    callbackFunc(email, password)
  }

  const handleOnSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    handleSignIn()
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
              autocomplete='on'
              fill="outline"
              ref={emailRef}
            />
            <IonInput
              placeholder="Enter Password"
              label="Password"
              labelPlacement="floating"
              fill="outline"
              type="password"
              ref={passwordRef}
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
          duration={2000}
          color={showToast?.color}
        />
      </IonCard>
    </div>
  )
}

export default AuthCard
