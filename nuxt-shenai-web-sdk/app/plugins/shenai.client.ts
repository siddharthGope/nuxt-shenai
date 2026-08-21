import CreateShenaiSDK from '@shenai/sdk'

// Provide the SDK factory only. Do NOT create the SDK here: CreateShenaiSDK()
// requests camera access, which would block app boot and can only reliably be
// granted from a user gesture (the Start Scan button).
export default defineNuxtPlugin(() => {
  return {
    provide: {
      createShenaiSDK: CreateShenaiSDK
    }
  }
})