import { useState } from 'react'
import {
  formatFileSize,
  makeRequest,
  setCookie,
  setEmailandDirectory,
} from '../../../helpers/helpers'
import LoginCard from './LoginCard.tsx/LoginCard'
import { IonToast } from '@ionic/react'
import BlockUiLoader from '../../BlockUiLoader/BlockUiLoader'
import { TASK_LIST } from '../../../constants/constants'

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

  localStorage.setItem('TASK_LIST', JSON.stringify(TASK_LIST))

  const count = TASK_LIST.files.filter(
    (task) => task.parent_id === 'VNpZ2t9yyuyWG6TT7EGylYp2o1',
  ).length

  console.log('count', count)
  let totalSize = 0
  let fileCount = 0

  function calculateFolderSize(folderId) {
    TASK_LIST.files.forEach((task) => {
      if (task.parent_id === folderId) {
        if (task.kind === 'drive#folder') {
          calculateFolderSize(task.id) // Recursively search subfolders
        } else {
          totalSize += parseInt(task.size) || 0
          fileCount++ // Increment file count
        }
      }
    })
  }

  TASK_LIST.files.forEach((task) => {
    if (task.parent_id === 'VNpZ2t9yyuyWG6TT7EGylYp2o1') {
      if (task.kind === 'drive#folder') {
        calculateFolderSize(task.id) // Start recursive search for subfolders
      } else {
        totalSize += parseInt(task.size) || 0
        fileCount++ // Increment file count
      }
    }
  })

  console.log('File Count:', fileCount)

  console.log(formatFileSize(totalSize))

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
