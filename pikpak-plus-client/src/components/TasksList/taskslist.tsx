import { useEffect, useState } from 'react'
import {
  IonCol,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonProgressBar,
} from '@ionic/react'
import { DownloadListResponse, Task } from '../../types/sharedTypes'
import { CONSTANTS } from '../../constants/constants'
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner'
import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'
import { getEmailandDirectory } from '../../helpers/helpers'

const DownloadList = () => {
  const [downloadData, setDownloadData] = useState<Task[] | null>(null)
  const [directory, setDirectory] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  useEffect(() => {
    const { dir } = getEmailandDirectory()
    setDirectory(dir)
  }, [])
  useEffect(() => {
    fetchDownloadData()
    // Set up polling for download tasks every 10 seconds
    const intervalId = setInterval(() => {
      fetchDownloadData()
    }, 10000)

    // Clear the interval on component unmount
    return () => clearInterval(intervalId)
  }, [directory]) // Empty dependency array ensures useEffect runs only on mount and unmount

  const fetchDownloadData = () => {
    setIsLoading(true)
    fetch(`${CONSTANTS.api_url}/tasks`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unauthorized')
        }
        return response.json()
      })
      .then((downloadResponse: DownloadListResponse) => {
        console.log(downloadResponse)
        console.log(directory)
        const tasks = downloadResponse.tasks
        console.log(tasks)

        const filteredTasks = tasks.filter(
          (task) => task.phase === 'PHASE_TYPE_RUNNING',
        )

        console.log(filteredTasks)

        setDownloadData(filteredTasks)
        setIsLoading(false)
      })
      .catch((error) => {
        if (error.message === 'Unauthorized') {
          setError(
            'Unauthorized: Client not initialized. Please call Login first.',
          )
        } else {
          setError('Error: ' + error.message)
        }
        setIsLoading(false)
      })
  }

  return (
    <>
      <div>{error && <p style={{ color: 'red' }}>{error}</p>}</div>

      <CustomIonHeader title="Cloud Download Tasks" />

      <IonContent className="ion-padding">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <IonList inset={true}>
            {downloadData &&
              downloadData.map((task) => (
                <IonItem key={task.id}>
                  <IonCol>
                    <IonLabel>{task.name}</IonLabel>
                  </IonCol>
                  <IonCol>
                    <IonLabel>{task.progress}%</IonLabel>
                    <IonProgressBar value={task.progress / 100} />
                  </IonCol>
                </IonItem>
              ))}
          </IonList>
        )}
      </IonContent>
    </>
  )
}

export default DownloadList
