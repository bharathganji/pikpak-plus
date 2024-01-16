import React, { useEffect, useState } from 'react'
import { IonToast, IonContent, IonIcon, IonText } from '@ionic/react'
import {
  addSharp,
  informationCircleOutline,
  sparklesOutline,
  star,
  flash,
} from 'ionicons/icons'
import './addUrlForm.css'
import CustomInput from '../CustomInput/CustomInput'
import {
  getEmailandDirectory,
  help,
  makeRequest,
  usefullLinks,
} from '../../helpers/helpers'
import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'
import HelperCard from '../HelperCard/HelperCard'
import BlockUiLoader from '../BlockUiLoader/BlockUiLoader' // Import BlockUiLoader

const AddUrlForm: React.FC = () => {
  const [text, settext] = useState<string>('')
  const [email, setEmail] = useState<string | null>(null)
  const [directory, setDirectory] = useState<string | null>(null)
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false) // Add loading state

  const handleTextChange = (value: string) => {
    settext(value!)
  }

  useEffect(() => {
    const { email, dir } = getEmailandDirectory()
    setEmail(email)
    setDirectory(dir)
  }, [])

  useEffect(() => {
    console.log(directory)
  }, [directory])

  const handleSubmit = async () => {
    // Set loading to true
    setIsLoading(true)

    // Check if the input is a valid magnet URL
    const isMagnetURL = /^magnet:\?xt=urn:btih:[0-9a-fA-F]{40}/.test(text)

    if (!isMagnetURL) {
      // If not a valid magnet URL, show the toast and return
      setShowToast({
        message: 'Invalid magnet URL. Please enter a valid magnet URL.',
        color: 'danger',
      })
      // Set loading to false
      setIsLoading(false)
      return
    }

    try {
      // Make a request to the API endpoint using the common helper function
      const response = await makeRequest('addURL', 'POST', {
        url: text,
        user_dir: directory,
      })

      // Handle the API response as needed
      const data = response.data.result

      // Check if the response indicates success
      console.log(data.upload_type)
      if (data && data.upload_type === 'UPLOAD_TYPE_URL') {
        // Display a green toast for success
        setShowToast({ message: 'Task added', color: 'success' })

        // Clear the input field
        settext('')
      } else {
        // Display a red toast for other cases
        setShowToast({ message: 'Error adding task', color: 'danger' })
      }
    } catch (error) {
      console.error('Error:', error)
      // Display a red toast for errors
      setShowToast({ message: 'Error adding task', color: 'danger' })
    } finally {
      // Set loading to false regardless of success or failure
      setIsLoading(false)
    }
  }

  const usefullLinksList = usefullLinks.map((item, index) => (
    <IonText key={index}>
      <IonIcon icon={item.icon} />
      <a
        href={item?.value}
        target="_blank"
        style={{ textDecoration: 'none', color: 'black', cursor: 'pointer' }}
      >
        &nbsp; {item?.link}
      </a>
    </IonText>
  ))
  const helpList = help.map((item, index) => (
    <IonText key={index}>
      <IonIcon icon={star} /> {item}
    </IonText>
  ))

  const colors = ['success', 'tertiary', 'primary', 'secondary', 'warning']
  const randomColor = colors[Math.floor(Math.random() * colors.length)]

  return (
    <>
      <CustomIonHeader title="Create Cloud Task" />

      <IonContent fullscreen={true}>
        <BlockUiLoader loading={isLoading}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: '6rem',
            }}
          >
            <div className="custom-container">
              <div className="container-welcome">
                <span className="email-welcome">
                  <IonText>
                    <span>
                      Welcome..
                      <IonIcon
                        color={randomColor}
                        size="default"
                        icon={sparklesOutline}
                      />
                    </span>
                  </IonText>
                </span>
                {email}
              </div>
              <CustomInput
                text={text}
                handleTextChange={handleTextChange}
                handleSubmit={handleSubmit}
                icon={addSharp}
                customPlaceholder=" Enter magnet URL"
              />
            </div>
            <HelperCard
              cardTitle="Helper Card"
              cardSubtitle={helpList}
              cardSubTitleStyle={{
                display: 'flex',
                flexDirection: 'column',
              }}
              icon={informationCircleOutline}
              titleColor="primary"
            />
            <HelperCard
              cardTitle="Useful Links"
              cardSubtitle={usefullLinksList}
              cardSubTitleStyle={{
                display: 'flex',
                flexDirection: 'column',
              }}
              icon={flash}
              titleColor="success"
            />
            <IonToast
              isOpen={!!showToast}
              onDidDismiss={() => setShowToast(null)}
              message={showToast?.message}
              duration={3000}
              color={showToast?.color}
            />
          </div>
        </BlockUiLoader>
      </IonContent>
    </>
  )
}

export default AddUrlForm
