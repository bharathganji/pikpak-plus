import {
  IonButton,
  IonItemDivider,
} from '@ionic/react'
import './VideoPlayer.css'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'
import { MediaPlayer, MediaProvider, Poster } from '@vidstack/react'
import { Captions } from '@vidstack/react'
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from '@vidstack/react/player/layouts/default'

interface VideoPlayerProps {
  videoUrl: string
  thumbnailImg?: string

  videoTitle?: string
  videoType?: string
  setShowVideoPlayer?: (value: boolean) => void
}

export default function VideoPlayer({
  videoUrl,
  thumbnailImg,
  videoTitle,
  videoType,
  setShowVideoPlayer,
}: VideoPlayerProps) {
  console.log('videoUrl', videoUrl)
  console.log('thumbnailImg', thumbnailImg)
  console.log('videoTitle', videoTitle)
  console.log('videoType', videoType)

  return (
    <div className="video-player-container">
      <MediaPlayer
        storage="storage-key"
        title="Sprite Fight"
        src={{ src: videoUrl, type: 'video/mp4' }}
        aspectRatio="16/9"
        className="video-player-media-player"
      >
        <MediaProvider />
        <Poster
          className="vds-poster"
          src={thumbnailImg}
          alt={videoTitle || 'Video Poster'}
        />
        <Captions className="vds-captions" />
        <DefaultVideoLayout
          noScrubGesture={false}
          thumbnails={thumbnailImg}
          icons={defaultLayoutIcons}
        />
      </MediaPlayer>
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
