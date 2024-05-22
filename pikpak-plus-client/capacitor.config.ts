import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'pikpak.plus',
  appName: 'pikpak-plus',
  webDir: 'dist',
  server: {
    hostname: 'pikpak-plus.com',
    androidScheme: 'https',
  },
}

export default config
