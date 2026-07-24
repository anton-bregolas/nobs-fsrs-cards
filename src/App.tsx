import { useMemo, useCallback, useState, useRef } from 'react'
import type { View, StoredWord, SrsCard, Word, DictMeta, ExportedData } from './types'
import { useSettings } from './hooks/useSettings'
import { useLocalStorage } from './hooks/useLocalStorage'
import { I18nProvider, useTranslation } from './i18n'
import { createEmptyCard } from 'ts-fsrs'
import { createScheduler, toCard, fromCard } from './utils/srs'
import rawData from './data/words-srp-rus-1200.json'
import TopBar from './components/TopBar'
import BottomBar from './components/BottomBar'
import Home from './components/Home'
import FavoritesTable from './components/FavoritesTable'
import LearnedTable from './components/LearnedTable'
import Settings from './components/Settings'
import ErrorBoundary from './components/ErrorBoundary'

const V_KEY = 'cardsLastScreen'
const CUSTOM_DICT_KEY = 'cardsCustomDict'
const CUSTOM_META_KEY = 'cardsCustomMeta'
const CUSTOM_DICT_NAME_KEY = 'cardsCustomDictName'

const FROMTO_FAV = 'fromToFavorites'
const FROMTO_LRN = 'fromToLearned'
const FROMTO_ANS = 'fromToAnswered'
const FROMTO_VIW = 'fromToViewed'
const TOFROM_FAV = 'toFromFavorites'
const TOFROM_LRN = 'toFromLearned'
const TOFROM_ANS = 'toFromAnswered'
const TOFROM_VIW = 'toFromViewed'
const FROMTO_EXFAV = 'fromToExFavorites'
const TOFROM_EXFAV = 'toFromExFavorites'

function getToday(): string {
  return new Date().toISOString()
}

function normalizeWord(w: Record<string, unknown>): Word {
  const word: Word = { id: w.id as number }
  for (const key of Object.keys(w)) {
    if (key !== 'id') {
      word[key] = w[key] as string | string[] | number | null
    }
  }
  return word
}

function useModeStorage<T>(key: string, initial: T) {
  return useLocalStorage<T>(key, initial)
}

