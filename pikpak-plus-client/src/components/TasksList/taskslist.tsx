import { useEffect, useState } from 'react'
import {
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonFab,
  IonFabButton,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPopover,
  IonProgressBar,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react'
import {
  ellipsisVertical,
  cloudUploadOutline,
  cloudDoneOutline,
  sync,
  refreshCircleOutline,
  informationCircleOutline,
  copyOutline,
} from 'ionicons/icons'
import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'
import './tasklist.css'
import BlockUiLoader from '../BlockUiLoader/BlockUiLoader'
import {
  formatCreationTime,
  formatFileSize,
  makeRequest,
} from '../../helpers/helpers'
import { Task } from '../../types/sharedTypes'
// import { Tasks, completedTasks } from '../../constants/constants'
import { copyToClipboard } from '../../helpers/actionFunctions'

interface ErrorToast {
  message: string
  color: string
}

const DownloadList = () => {
  const [downloadData, setDownloadData] = useState<Task[] | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [selectedValue, setSelectedValue] = useState('ongoing')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const [errorToast, setErrorToast] = useState<ErrorToast | null>(null)

  const copyToClipboardWithToast = (text) => {
    try {
      copyToClipboard(text)
      setErrorToast({
        color: 'success',
        message: 'Copied to clipboard!',
      })
    } catch (error) {
      setErrorToast({
        color: 'danger',
        message: 'Error copying to clipboard',
      })
    }
  }

  const fetchDownloadData = async () => {
    setIsLoading(true)

    const apiUrl = selectedValue === 'ongoing' ? 'tasks' : 'completedTasks'

    try {
      const response = await makeRequest(apiUrl, 'GET')
      if (response.status === 200) {
        const tasks = response.data.tasks || []
        setDownloadData(tasks)
      } else {
        throw new Error(`Request failed with status: ${response.status}`)
      }
    } catch (error: any) {
      setErrorToast({
        message: 'Error fetching browse data: ' + error.message,
        color: 'danger', // Set color for toast
      })
      // setDownloadData(completedTasks.tasks)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const fetchDownloadData1 = async () => {
      try {
        await fetchDownloadData()
      } catch (error: any) {
        setErrorToast({
          message: 'Error fetching browse data: ' + error.message,
          color: 'danger', // Set color for toast
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDownloadData1()
  }, [selectedValue])

  const handleSelectedValue = async (value) => {
    setSelectedValue(value)
  }
  const [popoverEvent, setPopoverEvent] = useState<any | null>(null)

  const [showDetailsAlert, setShowDetailsAlert] = useState(false)

  const handleMoreIconClick = (event: any, task: Task) => {
    // Set the event and selectedTask
    setSelectedTask(task)
    setPopoverEvent(event)
  }

  const handlePopoverButtonClick = (action: string) => {
    // If 'view details' is clicked, show the details alert
    if (action === 'view details') {
      setShowDetailsAlert(true)
    } else {
      // Perform other actions as needed
    }

    // Close the popover
    setPopoverEvent(null)
  }

  return (
    <>
      <CustomIonHeader title="Cloud Tasks" />
      <IonFab vertical="bottom" horizontal="end">
        <IonFabButton onClick={() => fetchDownloadData()}>
          <IonIcon icon={refreshCircleOutline} />
        </IonFabButton>
      </IonFab>
      <IonSegment
        value={selectedValue}
        onIonChange={(e) => {
          e.stopPropagation()
          handleSelectedValue(e.detail.value)
        }}
        color={selectedValue === 'ongoing' ? 'primary' : 'success'}
      >
        <IonSegmentButton value="ongoing" layout="icon-start">
          <IonIcon icon={cloudUploadOutline} />
          <IonLabel>Ongoing</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="completed" layout="icon-start">
          <IonIcon icon={cloudDoneOutline} />
          <IonLabel>Completed</IonLabel>
        </IonSegmentButton>
      </IonSegment>
      <BlockUiLoader loading={isLoading}>
        <IonContent className="ion-padding">
          <>
            {errorToast && (
              <IonToast
                position="top"
                isOpen={!!errorToast}
                onDidDismiss={() => setErrorToast(null)}
                message={errorToast.message}
                color={errorToast.color} // Set color for toast
                duration={3000}
              />
            )}
            <IonList>
              {downloadData &&
                downloadData.map((task) => (
                  <IonItem key={task.id}>
                    <IonCol size="9">
                      <IonLabel className="label-text">{task.name}</IonLabel>
                      <div className="flex-container">
                        <IonText>
                          {`${(
                            parseInt(task.file_size) /
                            1024 /
                            1024 /
                            1024
                          ).toFixed(1)}GB`}
                        </IonText>

                        <IonText
                          className="progress-text"
                          color={
                            selectedValue === 'completed'
                              ? 'tertiary'
                              : task.phase === 'PHASE_TYPE_RUNNING'
                              ? 'success'
                              : 'danger'
                          }
                        >
                          {task.message}
                        </IonText>
                      </div>
                    </IonCol>
                    <IonCol size="2">
                      <IonLabel>{task.progress}%</IonLabel>
                      <IonProgressBar
                        color={
                          selectedValue === 'completed'
                            ? 'success'
                            : task.phase === 'PHASE_TYPE_RUNNING'
                            ? 'primary'
                            : 'danger'
                        }
                        value={task.progress / 100}
                      />
                    </IonCol>
                    <IonCol size="1">
                      <IonIcon
                        className="hover-effect"
                        icon={ellipsisVertical}
                        color="tertiary"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMoreIconClick(event, task)
                        }}
                      ></IonIcon>
                    </IonCol>
                  </IonItem>
                ))}
            </IonList>
          </>
        </IonContent>
      </BlockUiLoader>
      {selectedTask && (
        <IonPopover
          keepContentsMounted={true}
          event={popoverEvent}
          isOpen={!!selectedTask}
          onDidDismiss={() => {
            setPopoverEvent(null)
            setSelectedTask(null)
          }}
        >
          <IonList inset={true}>
            <IonItem
              button={true}
              detail={false}
              onClick={() => handlePopoverButtonClick('view details')}
            >
              <IonIcon icon={informationCircleOutline} slot="start" />
              View Details
            </IonItem>

            {selectedValue === 'ongoing' &&
              selectedTask.phase === 'PHASE_TYPE_ERROR' && (
                <IonItem
                  button={true}
                  detail={false}
                  onClick={() => handlePopoverButtonClick('retry')}
                >
                  <IonIcon icon={sync} slot="start" />
                  Retry
                </IonItem>
              )}
          </IonList>
        </IonPopover>
      )}

      <IonModal
        isOpen={showDetailsAlert}
        initialBreakpoint={1}
        onDidDismiss={() => {
          setSelectedTask(null)
          setShowDetailsAlert(false)
        }}
        breakpoints={[0, 1]}
      >
        <>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>Task Details</IonTitle>
              <IonButtons slot="end">
                <IonButton
                  color="light"
                  onClick={() => setShowDetailsAlert(false)}
                >
                  Close
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonList lines="full">
            <IonItem>
              <IonLabel>
                <h2>Name:</h2>
                <p>{selectedTask?.file_name}</p>
              </IonLabel>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h2>Size:</h2>
                <p>
                  {formatFileSize(parseInt(selectedTask?.file_size || '0'))}
                </p>
              </IonLabel>
            </IonItem>

            <IonItem>
              <IonLabel>
                <h2>Creation Time:</h2>
                <p>{formatCreationTime(selectedTask?.created_time)}</p>
              </IonLabel>
            </IonItem>

            <IonItem>
              <IonLabel>
                <IonGrid>
                  <IonRow>
                    <IonCol>
                      <IonText>Resource Link:</IonText>
                    </IonCol>
                    <IonCol>
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={() => {
                          copyToClipboardWithToast(
                            selectedTask?.params.url || 'error copying',
                          )
                        }}
                      >
                        <IonIcon icon={copyOutline} />
                        Copy
                      </IonButton>
                    </IonCol>
                  </IonRow>
                  <IonRow>
                    <IonCol>
                      <IonLabel>
                        <p>{selectedTask?.params.url}</p>
                      </IonLabel>
                    </IonCol>
                  </IonRow>
                </IonGrid>
              </IonLabel>
            </IonItem>
          </IonList>
        </>
      </IonModal>
    </>
  )
}

export default DownloadList
