import {
  IonAlert,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonProgressBar,
  IonToast,
} from '@ionic/react'
import './Downloader.css'
import { DownloadResponse } from '../../types/sharedTypes'
import { useEffect, useState } from 'react'
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner'
import { useLocation } from 'react-router'
import {
  cloudDownload,
  arrowForward,
  speedometerSharp,
  cloudDoneSharp,
} from 'ionicons/icons'
import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'
import { makeRequest } from '../../helpers/helpers'

function Downloader() {
  const [downloadData, setDownloadData] = useState<DownloadResponse | null>(
    null,
  )
  const [isOpen, setIsOpen] = useState(false)

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const location = useLocation()
  const itemId = new URLSearchParams(location.search).get('itemId')
  const [speed, setSpeed] = useState(0)
  const [showProgressCard, setShowProgressCard] = useState<boolean>(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // setDownloadData(MOCK);

    itemId && handleDownloadRequest(itemId)
    // Add your download logic here using the itemId
  }, [itemId])

  const handleDownloadRequest = async (itemId: string) => {
    console.log(itemId)

    try {
      setIsLoading(true)
      const response = await makeRequest('download', 'POST', {
        id: itemId,
      })
      const data = response.data

      setDownloadData(data)
    } catch (error) {
      console.error('Error fetching browse data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function downloadFile() {
    setShowProgressCard(true)
    const startTime = Date.now()

    const url = downloadData?.web_content_link
    const filename = downloadData?.name

    if (!url || filename === undefined) {
      return
    }

    try {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url)
      xhr.responseType = 'blob'

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const blob = xhr.response
          const link = document.createElement('a')
          const blobUrl = URL.createObjectURL(blob)

          link.href = blobUrl
          link.download = filename

          document.body.appendChild(link)
          link.click()

          document.body.removeChild(link)
          URL.revokeObjectURL(blobUrl)
        } else {
          console.error(`HTTP error! Status: ${xhr.status}`)
        }
      })

      xhr.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const loaded = event.loaded
          const total = event.total
          const progress = loaded / total

          setProgress(progress)

          const elapsedTime = (Date.now() - startTime) / 1000
          const speed = ((loaded / elapsedTime) * 8) / 1000000 // convert to Mbps
          console.log(`Download speed: ${speed.toFixed(2)} Mbps`)
          setSpeed(speed)

          if (loaded >= total) {
            setIsOpen(true)
            setSpeed(0)
          }
        }
      })

      xhr.send()
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  return (
    <>
      <CustomIonHeader title="Downloader" />

      <IonContent fullscreen={true}>
        {isLoading && <LoadingSpinner />}
        <div className="container">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Download?</IonCardTitle>
              <br />
            </IonCardHeader>

            <IonCardContent>
              <strong>
                {downloadData?.name}
                <br />
                <br />
                {downloadData?.size &&
                  'Size : ' +
                    ((parseInt(downloadData?.size) || 0) / 1024 / 1024).toFixed(
                      2,
                    )}
                MB
              </strong>
            </IonCardContent>
            <div className="button-container">
              <IonButton color="success" id="present-alert">
                Download &nbsp;
                <IonIcon icon={cloudDownload} />
              </IonButton>
              <IonButton fill="clear" href="/browse">
                Go to Folders &nbsp; <IonIcon icon={arrowForward} />
              </IonButton>
            </div>
          </IonCard>
          {showProgressCard && (
            <IonCard>
              <IonCardHeader>
                <IonCardContent>
                  <IonProgressBar
                    color={progress >= 1 ? 'success' : 'primary'}
                    value={progress}
                  ></IonProgressBar>
                  <div className="flex-container-top">
                    <div className="flex-container">
                      <span>
                        <IonIcon icon={cloudDoneSharp} /> &nbsp;
                        {(progress * 100).toFixed(2)}% completed{' '}
                      </span>
                    </div>
                    <div className="flex-container">
                      <span>
                        <IonIcon icon={speedometerSharp} /> &nbsp;
                        {(speed / 8).toFixed(2)} Mbps{' '}
                      </span>
                    </div>
                  </div>
                </IonCardContent>
              </IonCardHeader>
            </IonCard>
          )}
        </div>

        <IonAlert
          header="Agree?"
          subHeader="Please keep the browser open until the download is complete."
          className="custom-alert"
          trigger="present-alert"
          buttons={[
            {
              text: 'No',
              role: 'cancel',
              cssClass: 'alert-button-cancel hover-effect',
              handler: () => {
                console.log('Alert canceled')
              },
            },
            {
              text: 'OK',
              role: 'confirm',
              id: 'download-started',
              cssClass: 'alert-button-confirm hover-effect',
              handler: () => {
                downloadFile()
                console.log('download stated..!')
              },
            },
          ]}
          onDidDismiss={({ detail }) =>
            console.log(`Dismissed with role: ${detail.role}`)
          }
        ></IonAlert>

        <IonToast
          trigger="download-started"
          message="Download Started!"
          color={'success'}
          duration={3000}
        ></IonToast>
        <IonAlert
          isOpen={isOpen}
          header="Download Completed!"
          message={downloadData?.name}
          buttons={[
            {
              text: 'Thank You',
              role: 'completed',
              cssClass: 'alert-button-confirm hover-effect',
            },
          ]}
          onDidDismiss={() => setIsOpen(false)}
        ></IonAlert>
      </IonContent>
    </>
  )
}
export default Downloader
