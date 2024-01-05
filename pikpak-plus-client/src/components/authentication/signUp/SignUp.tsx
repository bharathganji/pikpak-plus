import { useState } from 'react'
import { CONSTANTS } from '../../../constants/constants'
import SignUpCard from './SignUpCard/SignUpCard'
import { IonToast } from '@ionic/react'
import BlockUiLoader from '../../BlockUiLoader/BlockUiLoader'

function SignUp() {
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  async function signUp(email: string, password: string) {
    try {
      setLoading(true)
      const response = await fetch(`${CONSTANTS.api_url}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Ping failed:', errorData.error)
      } else {
        const successData = await response.json()
        console.log('Ping successful:', successData.result)
        setShowToast({
          message: successData.result + ', check your mail',
          color: 'success',
        })
      }
    } catch (error) {
      setShowToast({
        message: error as any,
        color: 'danger',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <BlockUiLoader loading={loading}>
        <SignUpCard callbackFunc={signUp} />
      </BlockUiLoader>

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

export default SignUp
