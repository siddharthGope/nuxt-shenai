import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ai.lumi.shenai',
  appName: 'Lumi AI',
  webDir: '.output/public',
  server: {
    androidScheme: 'https'
  }
}

export default config
