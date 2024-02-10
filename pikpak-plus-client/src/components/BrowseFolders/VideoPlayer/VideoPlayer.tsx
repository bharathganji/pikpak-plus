import { IonButton, IonImg, IonItemDivider } from '@ionic/react'
import ReactPlayer from 'react-player/lazy'
import './VideoPlayer.css'

interface VideoPlayerProps {
  videoUrl?: string
  thumbnailImg?: string
  setShowVideoPlayer?: (value: boolean) => void
}

export default function VideoPlayer({
  videoUrl,
  thumbnailImg,
  setShowVideoPlayer,
}: VideoPlayerProps) {
  return (
      <div className="video-player-container">
        <ReactPlayer
          url={videoUrl}
          controls={true}
          width={'100%'}
          light={
            <IonImg
              src={thumbnailImg}
              alt="thumbnail"
              className="video-player-thumbnail-img"
            ></IonImg>
          }
          pip={true}
        />
        <IonButton
          color="danger"
          fill="outline"
          onClick={() => {
            setShowVideoPlayer && setShowVideoPlayer(false)
          }}
          className="video-player-close-button"
        >
          close player
        </IonButton>
        <IonItemDivider></IonItemDivider>
      </div>
    )
  
}
