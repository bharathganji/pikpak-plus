import React, { useEffect, useState } from 'react'
import {
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonContent,
  IonButton,
  IonToast, // Import IonToast for error handling
} from '@ionic/react'
import {
  folderOpen,
  document,
  arrowBack,
  trash,
  cloudDownload,
} from 'ionicons/icons'
import { FileListResponse } from '../../types/sharedTypes'
import './BrowseFolders.css'
import { useHistory } from 'react-router'
import { getEmailandDirectory, makeRequest } from '../../helpers/helpers'
import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'
import BlockUiLoader from '../BlockUiLoader/BlockUiLoader'

const BrowseFolders: React.FC = () => {
  const [browseData, setBrowseData] = useState<FileListResponse | null>(null)
  const [parentStack, setParentStack] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorToast, setErrorToast] = useState<string | null>(null) // State for error toast
  const history = useHistory()
  const [directory, setDirectory] = useState<string | null>(null)

  useEffect(() => {
    const { dir } = getEmailandDirectory()
    setDirectory(dir)
  }, [])

  useEffect(() => {
    if (directory) {
      fetchBrowseData(directory)
    }
  }, [directory])

  const fetchBrowseData = async (itemIndex: string | null) => {
    try {
      setIsLoading(true)
      const response = await makeBrowseRequest(itemIndex)
      if (response.status !== 200) {
        throw new Error('Unauthorized')
      }
      const data = response.data
      setBrowseData(data)
    } catch (error: any) {
      setErrorToast('Error fetching browse data ' + error.message) // Set error message for toast
    } finally {
      setIsLoading(false)
    }
  }
  const makeBrowseRequest = async (itemIndex: string | null) => {
    try {
      const response = await makeRequest('browse', 'POST', {
        item_index: itemIndex,
      })

      return response
    } catch (error) {
      console.error('Error making browse request:', error)
      throw error // Rethrow the error for handling in the calling code
    }
  }

  const handleItemClick = async (
    index: string | null = directory,
    kind: string,
    parent_id: string,
  ) => {
    if (kind === 'drive#folder') {
      try {
        setIsLoading(true)
        const response = await makeBrowseRequest(index)
        if (response.status !== 200) {
          throw new Error('Unauthorized')
        }
        const data = response.data
        setBrowseData(data)
        setParentStack((prevStack) => [...prevStack, parent_id])
      } catch (error: any) {
        setErrorToast('Error fetching browse data ' + error.message) // Set error message for toast
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleBackClick = () => {
    const newStack = [...parentStack]
    const parent_id = newStack.pop()

    setParentStack(newStack)

    // Fetch browse data for the new parent_id
    fetchBrowseData(parent_id || '')
  }

  const handleDownloadClick = (itemId: string) => (e: React.MouseEvent) => {
    e.stopPropagation()

    // Navigate to /downloader route with query parameter item.id
    history.push(`/downloader?itemId=${itemId}`)
  }

  return (
    <>
      <CustomIonHeader title="Browse Folders" />

      <IonContent fullscreen={true}>
        <BlockUiLoader loading={isLoading}>
          <>
            {errorToast && (
              <IonToast
                isOpen={!!errorToast}
                onDidDismiss={() => setErrorToast(null)}
                message={errorToast}
                duration={3000}
              />
            )}
            {parentStack.length > 0 && (
              <IonItem onClick={handleBackClick} className="hover-effect">
                <IonIcon slot="start" icon={arrowBack} />
                <IonLabel>
                  <strong>..</strong>
                </IonLabel>
              </IonItem>
            )}
            <IonList>
              {browseData?.files.map((item) => (
                <IonItem
                  key={item.id}
                  onClick={() =>
                    handleItemClick(item.id, item.kind, item.parent_id)
                  }
                  className={item.kind === 'drive#folder' ? 'hover-effect' : ''}
                >
                  <IonIcon
                    slot="start"
                    icon={item.kind === 'drive#folder' ? folderOpen : document}
                  />
                  <IonLabel>{item.name}</IonLabel>

                  {item.kind !== 'drive#folder' && (
                    <>
                      <IonLabel slot="end">
                        {`Size: ${(
                          (parseInt(item?.size) || 0) /
                          1024 /
                          1024
                        ).toFixed(2)} Mb`}
                      </IonLabel>
                      <IonButton
                        color="tertiary"
                        slot="end"
                        onClick={handleDownloadClick(item.id)}
                        style={{ marginRight: '1rem', fontSize: '1.125rem' }}
                      >
                        <IonIcon
                          icon={cloudDownload}
                          size="default"
                          slot="end"
                        ></IonIcon>
                      </IonButton>
                    </>
                  )}
                  <IonButton
                    color="danger"
                    slot="end"
                    style={{ fontSize: '1.125rem' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      alert(item.id)
                    }}
                  >
                    <IonIcon icon={trash} size="default" slot="end"></IonIcon>
                  </IonButton>
                </IonItem>
              ))}
            </IonList>
          </>
        </BlockUiLoader>
      </IonContent>
    </>
  )
}

export default BrowseFolders
