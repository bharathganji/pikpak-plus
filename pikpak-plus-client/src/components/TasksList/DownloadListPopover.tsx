// DownloadListPopover.tsx
import React from 'react'
import { IonIcon, IonItem, IonList } from '@ionic/react'
import { informationCircleOutline, sync } from 'ionicons/icons'
import { Task } from '../../types/sharedTypes'

interface DownloadListPopoverProps {
  handlePopoverButtonClick: (action: string) => void
  selectedValue: string
  selectedTask: Task | null
}

const DownloadListPopover: React.FC<DownloadListPopoverProps> = ({
  handlePopoverButtonClick,
  selectedValue,
  selectedTask,
}) => {
  return (
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
        selectedTask?.phase === 'PHASE_TYPE_ERROR' && (
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
  )
}

export default DownloadListPopover
