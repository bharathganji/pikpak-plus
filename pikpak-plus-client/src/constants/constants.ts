import { logoGithub, heart, link, rocket, logoAndroid } from 'ionicons/icons'
import telegram from '../assets/telegram.svg'

export const usefullLinks = [
  {
    link: 'Support US',
    value: 'https://www.buymeacoffee.com/bharathganji',
    icon: heart,
  },
  {
    link: 'PikPak Invitation (premium)',
    value:
      'https://mypikpak.com/drive/activity/invited?invitation-code=47295398',
    icon: rocket,
  },
  {
    link: 'Github',
    value: 'https://github.com/bharathganji/pikpak-plus',
    icon: logoGithub,
  },

  {
    link: 'PikPak-Plus APK',
    value:
      'https://github.com/bharathganji/pikpak-plus/raw/main/pikpak-plus-client/android/app/release/app-release.apk',
    icon: logoAndroid,
  },

  {
    link: 'Telegram',
    value: 'https://t.me/pikpak_plus',
    icon: telegram,
  },

  {
    link: 'Navi Downloader Android',
    value:
      'https://github.com/TachibanaGeneralLaboratories/download-navi/releases/',
    icon: link,
  },
  {
    link: 'VLC Media Player',
    value: 'https://www.videolan.org/vlc/',
    icon: link,
  },
]
export const help = [
  'Download torrent links to Cloud ⚡',
  'Cumulative download quota 4TB/month',
  'Storage capacity of 10TB',
  'Search multiple Torrent Indexers',
  'Share files with your friends',
]

export const MAX_PLAY_SIZE_LIMIT_IN_BYTES = '4294967296'
