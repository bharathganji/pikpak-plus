import React, { useEffect, useState } from 'react'
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
} from '@ionic/react'
import { chevronUpCircleOutline, ellipsisVerticalSharp } from 'ionicons/icons'
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
// import { Bdata } from '../../constants/constants'
import VideoPlayer from './VideoPlayer/VideoPlayer'

const BrowseFolders: React.FC = () => {
  const [browseData, setBrowseData] = useState<FileListResponse | null>(null)
  const [parentStack, setParentStack] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorToast, setErrorToast] = useState<string | null>(null) // State for error toast
  const [directory, setDirectory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null)
  const [showModal, setShowModal] = useState(false)

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

  // Function to fetch browse data from the server
  const fetchBrowseData = async (itemIndex: string | null) => {
    try {
      setIsLoading(true)
      const response = await makeBrowseRequest(itemIndex)
      if (response.status !== 200) {
        throw new Error('Unauthorized')
      }
      const data = response.data
      // setBrowseData(Bdata)
      setBrowseData(data)
    } catch (error: any) {
      setErrorToast('Error fetching browse data ' + error.message) // Set error message for toast
    } finally {
      setIsLoading(false)
    }
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
      } catch (error: any) {
        setErrorToast('Error fetching browse data ' + error.message) // Set error message for toast
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

    // Fetch browse data for the new parent_id
    fetchBrowseData(parent_id || '')
  }
  interface VideoPlayerProps {
    videoUrl?: string
    thumbnailImg?: string
  }
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const [videoDetails, setVideoDetails] = useState<VideoPlayerProps>({})
  // setThumbnailImg(
  //   'https://sg-thumbnail-drive.mypikpak.com/v0/screenshot-thumbnails/C3B3AE39C1CE9B2C6B41862779ABE84E9C41620F/720/2048',
  // )
  // setVideoUrl(
  //   'https://dl-a10b-0876.mypikpak.com/download/?fid=HpWf7wGS5u2xkejyMtX5RBTtNXCWbpQVJaWmSZ4dr3jPcCwR0Oj13PTaYuj_mDHxETkHFRwfvBdRch3-baBrZ2DoZzT-vUu_tJ2oJhKlEDU=&from=5&verno=3&prod=1101&expire=1707590080&g=515D8FD35314CD856BE4ABF4F8B0BCD7CCA80815&ui=ZQBzavpEGpmtcaEy&t=0&ms=9437184&th=9437184&f=1513722617&alt=0&fileid=VNpiiKSx1eVOIdC9SDnQjI7Zo1&userid=ZQBzavpEGpmtcaEy&pr=XQPkPvr9WWiIuMvELmrVen6Q4nyOnrsbnuDSDort4hQFGIRCRyiZFkq1DHNhyU6syfWq_bLo1F2-pKBOBQV5YTt4D3lCbbNr0rJbx2YhUdTBGucyk_bx17SRzqWFw33bQsgKUco7hrZYnn5RARkw-NFhhrCMMjUUPvhoxaYs7-oGyV92EeGV2lV7Gsa0nMl2qcVG4MaQA7SxFQPPgMh7jDAM9jUrEm4CCa14HuNTUtszOc1xvSKCtPHwpUbU2u5TPzdvPNEtj2X3MIlYXt9P4khUoQ_FIHaE_wyI6kHotrP8EUSq7APbpHFqX0FSOTshemiYEx1W5gcy57p1ATA8rw==&sign=B3D619BFF730F13A5754D4BB1F1CE9F3',
  // )
  console.log(showVideoPlayer)

  return (
    <>
      <CustomIonHeader title="Browse Folders" />

      <BlockUiLoader loading={isLoading}>
        <IonContent fullscreen={true}>
          <>
            {errorToast && (
              <IonToast
                isOpen={!!errorToast}
                onDidDismiss={() => setErrorToast(null)}
                message={errorToast}
                duration={3000}
              />
            )}
            {showVideoPlayer && (
              <VideoPlayer
                videoUrl={videoDetails.videoUrl}
                thumbnailImg={videoDetails.thumbnailImg}
                setShowVideoPlayer={setShowVideoPlayer}
              />
            )}
            <div className="browse-list">
              <IonList>
                {parentStack.length > 0 && (
                  <IonItem
                    onClick={handleBackClick}
                    color="light"
                    className="hover-effect"
                  >
                    <IonIcon slot="start" icon={chevronUpCircleOutline} />
                    <IonLabel>
                      <IonText>Folder Up</IonText>
                    </IonLabel>
                  </IonItem>
                )}
                {browseData?.files.map((item) => (
                  <IonItem
                    // color="light"
                    key={item.id}
                    onClick={() =>
                      handleItemClick(item.id, item.kind, item.parent_id)
                    }
                    className={
                      item.kind === 'drive#folder' ? 'hover-effect' : ''
                    }
                  >
                    {/* <IonIcon
                      slot="start"
                      color="primary"
                      icon={
                        item.kind === 'drive#folder'
                          ? folderOpen
                          : document
                      }
                    /> */}
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
                ))}
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
              />
            </IonModal>
          </>
        </IonContent>
      </BlockUiLoader>
    </>
  )
}

export default BrowseFolders
