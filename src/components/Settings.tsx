import { useState, useRef, useCallback, useEffect } from 'react'
import type { AppSettings, ExportedData, Word, DictMeta } from '../types'
import { useTranslation, APP_LANGUAGES, timeUnitKey } from '../i18n'
import { validateGoogleKey, validateAzureKey } from '../utils/tts'

interface SettingsProps {
  settings: AppSettings
  onUpdate: (settings: AppSettings) => void
  onReset: () => void
  dictionaryId: string
  onExport: () => void
  onImportData: (data: ExportedData) => void
  onChangeDictionary: (words: Word[], meta?: DictMeta, dictName?: string) => void
  saveRef?: React.RefObject<HTMLButtonElement | null>
  initialDictName?: string | null
}

export default function Settings({
  settings,
  onUpdate,
  onReset,
  dictionaryId,
  onExport,
  onImportData,
  onChangeDictionary,
  saveRef: saveRefProp,
  initialDictName,
}: SettingsProps) {
  const [pendingWrong, setPendingWrong] = useState(
    typeof settings.autoFlipOnWrongAttempts === 'number' ? settings.autoFlipOnWrongAttempts : 3,
  )
  const [pendingAgain, setPendingAgain] = useState(
    typeof settings.customIntervalAgain === 'number' ? settings.customIntervalAgain : 1,
  )
  const [pendingGood, setPendingGood] = useState(
    typeof settings.customIntervalGood === 'number' ? settings.customIntervalGood : 10,
  )
  const { t } = useTranslation()
  const [showTtsPopover, setShowTtsPopover] = useState(false)
  const [ttsKeyInput, setTtsKeyInput] = useState('')
  const [ttsMsg, setTtsMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [pendingDict, setPendingDict] = useState<{ words: Word[]; meta?: DictMeta } | null>(null)
  const [pendingDictFileName, setPendingDictFileName] = useState('')
  const [dictFileName, setDictFileName] = useState(initialDictName ?? 'words-srp-rus-1200')
  const prevDictIdRef = useRef(dictionaryId)
  const prevDictNameRef = useRef(initialDictName)
  const importRef = useRef<HTMLInputElement>(null)
  const dictRef = useRef<HTMLInputElement>(null)
  const errorPopover = useRef<HTMLDivElement>(null)
  const dictConfirmPopover = useRef<HTMLDivElement>(null)
  const ttsResetConfirmRef = useRef<HTMLDivElement>(null)
  const importSuccessPopover = useRef<HTMLDivElement>(null)
  const internalSaveRef = useRef<HTMLButtonElement>(null)
  const saveRef = saveRefProp ?? internalSaveRef

  const dictIdMatch = (a: string, b: string) => {
    const strict = localStorage.getItem('useStrictDictIdChecks') === 'true'
    return strict ? a === b : a.split('-').slice(0, 3).join('-') === b.split('-').slice(0, 3).join('-')
  }

  useEffect(() => {
    if (prevDictIdRef.current !== dictionaryId) {
      prevDictIdRef.current = dictionaryId
      setDictFileName(initialDictName ?? 'words-srp-rus-1200')
    } else if (prevDictNameRef.current !== initialDictName) {
      prevDictNameRef.current = initialDictName
      setDictFileName(initialDictName ?? 'words-srp-rus-1200')
    }
  }, [dictionaryId, initialDictName])

  const handleStepperKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    const group = target.closest<HTMLElement>('[role="group"]')
    if (!group) return
    const controls = Array.from(group.querySelectorAll<HTMLElement>('[data-stepper]'))
    const idx = controls.indexOf(target)
    if (idx === -1) return
    let next = -1
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        next = idx < controls.length - 1 ? idx + 1 : 0
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        next = idx > 0 ? idx - 1 : controls.length - 1
        break
      case 'Home':
        e.preventDefault()
        next = 0
        break
      case 'End':
        e.preventDefault()
        next = controls.length - 1
        break
    }
    if (next >= 0 && next < controls.length) {
      controls[next].focus()
    }
  }, [])

  const customWrongAttempsOn = typeof settings.autoFlipOnWrongAttempts === 'number'
  const wrongValue: number = customWrongAttempsOn ? (settings.autoFlipOnWrongAttempts as number) : pendingWrong
  const customAgainIntervalOn = typeof settings.customIntervalAgain === 'number'
  const againValue: number = customAgainIntervalOn ? (settings.customIntervalAgain as number) : pendingAgain
  const customGoodIntervalOn = typeof settings.customIntervalGood === 'number'
  const goodValue: number = customGoodIntervalOn ? (settings.customIntervalGood as number) : pendingGood

  const showPopover = (el: HTMLDivElement | null) => {
    requestAnimationFrame(() => el?.showPopover())
  }

  const handleImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target!.result as string) as ExportedData
        if (!dictIdMatch(raw.dictId, dictionaryId)) {
          setImportError(t('error.dictIdMismatch'))
          showPopover(errorPopover.current)
          return
        }
        if (
          !Array.isArray(raw.fromToFavorites) ||
          !Array.isArray(raw.fromToLearned) ||
          !Array.isArray(raw.fromToAnswered) ||
          !Array.isArray(raw.fromToViewed) ||
          !Array.isArray(raw.toFromFavorites) ||
          !Array.isArray(raw.toFromLearned) ||
          !Array.isArray(raw.toFromAnswered) ||
          !Array.isArray(raw.toFromViewed)
        ) {
          setImportError(t('error.fileCorrupted'))
          showPopover(errorPopover.current)
          return
        }
        onImportData(raw)
        setImportSuccess(t('error.importSuccess'))
        showPopover(importSuccessPopover.current)
      } catch {
        setImportError(t('error.readFailed'))
        showPopover(errorPopover.current)
      }
    }
    reader.readAsText(file)
  }

  const handleDictFile = (file: File) => {
    const fileName = file.name.replace(/\.json$/i, '')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target!.result as string) as unknown[]
        if (!Array.isArray(raw) || raw.length === 0) {
          setImportError(t('error.notDictArray'))
          showPopover(errorPopover.current)
          return
        }

        const first = raw[0] as Record<string, unknown>
        const hasMeta = first && typeof first === 'object' && 'type' in first

        if (hasMeta) {
          const meta = first as unknown as DictMeta
          const wordData = raw.slice(1) as Record<string, unknown>[]
          if (wordData.length === 0 || typeof wordData[0].id !== 'number') {
            setImportError(t('error.notDictWithMeta'))
            showPopover(errorPopover.current)
            return
          }
          const words = wordData.map((w) => ({ id: w.id as number, ...w }))
          setPendingDict({ words, meta })
          setPendingDictFileName(fileName)
        } else if (typeof first.id !== 'number') {
          setImportError(t('error.notDictArray'))
          showPopover(errorPopover.current)
          return
        } else {
          const words = raw.map((w) => w as Word)
          setPendingDict({ words })
          setPendingDictFileName(fileName)
        }

        showPopover(dictConfirmPopover.current)
      } catch {
        setImportError(t('error.readFailed'))
        showPopover(errorPopover.current)
      }
    }
    reader.readAsText(file)
  }

  const confirmDictChange = () => {
    if (pendingDict) {
      onChangeDictionary(pendingDict.words, pendingDict.meta, pendingDictFileName)
      setDictFileName(pendingDictFileName)
      setPendingDict(null)
      setPendingDictFileName('')
    }
    dictConfirmPopover.current?.hidePopover()
  }

  useEffect(() => {
    if (!ttsMsg) return
    const timer = setTimeout(() => setTtsMsg(null), 3000)
    return () => clearTimeout(timer)
  }, [ttsMsg])

  const openTtsPopover = () => {
    setTtsKeyInput(settings.ttsKey)
    setTtsMsg(null)
    setShowTtsPopover(true)
  }

  const handleTtsGoogle = async () => {
    const ok = await validateGoogleKey(ttsKeyInput)
    if (ok) {
      onUpdate({ ...settings, ttsKey: ttsKeyInput, ttsService: 'google' })
      setTtsMsg({ ok: true, text: t('settings.ttsKeySuccess') })
    } else {
      setTtsMsg({ ok: false, text: t('settings.ttsKeyError') })
    }
  }

  const handleTtsAzure = async () => {
    const ok = await validateAzureKey(ttsKeyInput)
    if (ok) {
      onUpdate({ ...settings, ttsKey: ttsKeyInput, ttsService: 'azure' })
      setTtsMsg({ ok: true, text: t('settings.ttsKeySuccess') })
    } else {
      setTtsMsg({ ok: false, text: t('settings.ttsKeyError') })
    }
  }

  const handleTtsReset = () => {
    showPopover(ttsResetConfirmRef.current)
  }

  const confirmTtsReset = () => {
    onUpdate({ ...settings, ttsKey: '', ttsService: 'web' })
    setTtsKeyInput('')
    setTtsMsg(null)
    setShowTtsPopover(false)
    ttsResetConfirmRef.current?.hidePopover()
  }

  const handleTtsClose = () => {
    setShowTtsPopover(false)
    setTtsKeyInput('')
    setTtsMsg(null)
  }

  return (
    <section className="w-full mx-auto space-y-6 max-sm:max-w-[70%] sm:max-w-md">
      <h2 className="text-xl font-semibold text-subhead text-center">{t('settings.title')}</h2>

      <fieldset className="space-y-2">
        <legend className="text-sm text-text">{t('settings.language')}</legend>
        <div className="lang-setting flex border border-text/20 rounded-lg overflow-hidden opacity-90">
          {Object.entries(APP_LANGUAGES).map(([code, name]) => (
            <label
              key={code}
              className={`flex-1 px-3 py-1.5 text-sm text-center cursor-pointer transition-colors duration-200 ${
                settings.language === code
                  ? 'bg-accent text-bg font-medium'
                  : 'text-subhead hover:bg-subhead/20'
              }`}
            >
              <input
                type="radio"
                name="language"
                value={code}
                checked={settings.language === code}
                onChange={() => onUpdate({ ...settings, language: code })}
                className="sr-only"
              />
              <span>{name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3" role="group" aria-label={t('settings.learningAgainGroup')} onKeyDown={handleStepperKeyDown}>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={customAgainIntervalOn}
            onChange={() =>
              onUpdate({
                ...settings,
                customIntervalAgain: customAgainIntervalOn ? false : pendingAgain,
              })
            }
            className="mt-0.5"
            data-stepper
          />
          <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
            {t('settings.learningAgain')}
          </span>
        </label>
        <div className="flex max-sm:flex-col max-sm:items-start sm:items-center gap-3 ml-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const v = Math.max(1, againValue - 1)
                setPendingAgain(v)
                if (customAgainIntervalOn) onUpdate({ ...settings, customIntervalAgain: v })
              }}
              disabled={!customAgainIntervalOn}
              tabIndex={-1}
              data-stepper
              className="w-8 h-8 shrink-0 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-lg transition-all duration-150 hover:bg-subhead/40 focus-visible:bg-subhead/40 disabled:opacity-30 disabled:cursor-not-allowed focus-ring focus-circle"
              title={t('settings.decrease')}
              aria-label={t('settings.decrease')}
            >
              <i className="bi bi-dash" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={againValue}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '')
                const v = cleaned === '' ? 1 : Math.min(9, parseInt(cleaned, 10))
                setPendingAgain(v)
                if (customAgainIntervalOn) onUpdate({ ...settings, customIntervalAgain: v })
              }}
              onBlur={() => {
                const v = Math.min(9, Math.max(1, againValue))
                setPendingAgain(v)
                if (customAgainIntervalOn) onUpdate({ ...settings, customIntervalAgain: v })
              }}
              disabled={!customAgainIntervalOn}
              tabIndex={-1}
              data-stepper
              className="text-lg font-mono text-accent w-10 text-center bg-transparent border-none outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none caret-caret"
            />
            <button
              onClick={() => {
                const v = Math.min(9, againValue + 1)
                setPendingAgain(v)
                if (customAgainIntervalOn) onUpdate({ ...settings, customIntervalAgain: v })
              }}
              disabled={!customAgainIntervalOn}
              tabIndex={-1}
              data-stepper
              className="w-8 h-8 shrink-0 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-lg transition-all duration-150 hover:bg-subhead/40 focus-visible:bg-subhead/40 disabled:opacity-30 disabled:cursor-not-allowed focus-ring focus-circle"
              title={t('settings.increase')}
              aria-label={t('settings.increase')}
            >
              <i className="bi bi-plus" />
            </button>
          </div>
          <span className="text-sm text-text opacity-60">{t(timeUnitKey(againValue))}</span>
        </div>
      </div>

      <div className="space-y-3" role="group" aria-label={t('settings.learningGoodGroup')} onKeyDown={handleStepperKeyDown}>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={customGoodIntervalOn}
            onChange={() =>
              onUpdate({
                ...settings,
                customIntervalGood: customGoodIntervalOn ? false : pendingGood,
              })
            }
            className="mt-0.5"
            data-stepper
          />
          <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
            {t('settings.learningGood')}
          </span>
        </label>
        <div className="flex max-sm:flex-col max-sm:items-start sm:items-center gap-3 ml-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const v = Math.max(10, goodValue - 10)
                setPendingGood(v)
                if (customGoodIntervalOn) onUpdate({ ...settings, customIntervalGood: v })
              }}
              disabled={!customGoodIntervalOn}
              tabIndex={-1}
              data-stepper
              className="w-8 h-8 shrink-0 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-lg transition-all duration-150 hover:bg-subhead/40 focus-visible:bg-subhead/40 disabled:opacity-30 disabled:cursor-not-allowed focus-ring focus-circle"
              title={t('settings.decrease')}
              aria-label={t('settings.decrease')}
            >
              <i className="bi bi-dash" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={goodValue}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '')
                const v = cleaned === '' ? 10 : Math.min(90, parseInt(cleaned, 10))
                setPendingGood(v)
                if (customGoodIntervalOn) onUpdate({ ...settings, customIntervalGood: v })
              }}
              onBlur={() => {
                const v = Math.min(90, Math.max(10, goodValue))
                setPendingGood(v)
                if (customGoodIntervalOn) onUpdate({ ...settings, customIntervalGood: v })
              }}
              disabled={!customGoodIntervalOn}
              tabIndex={-1}
              data-stepper
              className="text-lg font-mono text-accent w-10 text-center bg-transparent border-none outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none caret-caret"
            />
            <button
              onClick={() => {
                const v = Math.min(90, goodValue + 10)
                setPendingGood(v)
                if (customGoodIntervalOn) onUpdate({ ...settings, customIntervalGood: v })
              }}
              disabled={!customGoodIntervalOn}
              tabIndex={-1}
              data-stepper
              className="w-8 h-8 shrink-0 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-lg transition-all duration-150 hover:bg-subhead/40 focus-visible:bg-subhead/40 disabled:opacity-30 disabled:cursor-not-allowed focus-ring focus-circle"
              title={t('settings.increase')}
              aria-label={t('settings.increase')}
            >
              <i className="bi bi-plus" />
            </button>
          </div>
          <span className="text-sm text-text opacity-60">{t(timeUnitKey(goodValue))}</span>
        </div>
      </div>

      <div className="space-y-3" role="group" aria-label={t('settings.autoFlipGroup')} onKeyDown={handleStepperKeyDown}>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={customWrongAttempsOn}
            onChange={() =>
              onUpdate({
                ...settings,
                autoFlipOnWrongAttempts: customWrongAttempsOn ? false : pendingWrong,
              })
            }
            className="mt-0.5"
            data-stepper
          />
          <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
            {t('settings.autoFlip')}
          </span>
        </label>
        <div className="flex max-sm:flex-col max-sm:items-start sm:items-center gap-3 ml-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const v = Math.max(1, wrongValue - 1)
                setPendingWrong(v)
                if (customWrongAttempsOn) onUpdate({ ...settings, autoFlipOnWrongAttempts: v })
              }}
              disabled={!customWrongAttempsOn}
              tabIndex={-1}
              data-stepper
              className="w-8 h-8 shrink-0 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-lg transition-all duration-150 hover:bg-subhead/40 focus-visible:bg-subhead/40 disabled:opacity-30 disabled:cursor-not-allowed focus-ring focus-circle"
              title={t('settings.decrease')}
              aria-label={t('settings.decrease')}
            >
              <i className="bi bi-dash" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={wrongValue}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '')
                const v = cleaned === '' ? 1 : Math.min(9, parseInt(cleaned, 10))
                setPendingWrong(v)
                if (customWrongAttempsOn) onUpdate({ ...settings, autoFlipOnWrongAttempts: v })
              }}
              onBlur={() => {
                const v = Math.min(9, Math.max(1, wrongValue))
                setPendingWrong(v)
                if (customWrongAttempsOn) onUpdate({ ...settings, autoFlipOnWrongAttempts: v })
              }}
              disabled={!customWrongAttempsOn}
              tabIndex={-1}
              data-stepper
              className="text-lg font-mono text-accent w-10 text-center bg-transparent border-none outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none caret-caret"
            />
            <button
              onClick={() => {
                const v = Math.min(9, wrongValue + 1)
                setPendingWrong(v)
                if (customWrongAttempsOn) onUpdate({ ...settings, autoFlipOnWrongAttempts: v })
              }}
              disabled={!customWrongAttempsOn}
              tabIndex={-1}
              data-stepper
              className="w-8 h-8 shrink-0 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-lg transition-all duration-150 hover:bg-subhead/40 focus-visible:bg-subhead/40 disabled:opacity-30 disabled:cursor-not-allowed focus-ring focus-circle"
              title={t('settings.increase')}
              aria-label={t('settings.increase')}
            >
              <i className="bi bi-plus" />
            </button>
          </div>
          <span className="text-sm text-text opacity-60">{t('settings.wrongAttempts')}</span>
        </div>
      </div>

      <div className="space-y-3" role="group" aria-label={t('settings.phrasebookGroup')} onKeyDown={handleStepperKeyDown}>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={settings.phrasebookMode}
            onChange={() =>
              onUpdate({
                ...settings,
                phrasebookMode: !settings.phrasebookMode,
              })
            }
            className="mt-0.5"
            data-stepper
          />
          <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
            {t('settings.phrasebook')}
          </span>
        </label>
        <div className="flex max-sm:flex-col max-sm:items-start sm:items-center gap-3 ml-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const v = Math.max(50, settings.phrasebookThreshold - 5)
                onUpdate({ ...settings, phrasebookThreshold: v })
              }}
              disabled={!settings.phrasebookMode}
              tabIndex={-1}
              data-stepper
              className="w-8 h-8 shrink-0 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-lg transition-all duration-150 hover:bg-subhead/40 focus-visible:bg-subhead/40 disabled:opacity-30 disabled:cursor-not-allowed focus-ring focus-circle"
              title={t('settings.decrease')}
              aria-label={t('settings.decrease')}
            >
              <i className="bi bi-dash" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={settings.phrasebookThreshold}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '')
                const v = cleaned === '' ? 50 : parseInt(cleaned, 10)
                onUpdate({ ...settings, phrasebookThreshold: v })
              }}
              onBlur={() => {
                const v = Math.min(100, Math.max(50, settings.phrasebookThreshold))
                onUpdate({ ...settings, phrasebookThreshold: v })
              }}
              disabled={!settings.phrasebookMode}
              tabIndex={-1}
              data-stepper
              className="text-lg font-mono text-accent w-10 text-center bg-transparent border-none outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none caret-caret"
            />
            <button
              onClick={() => {
                const v = Math.min(100, settings.phrasebookThreshold + 5)
                onUpdate({ ...settings, phrasebookThreshold: v })
              }}
              disabled={!settings.phrasebookMode}
              tabIndex={-1}
              data-stepper
              className="w-8 h-8 shrink-0 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-lg transition-all duration-150 hover:bg-subhead/40 focus-visible:bg-subhead/40 disabled:opacity-30 disabled:cursor-not-allowed focus-ring focus-circle"
              title={t('settings.increase')}
              aria-label={t('settings.increase')}
            >
              <i className="bi bi-plus" />
            </button>
          </div>
          <span className="text-sm text-text opacity-60">{t('settings.phrasebookThreshold')}</span>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={settings.enableTTS}
          onChange={() =>
            onUpdate({
              ...settings,
              enableTTS: !settings.enableTTS,
            })
          }
          className="mt-0.5"
        />
        <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
          {t('settings.enableTTS')}
        </span>
      </label>

      {settings.enableTTS && (
        <div className="ml-8 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={openTtsPopover}
              aria-expanded={showTtsPopover}
              aria-controls="tts-key-popover"
              className="px-4 py-2 rounded-lg border border-text/30 text-text text-sm transition-all duration-200 hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent cursor-pointer whitespace-nowrap"
            >
              {settings.ttsKey ? t('settings.changeTtsKey') : t('settings.addTtsKey')}
            </button>
            <span className="text-sm text-text opacity-60">
              {settings.ttsService === 'web' && t('settings.ttsWebDefault')}
              {settings.ttsService === 'google' && <span className="text-accent">{t('settings.ttsGoogle')}</span>}
              {settings.ttsService === 'azure' && <span className="text-accent">{t('settings.ttsAzure')}</span>}
            </span>
          </div>

          {showTtsPopover && (
            <div id="tts-key-popover" role="region" aria-label={t('settings.ttsKeyInput')} className="border border-text/30 rounded-lg p-4 space-y-3 bg-bg">
              <input
                type="text"
                value={ttsKeyInput}
                onChange={(e) => setTtsKeyInput(e.target.value)}
                placeholder={t('settings.ttsKeyInput')}
                className="w-full px-3 py-2 rounded-lg border border-text/30 bg-transparent text-text text-sm focus:outline-none focus:border-accent"
              />
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  disabled={!ttsKeyInput}
                  onClick={handleTtsGoogle}
                  className="px-3 py-1.5 rounded-lg border border-text/30 text-text text-sm transition-all duration-200 hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t('settings.ttsKeyGoogle')}
                </button>
                <button
                  disabled={!ttsKeyInput}
                  onClick={handleTtsAzure}
                  className="px-3 py-1.5 rounded-lg border border-text/30 text-text text-sm transition-all duration-200 hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t('settings.ttsKeyAzure')}
                </button>
                <button
                  onClick={handleTtsReset}
                  className="px-3 py-1.5 rounded-lg border border-text/30 text-text text-sm transition-all duration-200 hover:border-caret hover:text-caret focus-visible:border-caret focus-visible:text-caret cursor-pointer"
                >
                  {t('settings.ttsKeyReset')}
                </button>
                <button
                  onClick={handleTtsClose}
                  className="px-3 py-1.5 rounded-lg border border-text/30 text-text text-sm transition-all duration-200 hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent cursor-pointer"
                >
                  {t('settings.ttsKeyClose')}
                </button>
              </div>
              {ttsMsg && (
                <p role="status" className={`text-sm text-center ${ttsMsg.ok ? 'text-accent' : 'text-red-500'}`}>
                  {ttsMsg.text}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={settings.autoAddRankedToFavorites}
          onChange={() =>
            onUpdate({
              ...settings,
              autoAddRankedToFavorites: !settings.autoAddRankedToFavorites,
            })
          }
          className="mt-0.5"
        />
        <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
          {t('settings.autoAddRankedToFavorites')}
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={settings.autoAdvanceOnLearn}
          onChange={() =>
            onUpdate({
              ...settings,
              autoAdvanceOnLearn: !settings.autoAdvanceOnLearn,
            })
          }
          className="mt-0.5"
        />
        <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
          {t('settings.autoAdvance')}
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={settings.autoAddAnsweredToLearned}
          onChange={() =>
            onUpdate({
              ...settings,
              autoAddAnsweredToLearned: !settings.autoAddAnsweredToLearned,
            })
          }
          className="mt-0.5"
        />
        <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
          {t('settings.autoAddAnswered')}
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={settings.useAltInputLang}
          onChange={() =>
            onUpdate({
              ...settings,
              useAltInputLang: !settings.useAltInputLang,
            })
          }
          className="mt-0.5"
        />
        <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
          {t('settings.useAltInput')}
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={settings.useRefLangForLabels}
          onChange={() =>
            onUpdate({
              ...settings,
              useRefLangForLabels: !settings.useRefLangForLabels,
            })
          }
          className="mt-0.5"
        />
        <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
          {t('settings.useRefLang')}
        </span>
      </label>

      <div className="space-y-3">
        <button
          ref={saveRef}
          onClick={onExport}
          className="w-full px-4 py-2 rounded-lg border border-text/30 text-text text-sm transition-all duration-200 hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent cursor-pointer"
        >
          <i className="bi bi-download mr-2" />
          {t('settings.saveProgress')}
        </button>

        <button
          onClick={() => importRef.current?.click()}
          className="w-full px-4 py-2 rounded-lg border border-text/30 text-text text-sm transition-all duration-200 hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent cursor-pointer"
        >
          <i className="bi bi-upload mr-2" />
          {t('settings.loadProgress')}
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImportFile(file)
            e.target.value = ''
          }}
        />

        <button
          onClick={() => dictRef.current?.click()}
          className="w-full px-4 py-2 rounded-lg border border-text/30 text-text text-sm transition-all duration-200 hover:border-caret hover:text-caret focus-visible:border-caret focus-visible:text-caret cursor-pointer"
        >
          <i className="bi bi-book mr-2" />
          {t('settings.changeDict')}
        </button>
        <input
          ref={dictRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleDictFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {/* Error popover */}
      <div
        ref={errorPopover}
        popover="manual"
        role="alertdialog"
        aria-label={t('error.somethingWrong')}
        className="rounded-xl bg-subhead-alt border border-text/20 outline outline-1 outline-error p-6 text-center fixed inset-0 m-auto w-80 h-fit"
      >
        <p className="text-text text-sm mb-4">{importError}</p>
        <button
          onClick={() => errorPopover.current?.hidePopover()}
          className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-text/20 focus-visible:bg-text/20 cursor-pointer"
        >
          OK
        </button>
      </div>

      {/* Dictionary change confirm popover */}
      <div
        ref={dictConfirmPopover}
        popover="manual"
        role="alertdialog"
        aria-label={t('dict.changeTitle')}
        className="rounded-xl bg-subhead-alt border border-text/20 outline outline-1 outline-subhead p-6 text-center fixed inset-0 m-auto w-80 h-fit"
      >
        <p className="text-text text-sm mb-4">{t('dict.changeTitle')}<br/>{t('dict.changeDesc')}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={confirmDictChange}
            className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-subhead hover:text-bg focus-visible:bg-subhead focus-visible:text-bg cursor-pointer"
          >
            {t('dict.changeConfirm')}
          </button>
          <button
            onClick={() => { setPendingDict(null); dictConfirmPopover.current?.hidePopover() }}
            className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-text/20 focus-visible:bg-text/20 cursor-pointer"
          >
            {t('dict.changeCancel')}
          </button>
        </div>
      </div>

      <div>
        <button
          popoverTarget="reset-confirm"
          className="w-full px-4 py-2 rounded-lg border border-error/50 text-error text-sm transition-all duration-200 hover:bg-error/10 focus-visible:bg-error/10 cursor-pointer"
        >
          {t('settings.resetData')}
        </button>
        <div
          id="reset-confirm"
          popover="auto"
          role="alertdialog"
          aria-label={t('dict.resetTitle')}
          className="rounded-xl bg-subhead-alt border border-text/20 outline outline-1 outline-subhead p-6 text-center fixed inset-0 m-auto w-80 h-fit"
        >
          <p className="text-text text-sm mb-4">{t('dict.resetTitle')}<br/>{t('dict.resetDesc')}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onReset}
              popoverTarget="reset-confirm"
              popoverTargetAction="hide"
              className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-subhead hover:text-bg focus-visible:bg-subhead focus-visible:text-bg cursor-pointer"
            >
              {t('dict.resetConfirm')}
            </button>
            <button
              popoverTarget="reset-confirm"
              popoverTargetAction="hide"
              className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-text/20 focus-visible:bg-text/20 cursor-pointer"
            >
              {t('dict.changeCancel')}
            </button>
          </div>
        </div>
      </div>

      {/* TTS reset confirm popover */}
      <div
        ref={ttsResetConfirmRef}
        popover="manual"
        role="alertdialog"
        aria-label={t('settings.ttsKeyResetConfirm')}
        className="rounded-xl bg-subhead-alt border border-text/20 outline outline-1 outline-subhead p-6 text-center fixed inset-0 m-auto w-80 h-fit"
      >
        <p className="text-text text-sm mb-4">{t('settings.ttsKeyResetConfirm')}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={confirmTtsReset}
            className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-subhead hover:text-bg focus-visible:bg-subhead focus-visible:text-bg cursor-pointer"
          >
            {t('settings.ttsKeyResetConfirmOk')}
          </button>
          <button
            onClick={() => ttsResetConfirmRef.current?.hidePopover()}
            className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-text/20 focus-visible:bg-text/20 cursor-pointer"
          >
            {t('dict.changeCancel')}
          </button>
        </div>
      </div>

      <div aria-live="polite" className="text-center">
        <span className="text-sm text-text/40">
          {dictFileName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')} loaded
        </span>
      </div>

      {/* Import success popover */}
      <div
        ref={importSuccessPopover}
        popover="manual"
        role="alertdialog"
        aria-label={t('error.importSuccess')}
        className="rounded-xl bg-subhead-alt border border-text/20 outline outline-1 outline-accent p-6 text-center fixed inset-0 m-auto w-80 h-fit"
      >
        <p className="text-text text-sm mb-4">{importSuccess}</p>
        <button
          onClick={() => importSuccessPopover.current?.hidePopover()}
          className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-text/20 focus-visible:bg-text/20 cursor-pointer"
        >
          OK
        </button>
      </div>
    </section>
  )
}
