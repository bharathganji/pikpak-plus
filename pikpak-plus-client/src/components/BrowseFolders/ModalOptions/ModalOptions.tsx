import React, { useState } from 'react'
import { IonList, IonItem, IonIcon, IonAlert, IonToast } from '@ionic/react'
import {
  shareSocialOutline,
  downloadOutline,
  copyOutline,
  trashBinOutline,
} from 'ionicons/icons'
import { DownloadResponse, FileItem } from '../../../types/sharedTypes'
import { copyToClipboard } from '../../../helpers/actionFunctions'
import { makeRequest } from '../../../helpers/helpers'
import './ModalOptions.css'

const ItemWithIcon: React.FC<ItemWithIconProps> = React.memo(
  ({ color, icon, onClick, text }) => (
    <IonItem button={true} detail={false} onClick={onClick}>
      <IonIcon slot="start" color={color} icon={icon} />
      {text}
    </IonItem>
  ),
)

interface ItemWithIconProps {
  color: string
  icon: string
  onClick: () => void
  text: string
}

interface ModalOptionsProps {
  item: FileItem | null
  setShowModal: (value: boolean) => void
  setIsLoading: (value: boolean) => void
}

const ModalOptions: React.FC<ModalOptionsProps> = ({
  item,
  setShowModal,
  setIsLoading,
}) => {
  const fileName = item?.name
  const [showAlert, setShowAlert] = useState(false)
  const [actionCode, setActionCode] = useState('')
  const [downloadData, setDownloadData] = useState<DownloadResponse | null>(
    null,
  )
  const [showToast, setShowToast] = useState<{
    message: string
    color: string
  } | null>(null)

  const actionDetails: Record<
    string,
    { header: string; message: string; icon: string; color: string }
  > = {
    share: {
      color: 'success',
      header: 'Share',
      message: 'Do you want to proceed with sharing?',
      icon: shareSocialOutline,
    },
    copyDownloadLink: {
      color: 'tertiary',
      header: 'Copy Download/Stream Link',
      message: `Are you sure you want to copy the download link for: ${fileName}?`,
      icon: copyOutline,
    },
    copyFileName: {
      color: 'tertiary',
      header: 'Copy File Name',
      message: `Are you sure you want to copy the file name: ${fileName}?`,
      icon: copyOutline,
    },
    download: {
      color: 'warning',
      header: 'Download to Device',
      message:
        'This will initiate the download process. Do you want to proceed?',
      icon: downloadOutline,
    },
    delete: {
      color: 'danger',
      header: 'Delete (~ coming soon ~)',
      message: 'This will delete the item. Are you sure you want to proceed?',
      icon: trashBinOutline,
    },
  }

  const handleCopyFileName = async (fileName: string): Promise<any> => {
    copyToClipboard(fileName)
    setShowToast({
      message: 'File name - copied to clipboard',
      color: 'success',
    })
  }

  const copyValuesSequentially = async (valuesToCopy: string[]) => {
    for (const value of valuesToCopy) {
      await copyToClipboard(value)
      // Introduce a delay (e.g., 500 milliseconds) between operations
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  const fetchDataIfNeeded = async (itemId: string) => {
    if (downloadData?.id === itemId) {
      return downloadData
    } else {
      const response = await makeRequest('download', 'POST', {
        id: itemId,
      })
      const data = response.data
      setDownloadData(data)
      return data
    }
  }

  const handleActionWithDownload = async (
    itemId: string,
    actionLogic: (downloadLink: string, downloadName: string) => Promise<void>,
  ) => {
    try {
      setIsLoading(true)

      const data = await fetchDataIfNeeded(itemId)
      const downloadLink = data?.web_content_link
      const downloadName = data?.name

      if (downloadLink) {
        await actionLogic(downloadLink, downloadName)
        setShowToast({
          message: 'Action logic completed',
          color: 'success',
        })
      } else {
        console.error('Download link is not available')
      }
    } catch (error) {
      console.error('Error handling action:', error)
    } finally {
      setTimeout(() => {
        setIsLoading(false)
      }, 1000)
    }
  }

  const handleCopyDownloadLink = async (itemId: string): Promise<any> => {
    console.log(itemId)

    const actionLogic = async (downloadLink: string, downloadName: string) => {
      // Replace this with your specific logic for copying to clipboard
      const valuesToCopy: (string | undefined)[] = [downloadName, downloadLink]
      const filteredValuesToCopy: string[] = valuesToCopy.filter(
        (value): value is string => value !== undefined,
      )

      await copyValuesSequentially(filteredValuesToCopy)
    }

    await handleActionWithDownload(itemId, actionLogic)
  }

  const handleDownloadToDevice = async (itemId: string): Promise<any> => {
    console.log('Download to device logic')

    await handleActionWithDownload(
      itemId,
      async (downloadLink, downloadName) => {
        // Replace this with your specific logic for downloading to the device
        console.log('Downloading to device:', downloadLink)

        // Copy values to clipboard
        const valuesToCopy = [downloadName, downloadLink]
        const filteredValuesToCopy: string[] = valuesToCopy.filter(
          (value): value is string => value !== undefined,
        )

        await copyValuesSequentially(filteredValuesToCopy).then(() => {
          window.open(downloadLink, '_blank')
        })
      },
    )
  }

  const handleShare = async (itemId: string): Promise<any> => {
    try {
      const response = await makeRequest('share', 'POST', {
        id: itemId,
      })
      const data = response.data

      copyToClipboard(data.share_url)

      if (navigator.share) {
        navigator
          .share({ url: data.share_url })
          .then(() => {
            setShowToast({
              message: `copied url : ${data.share_url}`,
              color: 'success',
            })
          })
          .catch((error) => {
            console.log('Error sharing:', error)

            setShowToast({
              message: `Failed to share: ${error}`,
              color: 'danger',
            })
          })
      }
    } catch (error) {
      console.log('Error sharing:', error)

      setShowToast({ message: 'Failed to share', color: 'danger' })
    }
  }

  const handleDelete = async (itemId: string): Promise<any> => {
    console.log('Delete logic' + itemId)
  }

  const actionFunctionMap: Record<string, (itemId: string) => Promise<any>> = {
    copyDownloadLink: handleCopyDownloadLink,
    copyFileName: () => handleCopyFileName(fileName || ''),
    share: handleShare,
    download: handleDownloadToDevice,
    delete: handleDelete,
  }

  const directActions = ['copyFileName']
  // Common function to handle actions
  const handleAction = async (action: string) => {
    setActionCode(action)

    if (directActions.includes(action)) {
      const actionFunction = actionFunctionMap[action]
      if (actionFunction) {
        const success = await actionFunction(item?.id || '')
        if (success) {
          setShowToast({ message: `${action} successful`, color: 'success' })
        }
        setShowModal(false)
        setActionCode('')
        return
      }
    }
    setShowAlert(true)
  }

  // Common function to handle confirmed actions
  const handleConfirmedAction = () => {
    // Handle action logic here based on actionCode
    console.log(`${actionCode} confirmed`)

    const actionFunction = actionFunctionMap[actionCode]
    if (actionFunction) {
      actionFunction(item?.id || '')
    }

    // Close the modal or perform any other necessary actions
    setShowModal(false)
    // Reset actionCode
    setActionCode('')
    // Close the alert
    setShowAlert(false)
  }

  // Common function to handle cancelled actions
  const handleCancelledAction = () => {
    // Close the alert
    setShowAlert(false)
  }

  const getAlertButtons = () => {
    return [
      {
        text: 'Cancel',
        role: 'cancel',
        handler: handleCancelledAction,
        cssClass: 'hover-effect alert-button-cancel hover-effect',
      },
      {
        text: 'OK',
        handler: handleConfirmedAction,
        cssClass: 'hover-effect alert-button-confirm hover-effect',
      },
    ]
  }

  const confirmActions = ['delete', 'download', 'share', 'copyDownloadLink']

  const getAlertConfirmButtons = () => {
    return [
      {
        text: 'OK',
        handler: handleConfirmedAction,
      },
    ]
  }
  const skipActions = ['download', 'copyDownloadLink']

  return (
    <>
      <IonList>
        {Object.keys(actionDetails).map((action, index) =>
          item &&
          (item.kind !== 'drive#folder' ||
            (item.kind === 'drive#folder' && !skipActions.includes(action))) ? (
            <ItemWithIcon
              key={index}
              color={actionDetails[action].color}
              icon={actionDetails[action].icon}
              text={actionDetails[action].header}
              onClick={() => handleAction(action)}
            />
          ) : (
            ''
          ),
        )}
      </IonList>

      {/* Common Alert for Multiple Actions */}
      <IonAlert
        isOpen={showAlert}
        className="custom-alert"
        onDidDismiss={() => setShowAlert(false)}
        header={actionDetails[actionCode]?.header || 'Are you sure?'}
        message={
          actionDetails[actionCode]?.message ||
          'Do you want to proceed with this action?'
        }
        buttons={
          confirmActions.includes(actionCode)
            ? getAlertButtons()
            : getAlertConfirmButtons()
        }
      />

      <IonToast
        isOpen={!!showToast}
        onDidDismiss={() => setShowToast(null)}
        message={showToast?.message}
        duration={3000}
        position="top"
        color={showToast?.color}
      />
    </>
  )
}

export default ModalOptions
