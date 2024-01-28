import { useState } from 'react'
import {
  makeRequest,
  setCookie,
  setEmailandDirectory,
} from '../../../helpers/helpers'
import LoginCard from './LoginCard.tsx/LoginCard'
import { IonToast } from '@ionic/react'
import BlockUiLoader from '../../BlockUiLoader/BlockUiLoader'

function Login() {
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignInSuccess = (data, email) => {
    // Extract relevant information from the API response
    const { redirect, auth } = data
    fetchDirectory(email).then((data) => {
      const dir = data
      setCookie('auth', auth, 1) // Set the cookie to expire in 1 hour
      setEmailandDirectory(email, dir)
      window.location.href = redirect
    })
  }

  const fetchDirectory = async (email: string) => {
    try {
      const response = await makeRequest('getDirectoryId', 'POST', {
        email: email,
      })
      const data = response.data.directory_id
      return data
    } catch {
      console.log('error')
    }
    finally{
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      // Make a request to the login API endpoint using the common helper function
      setLoading(true)
      const response = await makeRequest('login', 'POST', {
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
        const data = response.data
        setShowToast({
          message: 'Sign-in successful',
          color: 'success',
        })
        handleSignInSuccess(data, email)
      }
    } catch (error) {
      setShowToast({
        message: `'Error during sign-in:', ${error}`,
        color: 'danger',
      })
    } 
  }

  return (
    <>
      <BlockUiLoader loading={loading}>
        <LoginCard callbackFunc={signIn} />
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

export default Login
