import type { HealthRisks } from '@shenai/capacitor-sdk'
import type { RiskProfile, RiskScores } from '~/composables/useHealthStore'

export type RecommendationPayload = {
  schemaVersion: 1
  userId: string
  generatedAt: string
  measurements: {
    scanDate: string | null
    heartRate: number
    systolic: number
    diastolic: number
    bloodPressure: string
    hrv: number
    stress: number
    breathingRate: number
    wellness: number
    bmi: number | null
  }
  profile: RiskProfile
  healthRisks: {
    scores: RiskScores
    raw: HealthRisks | null
  }
}

type BuildInput = {
  userId: string
  scanDate: string | null
  measurements: {
    heartRate: number
    systolic: number
    diastolic: number
    hrv: number
    stress: number
    breathingRate: number
  }
  wellness: number
  bmi: number | null
  profile: RiskProfile
  scores: RiskScores
  risks: HealthRisks | null
}

export const useRecommendationPayload = () => {
  const config = useRuntimeConfig()

  function buildRecommendationPayload(input: BuildInput): RecommendationPayload {
    const { heartRate, systolic, diastolic, hrv, stress, breathingRate } = input.measurements

    return {
      schemaVersion: 1,
      userId: input.userId,
      generatedAt: new Date().toISOString(),
      measurements: {
        scanDate: input.scanDate,
        heartRate,
        systolic,
        diastolic,
        bloodPressure: `${systolic}/${diastolic}`,
        hrv,
        stress,
        breathingRate,
        wellness: input.wellness,
        bmi: input.bmi
      },
      profile: input.profile,
      healthRisks: {
        scores: input.scores,
        // The native SDK payload is forwarded untouched so the agent can use
        // any risk field we do not surface in the UI.
        raw: input.risks
      }
    }
  }

  async function sendRecommendationPayload(payload: RecommendationPayload) {
    const endpoint = config.public.recommendationApiUrl as string | undefined
    if (!endpoint) {
      throw new Error('Missing NUXT_PUBLIC_RECOMMENDATION_API_URL. Set it to the recommendation agent endpoint.')
    }

    return await $fetch(endpoint, {
      method: 'POST',
      body: payload
    })
  }

  return { buildRecommendationPayload, sendRecommendationPayload }
}