function App() {
  const [view, setView] = useLocalStorage<View>(V_KEY, 'home')
  const [settings, setSettings] = useSettings()
  const { t } = useTranslation()

  const [fromToFavorites, setFromToFavorites] = useModeStorage<StoredWord[]>(FROMTO_FAV, [])
  const [fromToLearned, setFromToLearned] = useModeStorage<StoredWord[]>(FROMTO_LRN, [])
  const [fromToAnswered, setFromToAnswered] = useModeStorage<number[]>(FROMTO_ANS, [])
  const [fromToViewed, setFromToViewed] = useModeStorage<number[]>(FROMTO_VIW, [])

  const [toFromFavorites, setToFromFavorites] = useModeStorage<StoredWord[]>(TOFROM_FAV, [])
  const [toFromLearned, setToFromLearned] = useModeStorage<StoredWord[]>(TOFROM_LRN, [])
  const [toFromAnswered, setToFromAnswered] = useModeStorage<number[]>(TOFROM_ANS, [])
  const [toFromViewed, setToFromViewed] = useModeStorage<number[]>(TOFROM_VIW, [])

  const [fromToExFavorites, setFromToExFavorites] = useModeStorage<number[]>(FROMTO_EXFAV, [])
  const [toFromExFavorites, setToFromExFavorites] = useModeStorage<number[]>(TOFROM_EXFAV, [])

  const [srsCards, setSrsCards] = useLocalStorage<SrsCard[]>('srsCards', [])

  const pb = settings.phrasebookMode

  const favorites = pb ? toFromFavorites : fromToFavorites
  const setFavorites = pb ? setToFromFavorites : setFromToFavorites
  const learned = pb ? toFromLearned : fromToLearned
  const setLearned = pb ? setToFromLearned : setFromToLearned
  const answered = pb ? toFromAnswered : fromToAnswered
  const setAnswered = pb ? setToFromAnswered : setFromToAnswered
  const viewed = pb ? toFromViewed : fromToViewed
  const setViewed = pb ? setToFromViewed : setFromToViewed
  const exFavorites = pb ? toFromExFavorites : fromToExFavorites
  const setExFavorites = pb ? setToFromExFavorites : setFromToExFavorites

  const saveRef = useRef<HTMLButtonElement>(null)
  const homeInputRef = useRef<HTMLInputElement>(null)

  const handleSkipToSection = useCallback(() => {
    if (view === 'settings') {
      saveRef.current?.focus()
    } else if (view === 'home') {
      homeInputRef.current?.focus()
    }
  }, [view])

  const dictMeta: DictMeta = useMemo(() => {
    const arr = rawData as unknown[]
    const meta = arr[0] as DictMeta
    return meta
  }, [])

  const wordList = useMemo(() => {
    const arr = rawData as unknown[]
    const words = arr.slice(1) as Record<string, unknown>[]
    return words.map(normalizeWord)
  }, [])

  const scheduler = useMemo(
    () => createScheduler(settings.customIntervalAgain, settings.customIntervalGood),
    [settings.customIntervalAgain, settings.customIntervalGood]
  )

  const [resetKey, setResetKey] = useState(0)
  const [matchPct, setMatchPct] = useState<number | null>(null)
  const [customWords, setCustomWords] = useState<Word[] | null>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_DICT_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, unknown>[]
        return parsed.map(normalizeWord)
      }
    } catch { /* ignore */ }
    return null
  })

  const [customMeta, setCustomMeta] = useState<DictMeta | null>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_META_KEY)
      if (stored) {
        return JSON.parse(stored) as DictMeta
      }
    } catch { /* ignore */ }
    return null
  })

  const [customDictName, setCustomDictName] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_DICT_NAME_KEY)
      if (stored) return stored
    } catch { /* ignore */ }
    return null
  })

  const displayWords = useMemo(() => customWords || wordList, [customWords, wordList])

  const displayMeta: DictMeta = useMemo(() => {
    if (customMeta) return customMeta
    if (customWords && customWords.length > 0) {
      return {
        type: 'custom',
        langFrom: dictMeta.langFrom,
        langTo: dictMeta.langTo,
        langToAlt: dictMeta.langToAlt,
        langRef: dictMeta.langRef,
      }
    }
    return dictMeta
  }, [customWords, customMeta, dictMeta])

  const dictionaryId = useMemo(() => {
    let hash = 0
    for (const w of displayWords) {
      const ref = w[displayMeta.langRef] ?? w[displayMeta.langTo]
      const str = `${w.id}|${ref}`
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i)
        hash |= 0
      }
    }
    return `${displayMeta.type}-${displayMeta.langFrom}-${displayMeta.langTo}-${displayWords.length}-${hash}`
  }, [displayWords, displayMeta])

  const totalWords = displayWords.length

  const handleAddViewed = useCallback((id: number) => {
    setViewed((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [setViewed])

  const handleAddAnswered = useCallback((id: number) => {
    setAnswered((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [setAnswered])

  const handleToggleFavorite = useCallback((id: number) => {
    const isAlreadyFavorite = favorites.some((f) => f.id === id)
    if (!isAlreadyFavorite) {
      const learnedAccuStat = learned.find((l) => l.id === id)?.accuStat
      setLearned((prev) => prev.filter((l) => l.id !== id))
      setFavorites((prev) => {
        const existing = prev.find((f) => f.id === id)
        if (existing) return prev.filter((f) => f.id !== id)
        const item: StoredWord = { id, addedAt: getToday() }
        if (matchPct !== null) {
          item.accuStat = [...(learnedAccuStat ?? []), matchPct]
        } else if (learnedAccuStat?.length) {
          item.accuStat = learnedAccuStat
        }
        return [...prev, item]
      })
      setExFavorites((prev) => prev.filter((eid) => eid !== id))
    } else {
      setFavorites((prev) => prev.filter((f) => f.id !== id))
      setExFavorites((prev) => prev.includes(id) ? prev : [...prev, id])
    }
  }, [favorites, setFavorites, setLearned, matchPct, pb, learned, setExFavorites])

  const handleToggleLearned = useCallback((id: number) => {
    const isAlreadyLearned = learned.some((l) => l.id === id)
    if (!isAlreadyLearned) {
      const favAccuStat = favorites.find((f) => f.id === id)?.accuStat
      setFavorites((prev) => prev.filter((f) => f.id !== id))
      setSrsCards((prev) => prev.filter((s) => s.id !== id))
      setLearned((prev) => {
        const existing = prev.find((l) => l.id === id)
        if (existing) return prev.filter((l) => l.id !== id)
        const item: StoredWord = { id, addedAt: getToday() }
        if (matchPct !== null) {
          item.accuStat = [...(favAccuStat ?? []), matchPct]
        } else if (favAccuStat?.length) {
          item.accuStat = favAccuStat
        }
        return [...prev, item]
      })
    } else {
      setLearned((prev) => prev.filter((l) => l.id !== id))
    }
  }, [learned, setLearned, setFavorites, setSrsCards, matchPct, pb, favorites])

  const handleNavigate = useCallback((newView: View) => {
    setView(newView)
  }, [setView])

  const handleReset = useCallback(() => {
    setFromToFavorites([])
    setFromToLearned([])
    setFromToAnswered([])
    setFromToViewed([])
    setToFromFavorites([])
    setToFromLearned([])
    setToFromAnswered([])
    setToFromViewed([])
    setFromToExFavorites([])
    setToFromExFavorites([])
    setSrsCards([])
    const hasCustom = localStorage.getItem(CUSTOM_DICT_KEY) !== null
    if (hasCustom) {
      localStorage.removeItem(CUSTOM_DICT_KEY)
      localStorage.removeItem(CUSTOM_META_KEY)
      localStorage.removeItem(CUSTOM_DICT_NAME_KEY)
      setCustomWords(null)
      setCustomMeta(null)
      setCustomDictName(null)
    }
    localStorage.removeItem('cardsSettings')
    setSettings({
      autoFlipOnWrongAttempts: false,
      autoAdvanceOnLearn: false,
      autoAddRankedToFavorites: false,
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
    })
    setResetKey((k) => k + 1)
  }, [setSettings])

  const handleExport = useCallback(() => {
    const data: ExportedData = {
      dictId: dictionaryId,
      version: 2,
      fromToFavorites,
      fromToLearned,
      fromToAnswered,
      fromToViewed,
      toFromFavorites,
      toFromLearned,
      toFromAnswered,
      toFromViewed,
      fromToExFavorites,
      toFromExFavorites,
      srsCards,
    }
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nobscards-${date}-${dictionaryId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [dictionaryId, fromToFavorites, fromToLearned, fromToAnswered, fromToViewed, toFromFavorites, toFromLearned, toFromAnswered, toFromViewed, fromToExFavorites, toFromExFavorites, srsCards])

  const handleImportData = useCallback((data: ExportedData) => {
    setFromToFavorites(Array.isArray(data.fromToFavorites) ? data.fromToFavorites : [])
    setFromToLearned(Array.isArray(data.fromToLearned) ? data.fromToLearned : [])
    setFromToAnswered(Array.isArray(data.fromToAnswered) ? data.fromToAnswered : [])
    setFromToViewed(Array.isArray(data.fromToViewed) ? data.fromToViewed : [])
    setToFromFavorites(Array.isArray(data.toFromFavorites) ? data.toFromFavorites : [])
    setToFromLearned(Array.isArray(data.toFromLearned) ? data.toFromLearned : [])
    setToFromAnswered(Array.isArray(data.toFromAnswered) ? data.toFromAnswered : [])
    setToFromViewed(Array.isArray(data.toFromViewed) ? data.toFromViewed : [])
    setFromToExFavorites(Array.isArray(data.fromToExFavorites) ? data.fromToExFavorites : [])
    setToFromExFavorites(Array.isArray(data.toFromExFavorites) ? data.toFromExFavorites : [])
    setSrsCards(data.version >= 2 && Array.isArray(data.srsCards) ? data.srsCards : [])
    setResetKey((k) => k + 1)
  }, [])

  const handleChangeDictionary = useCallback((newWords: Word[], meta?: DictMeta, dictName?: string) => {
    const normalized = newWords.map((w) => {
      const word: Word = { id: w.id }
      for (const key of Object.keys(w)) {
        if (key !== 'id') word[key] = w[key]
      }
      return word
    })
    localStorage.setItem(CUSTOM_DICT_KEY, JSON.stringify(normalized))
    setCustomWords(normalized)
    if (meta) {
      setCustomMeta(meta)
      localStorage.setItem(CUSTOM_META_KEY, JSON.stringify(meta))
    } else {
      setCustomMeta(null)
      localStorage.removeItem(CUSTOM_META_KEY)
    }
    if (dictName) {
      setCustomDictName(dictName)
      localStorage.setItem(CUSTOM_DICT_NAME_KEY, dictName)
    } else {
      setCustomDictName(null)
      localStorage.removeItem(CUSTOM_DICT_NAME_KEY)
    }
    if (meta?.type === 'words') {
      setSettings((prev) => ({ ...prev, phrasebookMode: false }))
    } else if (meta?.type === 'phrases') {
      setSettings((prev) => ({ ...prev, phrasebookMode: true }))
    }
    setFromToFavorites([])
    setFromToLearned([])
    setFromToAnswered([])
    setFromToViewed([])
    setToFromFavorites([])
    setToFromLearned([])
    setToFromAnswered([])
    setToFromViewed([])
    setSrsCards([])
    setResetKey((k) => k + 1)
  }, [setSettings])

  const handleUpdateFavoriteAccuStat = useCallback((id: number, pct: number) => {
    setFavorites((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f
        const accuStat = [...(f.accuStat ?? []), pct]
        return { ...f, pct, accuStat }
      })
    )
  }, [setFavorites])

  const handleReviewSaved = useCallback((wordId: number, rating: number) => {
    setSrsCards((prev) => {
      const existing = prev.find((s) => s.id === wordId)
      const addedAt = existing?.addedAt ?? getToday()
      const base = existing ? toCard(existing) : { ...createEmptyCard(), id: wordId }
      const result = scheduler.next(base, new Date(), rating)
      const updated = fromCard(result.card, wordId, addedAt, rating)
      if (existing) {
        return prev.map((s) => (s.id === wordId ? updated : s))
      }
      return [...prev, updated]
    })
  }, [setSrsCards, scheduler])

  const handleRemoveFromSrs = useCallback((wordId: number) => {
    setSrsCards((prev) => prev.filter((s) => s.id !== wordId))
  }, [setSrsCards])

  return (
    <I18nProvider lang={settings.language}>
    <div className="min-h-dvh flex flex-col bg-bg">
      <TopBar view={view} onNavigate={handleNavigate} onSkipToSection={handleSkipToSection} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-9 smh:pt-24 pb-20">
        <div className={view === 'home' ? 'contents' : 'hidden'}>
          <Home key={resetKey}
            ref={homeInputRef}
            words={displayWords}
            favorites={favorites}
            learned={learned}
            srsCards={srsCards}
            exFavorites={exFavorites}
            settings={settings}
            dictMeta={displayMeta}
            currentView={view}
            onToggleFavorite={handleToggleFavorite}
            onToggleLearned={handleToggleLearned}
            onAddViewed={handleAddViewed}
            onAddAnswered={handleAddAnswered}
            onMatchResult={setMatchPct}
            onUpdateFavoriteAccuStat={handleUpdateFavoriteAccuStat}
            onReviewSaved={handleReviewSaved}
            onRemoveFromSrs={handleRemoveFromSrs}
            scheduler={scheduler}
          />
        </div>
        {view === 'favorites' && (
          <div className="w-full animate-fade-in-up1">
            <h1 className="text-lg font-semibold text-subhead text-center mb-4">{t('nav.favorites')}</h1>
            <ErrorBoundary>
              <FavoritesTable
                favorites={favorites}
                words={displayWords}
                dictMeta={displayMeta}
                srsCards={srsCards}
                onToggleFavorite={handleToggleFavorite}
                phrasebookMode={settings.phrasebookMode}
                useAltInputLang={settings.useAltInputLang}
                useRefLangForLabels={settings.useRefLangForLabels}
                sortFavoritesBy={settings.sortFavoritesBy}
                onSortFavoritesBy={(arr) => setSettings({ ...settings, sortFavoritesBy: arr })}
              />
            </ErrorBoundary>
          </div>
        )}
        {view === 'learned' && (
          <div className="w-full animate-fade-in-up1">
            <h1 className="text-lg font-semibold text-subhead text-center mb-4">{t('nav.learned')}</h1>
            <ErrorBoundary>
              <LearnedTable
                learned={learned}
                words={displayWords}
                dictMeta={displayMeta}
                onToggleLearned={handleToggleLearned}
                phrasebookMode={settings.phrasebookMode}
                useAltInputLang={settings.useAltInputLang}
                useRefLangForLabels={settings.useRefLangForLabels}
                sortLearnedBy={settings.sortLearnedBy}
                onSortLearnedBy={(arr) => setSettings({ ...settings, sortLearnedBy: arr })}
              />
            </ErrorBoundary>
          </div>
        )}
        {view === 'settings' && (
          <div className="w-full animate-fade-in-up1">
            <Settings
              settings={settings}
              onUpdate={setSettings}
              onReset={handleReset}
              dictionaryId={dictionaryId}
              onExport={handleExport}
              onImportData={handleImportData}
              onChangeDictionary={handleChangeDictionary}
              saveRef={saveRef}
              initialDictName={customDictName}
            />
          </div>
        )}
      </main>

      <BottomBar
        view={view}
        onNavigate={handleNavigate}
        learnedCount={learned.length}
        viewedCount={viewed.length}
        answeredCount={answered.length}
        totalWords={totalWords}
        matchPct={matchPct}
        phrasebookMode={settings.phrasebookMode}
      />
    </div>
    </I18nProvider>
  )
}

export default App
