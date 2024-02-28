import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'pikpak.plus',
  appName: 'pikpak-plus',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
