// TaskDetailsModal.tsx
import React from 'react'
import {
  IonButton,
  IonButtons,
  IonCol,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonRow,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { copyOutline } from 'ionicons/icons'
import { formatCreationTime, formatFileSize } from '../../helpers/helpers'
// import { copyToClipboardWithToast } from './DownloadListHelper' // Assuming the path
import { copyToClipboard } from '../../helpers/actionFunctions'
import { Task } from '../../types/sharedTypes'

interface TaskDetailsModalProps {
  selectedTask: Task | null
  setShowDetailsAlert: React.Dispatch<React.SetStateAction<boolean>>
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  selectedTask,
  setShowDetailsAlert,
}) => {
  return (
    <IonModal
      isOpen={true} /* Adjust this according to your logic */
      initialBreakpoint={1}
      onDidDismiss={() => {
        setShowDetailsAlert(false)
      }}
      breakpoints={[0, 1]}
    >
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Task Details</IonTitle>
          <IonButtons slot="end">
            <IonButton color="light" onClick={() => setShowDetailsAlert(false)}>
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
            <p>{formatFileSize(parseInt(selectedTask?.file_size || '0'))}</p>
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
                      copyToClipboard(
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
    </IonModal>
  )
}

export default TaskDetailsModal
