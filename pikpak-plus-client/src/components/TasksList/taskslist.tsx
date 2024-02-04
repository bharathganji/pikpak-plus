// DownloadList.tsx
import React, { useEffect, useState } from 'react'
import {
  IonCol,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPopover,
  IonProgressBar,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonToast,
} from '@ionic/react'
import {
  ellipsisVertical,
  cloudUploadOutline,
  cloudDoneOutline,
  refreshCircleOutline,
} from 'ionicons/icons'
import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'
import './tasklist.css'
import BlockUiLoader from '../BlockUiLoader/BlockUiLoader'
import { getEmailandDirectory, makeRequest } from '../../helpers/helpers'
import { Task } from '../../types/sharedTypes'
import DownloadListPopover from './DownloadListPopover'
import TaskDetailsModal from './TaskDetailsModal'

interface ErrorToast {
  message: string
  color: string
}

const DownloadList: React.FC = () => {
  const [downloadData, setDownloadData] = useState<Task[] | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [selectedValue, setSelectedValue] = useState('ongoing')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [errorToast, setErrorToast] = useState<ErrorToast | null>(null)
  const [popoverEvent, setPopoverEvent] = useState<any | null>(null)
  const [showDetailsAlert, setShowDetailsAlert] = useState(false)

  const fetchDownloadData = async () => {
    setIsLoading(true)

    const apiUrl = selectedValue === 'ongoing' ? 'tasks' : 'completedTasks'
    const { email } = getEmailandDirectory()

    try {
      if (!email) {
        throw new Error('Email not found')
      }
      const response = await makeRequest(apiUrl, 'POST', { email: email })
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
  const handleMoreIconClick = (event: any, task: Task) => {
    setSelectedTask(task)
    setPopoverEvent(event)
  }

  const handlePopoverButtonClick = (action: string) => {
    if (action === 'view details') {
      setShowDetailsAlert(true)
    } else {
      // Perform other actions as needed
    }

    setPopoverEvent(null)
  }

  return (
    <>
      <CustomIonHeader title="Cloud Tasks" />
      <IonFab vertical="bottom" horizontal="end">
        <IonFabButton onClick={() => fetchDownloadData()}>
          <IonIcon icon={refreshCircleOutline} size="large" />
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
                color={errorToast.color}
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
                          handleMoreIconClick(e, task)
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
          <DownloadListPopover
            handlePopoverButtonClick={handlePopoverButtonClick}
            selectedValue={selectedValue}
            selectedTask={selectedTask}
          />
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
        <TaskDetailsModal
          selectedTask={selectedTask}
          setShowDetailsAlert={setShowDetailsAlert}
        />
      </IonModal>
    </>
  )
}

export default DownloadList
