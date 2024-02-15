import React, { useState } from 'react'
import { IonList, IonItem, IonIcon, IonAlert, IonToast } from '@ionic/react'
import {
  shareSocialOutline,
  downloadOutline,
  copyOutline,
  trashBinOutline,
  playOutline,
} from 'ionicons/icons'
import { DownloadResponse, FileItem } from '../../../types/sharedTypes'
import {
  formatFileSize,
  getEmailandDirectory,
  makeRequest,
  writeToClipboard,
} from '../../../helpers/helpers'
import './ModalOptions.css'
import { MAX_PLAY_SIZE_LIMIT_IN_BYTES } from '../../../constants/constants'

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
  setShowVideoPlayer?: (value: boolean) => void
  setVideoDetails?: (value: any) => void
  scrollToTop?: () => void
}

const ModalOptions: React.FC<ModalOptionsProps> = ({
  item,
  setShowModal,
  setIsLoading,
  setShowVideoPlayer,
  setVideoDetails,
  scrollToTop,
}) => {
  const fileName = item?.name
  const fileSize = item?.size
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
    play: {
      color: 'secondary',
      header: 'Play',
      message: 'Do you want to proceed with playing?',
      icon: playOutline,
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

  const { email } = getEmailandDirectory()

  const handleCopyFileName = async (fileName: string): Promise<any> => {
    writeToClipboard(fileName)
    setShowToast({
      message: 'File name - copied to clipboard',
      color: 'success',
    })
  }

  const copyValuesSequentially = async (valuesToCopy: string[]) => {
    for (const value of valuesToCopy) {
      await writeToClipboard(value)
      // Introduce a delay (e.g., 500 milliseconds) between operations
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  const fetchDataIfNeeded = async (itemId: string, action: string) => {
    if (downloadData?.id === itemId) {
      return downloadData
    } else {
      const response = await makeRequest('download', 'POST', {
        email: email,
        id: itemId,
        action: action,
      })
      const data = response.data
      setDownloadData(data)
      return data
    }
  }

  const handlePlay = async (itemId: string): Promise<any> => {
    console.log('Play logic', itemId)
    const maxLimit = parseInt(
      import.meta.env.VITE_MAX_PLAY_SIZE_LIMIT_IN_BYTES ||
        MAX_PLAY_SIZE_LIMIT_IN_BYTES,
    )
    console.log('maxLimit', maxLimit)

    if (maxLimit < parseInt(fileSize as any)) {
      setShowToast({
        message: 'File too large to play, limit ' + formatFileSize(maxLimit),
        color: 'danger',
      })
      return
    }
    try {
      setIsLoading(true)
      const data = await fetchDataIfNeeded(itemId, 'play')
      const downloadLink = data?.web_content_link
      const thumbnailLink = data?.thumbnail_link
      const downloadName = data?.name
      const videoType = data?.mime_type

      setVideoDetails &&
        setVideoDetails({
          videoUrl: downloadLink,
          thumbnailImg: thumbnailLink,
          videoTitle: downloadName,
          videoType: videoType,
        })
      setShowVideoPlayer && setShowVideoPlayer(true)
      scrollToTop && scrollToTop()
    } catch (error) {
      setShowToast({
        message: 'Play failed, try again later',
        color: 'danger',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleActionWithDownload = async (
    itemId: string,
    actionLogic: (downloadLink: string, downloadName: string) => Promise<void>,
  ) => {
    try {
      setIsLoading(true)

      const data = await fetchDataIfNeeded(itemId, 'download')
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
        email: email,
        id: itemId,
      })
      const data = response.data

      writeToClipboard(data.share_url)

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
    play: handlePlay,
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

  const confirmActions = [
    'delete',
    'download',
    'share',
    'copyDownloadLink',
    'play',
  ]

  const getAlertConfirmButtons = () => {
    return [
      {
        text: 'OK',
        handler: handleConfirmedAction,
      },
    ]
  }
  const skipActions = ['download', 'copyDownloadLink', 'play']

  return (
    <>
      <IonList>
        {Object.keys(actionDetails).map((action, index) => {
          if (
            action == 'play' &&
            item?.kind !== 'drive#folder' &&
            item?.file_category !== 'VIDEO'
          ) {
            return ''
          } else if (
            item &&
            (item.kind !== 'drive#folder' ||
              (item.kind === 'drive#folder' && !skipActions.includes(action)))
          ) {
            return (
              <ItemWithIcon
                key={index}
                color={actionDetails[action].color}
                icon={actionDetails[action].icon}
                text={actionDetails[action].header}
                onClick={() => handleAction(action)}
              />
            )
          } else {
            return ''
          }
        })}
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
