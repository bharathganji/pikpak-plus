import React, { useEffect, useRef, useState } from 'react'
import {
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonContent,
  IonToast,
  IonModal,
  IonItemDivider,
  IonChip,
  IonText,
  IonThumbnail,
  IonImg,
  IonButton,
} from '@ionic/react'
import {
  chevronUpCircleOutline,
  ellipsisVerticalSharp,
  sadOutline,
} from 'ionicons/icons'
import { FileItem, FileListResponse } from '../../types/sharedTypes'
import './BrowseFolders.css'
import {
  formatFileSize,
  getEmailandDirectory,
  makeRequest,
} from '../../helpers/helpers'
import CustomIonHeader from '../CustomIonHeader/CustomIonHeader'
import BlockUiLoader from '../BlockUiLoader/BlockUiLoader'
import ModalOptions from './ModalOptions/ModalOptions'
import VideoPlayer from './VideoPlayer/VideoPlayer'
import HelperCard from '../HelperCard/HelperCard'
import autoAnimate from '@formkit/auto-animate'

interface VideoPlayerProps {
  videoUrl?: string
  videoTitle?: string
  videoType?: string
  thumbnailImg?: string
}

const BrowseFolders: React.FC = () => {
  const [browseData, setBrowseData] = useState<FileListResponse | null>(null)
  const [parentStack, setParentStack] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorToast, setErrorToast] = useState<string | null>(null) // State for error toast
  const [directory, setDirectory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const [videoDetails, setVideoDetails] = useState<VideoPlayerProps>({})

  const [navigationCache, setNavigationCache] = useState<{
    [key: string]: FileListResponse
  }>({})
  const contentRef = useRef<HTMLIonContentElement | null>(null)
  const parent = useRef(null)
  const scrollToTop = () => {
    contentRef.current && contentRef.current.scrollToTop()
  }

  // Effect hook to set initial directory on component mount
  useEffect(() => {
    const { dir } = getEmailandDirectory()
    setDirectory(dir)
  }, [])

  useEffect(() => {}, [selectedItem])

  // Effect hook to fetch browseData when directory changes
  useEffect(() => {
    if (directory) {
      fetchBrowseData(directory)
    }
  }, [directory])

  // Function to close the modal
  function closeModal() {
    setShowModal(false)
  }
  // Function to make a browse request to the server
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

  // Function to fetch browse data from the server // Function to fetch browse data from the server
  const fetchBrowseData = async (itemIndex: string | null) => {
    try {
      setIsLoading(true)
      if (itemIndex && navigationCache[itemIndex]) {
        setBrowseData(navigationCache[itemIndex])
      } else {
        const response = await makeBrowseRequest(itemIndex)
        if (response.status !== 200) {
          throw new Error('Unauthorized')
        }
        const data = response.data
        setBrowseData(data)
        itemIndex &&
          setNavigationCache({ ...navigationCache, [itemIndex]: data })
      }
    } catch (error: any) {
      setErrorToast('Error fetching browse data ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to handle item click, fetching data for folders
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
        index && setNavigationCache({ ...navigationCache, [index]: data })
      } catch (error: any) {
        setErrorToast('Error fetching browse data ' + error.message)
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Function to handle going back to the previous folder
  const handleBackClick = () => {
    const newStack = [...parentStack]
    const parent_id = newStack.pop()
    setParentStack(newStack)

    if (parent_id && navigationCache[parent_id]) {
      // Set browse data from cache if available
      setBrowseData(navigationCache[parent_id])
    } else {
      // Fetch browse data for the new parent_id
      fetchBrowseData(parent_id || '')
    }
  }

  const helperCardContent = (
    <>
      <b> Try sample Magnet:</b> &nbsp;
      <IonText style={{ wordBreak: 'break-all' }}>
        magnet:?xt=urn:btih:12D47B6836FD7787531393069ED5ADE7F53DF7D8
      </IonText>
      <br />
      <IonButton
        color="primary"
        fill="outline"
        onClick={() => {
          window.navigator.clipboard.writeText(
            'magnet:?xt=urn:btih:12D47B6836FD7787531393069ED5ADE7F53DF7D8',
          )
          setErrorToast('Magnet copied, Go to Create Task Section')
        }}
      >
        copy
      </IonButton>
    </>
  )
  useEffect(() => {
    parent.current &&
      autoAnimate(parent.current, {
        duration: 500,
        disrespectUserMotionPreference: false,
      })
  }, [parent])

  const handleDeleteItem = (itemId: string) => {
    if (browseData) {
      const updatedFiles = browseData.files.filter((item) => item.id !== itemId)
      const updatedBrowseData: FileListResponse = {
        ...browseData,
        files: updatedFiles,
      }
      setBrowseData(updatedBrowseData)
    }
  }

  return (
    <>
      <CustomIonHeader title="Browse Folders" />

      <BlockUiLoader loading={isLoading}>
        <IonContent fullscreen={true} ref={contentRef} scrollEvents={true}>
          <>
            {errorToast && (
              <IonToast
                position="top"
                isOpen={!!errorToast}
                onDidDismiss={() => setErrorToast(null)}
                message={errorToast}
                duration={2000}
              />
            )}
            {showVideoPlayer && (
              <VideoPlayer
                videoUrl={videoDetails.videoUrl || ''}
                thumbnailImg={videoDetails.thumbnailImg}
                videoTitle={videoDetails.videoTitle}
                videoType={videoDetails.videoType}
                setShowVideoPlayer={setShowVideoPlayer}
              />
            )}
            <div className="browse-list">
              <IonList ref={parent}>
                {parentStack.length > 0 && (
                  <IonItem onClick={handleBackClick} className="hover-effect">
                    <IonIcon icon={chevronUpCircleOutline} />
                    &nbsp;
                    <IonLabel>
                      <IonText>Folder Up</IonText>
                    </IonLabel>
                  </IonItem>
                )}
                {isLoading || browseData?.files.length !== 0 ? (
                  browseData?.files.map((item) => (
                    <IonItem
                      key={item.id}
                      onClick={() =>
                        handleItemClick(item.id, item.kind, item.parent_id)
                      }
                      className={
                        item.kind === 'drive#folder' ? 'hover-effect' : ''
                      }
                    >
                      {
                        <IonThumbnail className="thumbnail">
                          <IonImg
                            src={
                              item.kind === 'drive#folder'
                                ? item.icon_link
                                : item.thumbnail_link
                            }
                            className="thumbnail-img"
                            alt={item.name}
                            onIonError={(e) => {
                              e.target.src = item.icon_link
                            }}
                          ></IonImg>
                        </IonThumbnail>
                      }
                      <IonLabel>{item.name}</IonLabel>
                      <IonIcon
                        color="primary"
                        icon={ellipsisVerticalSharp}
                        size="default"
                        className="hover-effect"
                        slot="end"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedItem(item)
                          setShowModal(true) // Open modal on button click
                        }}
                      ></IonIcon>
                    </IonItem>
                  ))
                ) : (
                  <HelperCard
                    cardTitle="No Content to Browse"
                    cardSubtitle={
                      <IonText>Try again after adding content</IonText>
                    }
                    cardSubTitleStyle={{
                      display: 'flex',
                      flexDirection: 'column',
                      textAlign: 'justify',
                    }}
                    cardContent={helperCardContent}
                    icon={sadOutline}
                    titleColor="primary"
                  />
                )}
              </IonList>
            </div>
            {/* IonModal component for displaying additional options */}
            <IonModal
              isOpen={showModal}
              keepContentsMounted={true}
              onDidDismiss={closeModal}
              initialBreakpoint={1}
              breakpoints={[0, 1]}
            >
              <IonItemDivider color={'light'}>
                <h3 className="ion-text">
                  {selectedItem?.name}
                  {selectedItem?.kind !== 'drive#folder' && (
                    <>
                      <IonChip color={'warning'}>
                        {`${
                          selectedItem &&
                          selectedItem.size &&
                          (parseInt(selectedItem.size) || 0) > 1024 * 1024
                            ? formatFileSize(parseInt(selectedItem.size))
                            : formatFileSize(
                                parseInt(selectedItem?.size || '') || 0,
                              )
                        }`}
                      </IonChip>
                    </>
                  )}
                </h3>
              </IonItemDivider>
              <ModalOptions
                item={selectedItem}
                setShowModal={setShowModal}
                setIsLoading={setIsLoading}
                setVideoDetails={setVideoDetails}
                setShowVideoPlayer={setShowVideoPlayer}
                scrollToTop={scrollToTop}
                handleDeleteItem={handleDeleteItem}
              />
            </IonModal>
          </>
        </IonContent>
      </BlockUiLoader>
    </>
  )
}

export default BrowseFolders
