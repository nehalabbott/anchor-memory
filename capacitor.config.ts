import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.anchor.memory',
  appName: 'Anchor',
  webDir: 'dist',
  server: {
    androidScheme: process.env.CAPACITOR_ANDROID_SCHEME === 'http' ? 'http' : 'https',
    cleartext: process.env.CAPACITOR_ALLOW_CLEARTEXT === 'true',
  },
}

export default config
