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
} from 'ionicons/icons'
import './addUrlForm.css'
import CustomInput from '../CustomInput/CustomInput'
import {
  bytesToGB,
  bytesToTiB,
  getEmailandDirectory,
  get_file_list,
  makeRequest,
  set_file_list,
} from '../../helpers/helpers'

import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'
import HelperCard from '../HelperCard/HelperCard'
import BlockUiLoader from '../BlockUiLoader/BlockUiLoader'
import { help, usefullLinks } from '../../constants/constants'
import { BaseResponseObjectType, DriveAbout } from '../../types/sharedTypes'

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
  const [driveStats, setDriveStats] = useState<DriveAbout>()

  useEffect(() => {
    const { email, dir } = getEmailandDirectory()
    setEmail(email)
    setDirectory(dir)
    fetchDriveStats()
  }, [])

  useEffect(() => {
    if (get_file_list().length === 0) {
      fetch_file_list()
    }
  }, [])

  const fetch_file_list = async () => {
    let nextPageToken = ''
    let fileList = []

    // Define an inner function to make the API call recursively
    const fetchFilesRecursive = async () => {
      try {
        const response = await makeRequest('browse', 'POST', {
          item_index: '*',
          next_page_token: nextPageToken.toString(),
        })

        const data = response.data
        fileList = fileList.concat(data.files) // Append new files to the existing list

        // Check if the next_page_token is empty or the length of files is less than 512
        if (data.next_page_token === '' || data.files.length < 512) {
          // If the condition is met, stop making further calls and set the file list
          set_file_list(fileList)
        } else {
          // Update nextPageToken for the next iteration
          nextPageToken = data.next_page_token
          console.log('nextPageToken:', nextPageToken)

          // Make the recursive call to fetch the next set of files
          await fetchFilesRecursive()
        }
      } catch (error) {
        console.error('Error fetching files:', error)
      }
    }

    // Start the recursive function to fetch files
    await fetchFilesRecursive()
  }

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

  const fetchDriveStats = async () => {
    try {
      setIsLoadingStats(true)
      const response = await makeRequest('drivestats', 'GET', {})
      const data = response.data
      setDriveStats(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

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
                <IonItemDivider style={{ visibility: 'hidden' }} />
                <IonText className="text-flex-style">
                  <span>
                    <IonIcon color={'dark'} icon={cloudOutline} /> &nbsp;
                    {bytesToTiB(driveStats?.quota.usage || 0) +
                      ' / ' +
                      bytesToTiB(driveStats?.quota.limit || 0)}
                    &nbsp;
                    {'used'} &nbsp;
                  </span>
                  <span>
                    <IonIcon color={'dark'} icon={calendarClearOutline} />
                    &nbsp;
                    {'Expiry: ' +
                      (import.meta.env.VITE_PIKPAK_EXPIRY_DATE || 'Contact Admin')}
                  </span>
                </IonText>
              </div>
              <CustomInput
                handleSubmit={handleSubmit}
                inputStyle={{
                  minHeight: '184px',
                }}
                buttonText="Create Task"
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
