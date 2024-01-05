import { useState } from 'react'
// import { CONSTANTS } from '../../../constants/constants'
import {
  makeRequest,
  setCookie,
  setEmailandDirectory,
} from '../../../helpers/helpers'
import LoginCard from './LoginCard.tsx/LoginCard'
// import { useHistory } from 'react-router'
import { IonToast } from '@ionic/react'
import BlockUiLoader from '../../BlockUiLoader/BlockUiLoader'

function Login() {
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  // const history = useHistory()
  // useEffect(() => {
  //   deleteEmailandDirectory()
  // })

  const handleSignInSuccess = (data, email) => {
    // Extract relevant information from the API response
    const { redirect, auth, dir } = data

    // Set the access token in a cookie
    setCookie('auth', auth, 1) // Set the cookie to expire in 1 hour

    console.log(email, dir)

    setEmailandDirectory(email, dir)
    // Redirect the user to the specified URL
    window.location.href = redirect
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
