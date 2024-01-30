import { useState } from 'react'
import SignUpCard from './SignUpCard/SignUpCard'
import { IonToast } from '@ionic/react'
import BlockUiLoader from '../../BlockUiLoader/BlockUiLoader'
import { makeRequest } from '../../../helpers/helpers'

function SignUp() {
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  async function signUp(email: string, password: string) {
    try {
      setLoading(true)
      const response = await makeRequest('signup', 'POST', {
        email: email,
        password: password,
      })

      if (response.status !== 200) {
        const errorData = response.data
        setShowToast({
          message: errorData.error,
          color: 'danger',
        })
      } else {
        const successData = await response.data
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
