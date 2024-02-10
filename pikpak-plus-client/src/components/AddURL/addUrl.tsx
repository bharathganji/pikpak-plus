import React, { useEffect, useState } from 'react'
import {
  IonToast,
  IonContent,
  IonIcon,
  IonText,
  IonButton,
  IonSpinner,
  IonProgressBar,
} from '@ionic/react'
import {
  addSharp,
  informationCircleOutline,
  sparklesOutline,
  star,
  flash,
  statsChart,
} from 'ionicons/icons'
import './addUrlForm.css'
import CustomInput from '../CustomInput/CustomInput'
import {
  bytesToGB,
  getEmailandDirectory,
  makeRequest,
} from '../../helpers/helpers'

import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'
import HelperCard from '../HelperCard/HelperCard'
import BlockUiLoader from '../BlockUiLoader/BlockUiLoader'
import { help, usefullLinks } from '../../constants/constants'
import { BaseResponseObjectType } from '../../types/sharedTypes'

const AddUrlForm: React.FC = () => {
  // const [text, setText] = useState<string>('')
  const [email, setEmail] = useState<string | null>(null)
  const [directory, setDirectory] = useState<string | null>(null)
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const [serverstats, setServerstats] = useState<BaseResponseObjectType | null>(
    null,
  )
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  useEffect(() => {
    const { email, dir } = getEmailandDirectory()
    setEmail(email)
    setDirectory(dir)
  }, [])

  const handleSubmit = async (text: string) => {
    setIsLoading(true)
    const isMagnetURL = /^magnet:\?xt=urn:btih:[0-9a-fA-F]{0,}$/i.test(text);
    if (!isMagnetURL) {
      setShowToast({
        message: 'Invalid magnet URL',
        color: 'danger',
      })
      setIsLoading(false)
      return
    }

    try {
      const response = await makeRequest('addURL', 'POST', {
        url: text,
        email: email,
        user_dir: directory,
      })
      const data = response.data.result

      if (data && data.upload_type === 'UPLOAD_TYPE_URL') {
        setShowToast({ message: 'Task added', color: 'success' })
      } else {
        setShowToast({ message: 'Error adding task', color: 'danger' })
      }
    } catch (error) {
      console.error('Error:', error)
      setShowToast({ message: 'Error adding task', color: 'danger' })
    } finally {
      setIsLoading(false)
    }
  }

  const usefullLinksList = usefullLinks.map((item, index) => (
    <div className="usefull-links" key={index}>
      <IonIcon color={'dark'} icon={item.icon} />
      <IonText key={index} color={'dark'}>
        <a
          href={item?.value}
          rel="noopener noreferrer"
          target="_blank"
          style={{ textDecoration: 'none', color: 'black', cursor: 'pointer' }}
        >
          &nbsp; {item?.link}
        </a>
      </IonText>
    </div>
  ))

  const helpList = help.map((item, index) => (
    <div className="usefull-links" key={index}>
      <IonText color={'dark'} key={index}>
        <IonIcon icon={star} /> {item}
      </IonText>
    </div>
  ))

  const colors = [
    'success',
    'tertiary',
    'primary',
    'secondary',
    'warning',
    'danger',
  ]
  const randomColor = colors[Math.floor(Math.random() * colors.length)]

  const ProgressBar = ({ value, size }: { value: number; size: number }) => (
    <>
      <IonProgressBar color={'secondary'} value={value / size} />
      <IonText>
        {value.toFixed(2)} GB / {size} GB
      </IonText>
    </>
  )

  const quotaDetails = (
    <>
      {isLoadingStats && serverstats ? (
        <IonSpinner name="lines"></IonSpinner>
      ) : (
        <>
          <IonText color={'dark'}>Cloud Download Traffic 40 TB / Month</IonText>
          <ProgressBar
            value={bytesToGB(serverstats?.offline?.size ?? 0)}
            size={40000}
          />
          <br />
          <IonText color={'dark'}>Downstream Traffic 4 TB / Month</IonText>
          <ProgressBar
            value={bytesToGB(serverstats?.download?.size ?? 0)}
            size={4000}
          />
        </>
      )}
    </>
  )

  const fetchServerstats = async () => {
    try {
      setIsLoadingStats(true)
      const response = await makeRequest('serverstats', 'GET', {})
      const data = response.data
      setServerstats(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

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
                handleSubmit={handleSubmit}
                icon={addSharp}
                customPlaceholder=" Enter magnet URL"
              />
            </div>
            <div className="container">
              <HelperCard
                cardTitle="Helper Card"
                cardSubtitle={helpList}
                cardSubTitleStyle={{
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'justify',
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
                  textAlign: 'justify',
                }}
                icon={flash}
                titleColor="success"
              />
              <HelperCard
                cardTitle="Transfer Quota Details"
                titleColor="tertiary"
                icon={statsChart}
                cardContent={
                  serverstats !== null ? (
                    quotaDetails
                  ) : (
                    <IonButton fill="outline" onClick={fetchServerstats}>
                      Load stats . . .
                    </IonButton>
                  )
                }
              />
            </div>

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
