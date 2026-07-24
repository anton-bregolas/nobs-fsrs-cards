export interface DictMeta {
  type: string
  langFrom: string
  langTo: string
  langToAlt: string
  langRef: string
}

export interface Word {
  id: number
  [key: string]: string | string[] | number | null
}

export type View = 'home' | 'favorites' | 'learned' | 'settings'

export type TTSService = 'web' | 'google' | 'azure'

export interface StoredWord {
  id: number
  addedAt: string
  accuStat?: number[]
}

export interface SrsCard {
  id: number
  addedAt: string
  due: string
  stability: number
  difficulty: number
  reps: number
  lapses: number
  state: number
  lastReview?: string
  lastRating?: number
}

export interface AppSettings {
  autoFlipOnWrongAttempts: number | false
  autoAdvanceOnLearn: boolean
  autoAddAnsweredToLearned: boolean
  phrasebookMode: boolean
  phrasebookThreshold: number
  useAltInputLang: boolean
  useRefLangForLabels: boolean
  enableTTS: boolean
  ttsService: TTSService
  ttsKey: string
  sortFavoritesBy: string[]
  sortLearnedBy: string[]
  language: string
  customIntervalAgain: number | false
  customIntervalGood: number | false
  autoAddRankedToFavorites: boolean
}

export interface ExportedData {
  dictId: string
  version: number
  fromToFavorites: StoredWord[]
  fromToExFavorites: number[]
  fromToLearned: StoredWord[]
  fromToAnswered: number[]
  fromToViewed: number[]
  toFromFavorites: StoredWord[]
  toFromExFavorites: number[]
  toFromLearned: StoredWord[]
  toFromAnswered: number[]
  toFromViewed: number[]
  srsCards?: SrsCard[]
}
