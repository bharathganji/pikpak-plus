import { useState } from 'react'
import {
  makeRequest,
  setCookie,
  setEmailandDirectory,
} from '../../../helpers/helpers'
import LoginCard from './LoginCard.tsx/LoginCard'
import { IonToast } from '@ionic/react'
import BlockUiLoader from '../../BlockUiLoader/BlockUiLoader'
import AuthButtons from '../AuthButtons/AuthButtons'

function Login() {
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignInSuccess = (data, email) => {
    const { redirect, auth, dir } = data

    setCookie('auth', auth, 2) // Set the cookie to expire in 2 hour
    setEmailandDirectory(email, dir)
    fetchServers(redirect)
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
    } finally {
      setLoading(false)
    }
  }

  const fetchServers = async (redirect) => {
    try {
      setLoading(true)
      const response = await makeRequest('getServers', 'GET', {})
      const data = response.data
      localStorage.setItem('serverOptions', JSON.stringify(data))

      const values = Object.values(data)
      const firstElement = values[0] as any
      const selectedServer = localStorage.getItem('selectedServer')
      // Check if selectedServer is not already set in local storage
      if (selectedServer === null || selectedServer === '') {
        // If not set, set the ID of the first server as the default
        firstElement &&
          localStorage.setItem('selectedServer', firstElement.server_id)
      }
      window.location.href = redirect
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <BlockUiLoader loading={loading}>
        <AuthButtons />
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
