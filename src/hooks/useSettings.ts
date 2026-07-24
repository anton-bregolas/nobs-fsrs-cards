import { useMemo } from 'react'
import type { AppSettings } from '../types'
import { useLocalStorage } from './useLocalStorage'

const defaultSettings: AppSettings = {
  autoFlipOnWrongAttempts: false,
  autoAdvanceOnLearn: false,
  autoAddAnsweredToLearned: false,
  phrasebookMode: false,
  phrasebookThreshold: 75,
  useAltInputLang: false,
  useRefLangForLabels: false,
  enableTTS: false,
  ttsService: 'web',
  ttsKey: '',
  sortFavoritesBy: ['date_desc'],
  sortLearnedBy: ['date_desc'],
  language: 'ru',
  customIntervalAgain: false,
  customIntervalGood: false,
  autoAddRankedToFavorites: false,
}

export function useSettings() {
  const [raw, setRaw] = useLocalStorage<AppSettings>('cardsSettings', defaultSettings)
  const settings = useMemo(() => ({ ...defaultSettings, ...raw }), [raw])
  return [settings, setRaw] as const
}
