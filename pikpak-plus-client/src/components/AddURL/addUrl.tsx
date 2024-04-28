import React, { useEffect, useState } from 'react'
import {
  IonToast,
  IonContent,
  IonIcon,
  IonText,
  IonButton,
  IonSpinner,
  IonProgressBar,
  IonItemDivider,
} from '@ionic/react'
import {
  addSharp,
  informationCircleOutline,
  sparklesOutline,
  star,
  flash,
  statsChart,
  cloudOutline,
  calendarClearOutline,
  helpCircleOutline,
  arrowRedoOutline,
} from 'ionicons/icons'
import './addUrlForm.css'
import CustomInput from '../CustomInput/CustomInput'
import {
  bytesToGB,
  bytesToTiB,
  calculateDriveInfo,
  getEmailandDirectory,
  getSelectedServer,
  getServerExpireDate,
  makeRequest,
} from '../../helpers/helpers'
import GitHubButton from 'react-github-btn'
import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'
import HelperCard from '../HelperCard/HelperCard'
import BlockUiLoader from '../BlockUiLoader/BlockUiLoader'
import { help, usefullLinks } from '../../constants/constants'
import { BaseResponseObjectType } from '../../types/sharedTypes'

const AddUrlForm: React.FC = () => {
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

    // Regular expressions for different link formats
    const magnetRegex = /magnet:\?xt=urn:btih:[a-zA-Z0-9]*/
    const twitterRegex = /https?:\/\/(www\.)?twitter\.com\/.*/
    const tiktokRegex = /https?:\/\/(www\.)?tiktok\.com\/.*/
    const facebookRegex = /https?:\/\/(www\.)?facebook\.com\/.*/

    // Split the text into an array of links and remove empty values and duplicates
    const links = Array.from(
      new Set(
        text
          .split('\n')
          .map((link) => link.trim())
          .filter((link) => link !== ''),
      ),
    )

    let isValidLinks = true

    // Validate all links
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      let isValid = false

      if (
        magnetRegex.test(link) ||
        twitterRegex.test(link) ||
        tiktokRegex.test(link) ||
        facebookRegex.test(link)
      ) {
        isValid = true
      }

      if (!isValid) {
        setShowToast({
          message: 'Invalid link format at link number ' + (i + 1),
          color: 'danger',
        })
        isValidLinks = false
        break // Exit the loop if any link is invalid
      }
    }

    if (isValidLinks) {
      // All links are valid, proceed to make API calls
      for (let i = 0; i < links.length; i++) {
        try {
          const response = await makeRequest('addURL', 'POST', {
            url: links[i],
            email: email,
            user_dir: directory,
          })
          const data = response.data.result

          if (data && data.upload_type === 'UPLOAD_TYPE_URL') {
            setShowToast({
              message: 'Task Created for link number ' + (i + 1),
              color: 'success',
            })
          } else {
            setShowToast({
              message: 'Error adding task for link number ' + (i + 1),
              color: 'danger',
            })
          }
        } catch (error) {
          console.error('Error adding task for link number', i + 1, ':', error)
          setShowToast({
            message: 'Error adding task for link number ' + (i + 1),
            color: 'danger',
          })
        }
      }
    }

    setIsLoading(false)
  }

  const usefullLinksList = usefullLinks.map((item, index) => (
    <div className="usefull-links" key={index}>
      <IonIcon color={'dark'} icon={item.icon} />
      <IonText key={index} color={'dark'}>
        <a href={item?.value} rel="noopener noreferrer" target="_blank">
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
      const response = await makeRequest('serverstats', 'POST', {})
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
                <IonItemDivider style={{ visibility: 'hidden' }} />
                <IonText className="text-flex-style">
                  <span>
                    <IonIcon color={'dark'} icon={cloudOutline} /> &nbsp;
                    {bytesToTiB(calculateDriveInfo()?.available || 0) +
                      ' / ' +
                      bytesToTiB(calculateDriveInfo()?.limit || 0)}
                    &nbsp;
                    {'used'} &nbsp;
                  </span>
                  <span>
                    <IonIcon color={'dark'} icon={calendarClearOutline} />
                    &nbsp;
                    {'Expiry: ' +
                      (getServerExpireDate(getSelectedServer()) ||
                        'Contact Admin')}
                  </span>
                </IonText>
                <div className="github-btn-container">
                  <GitHubButton
                    href="https://github.com/sponsors/bharathganji"
                    data-color-scheme="no-preference: light; light: light; dark: dark;"
                    data-icon="octicon-heart"
                    data-size="large"
                    aria-label="Sponsor @bharathganji on GitHub"
                  >
                    Sponsor
                  </GitHubButton>
                  <GitHubButton
                    href="https://github.com/bharathganji/pikpak-plus"
                    data-color-scheme="no-preference: light; light: light; dark: dark;"
                    data-icon="octicon-star"
                    data-size="large"
                    data-show-count="true"
                    aria-label="Star bharathganji/pikpak-plus on GitHub"
                  >
                    Star
                  </GitHubButton>
                </div>
              </div>

              <CustomInput
                handleSubmit={handleSubmit}
                inputStyle={{
                  minHeight: '184px',
                }}
                buttonText="Create Task"
                onSubmitClearInput={true}
                icon={addSharp}
                customPlaceholder={`Supported link formats:
- Magnet URI (magnet:?xt=urn:btih)
- X(Twitter)
- TikTok
- Facebook      

Multiple links can be added at once by line break.`}
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
              <HelperCard
                cardTitle="Frequently Asked Questions"
                titleColor="tertiary"
                icon={helpCircleOutline}
                cardContent={
                  <IonButton fill="outline" routerLink="/faq">
                    FAQ PAGE &nbsp; <IonIcon icon={arrowRedoOutline}></IonIcon>
                  </IonButton>
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
