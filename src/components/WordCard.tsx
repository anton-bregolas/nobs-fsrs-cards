import { useState, useRef, useEffect, forwardRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Word, AppSettings, DictMeta, TTSService } from '../types'
import { useTranslation } from '../i18n'
import { speakViaGoogle, speakViaAzure } from '../utils/tts'

interface WordCardProps {
  word: Word
  dictMeta: DictMeta
  isFlipped: boolean
  onFlip: () => void
  settings: AppSettings
  flyAnim: { type: 'favorite' | 'learned' } | null
  onFlyDone: () => void
  onSwipeNext?: () => void
  onSwipeFavorite?: () => void
  onSwipeLearned?: () => void
  matchPct?: number | null
}

type FlyAwayContent = {
  isFlipped: boolean
  frontPrimary: string
  frontAlt: string | null
  subheadMode: string
  subheadPrimary: string
  subheadAlt: string | null
  togglePrimary: string
  toggleAlt: string
  hasToggle: boolean
  showAltOnBack: boolean
  backTranslations: string[]
  showAccuracy: boolean
  matchPct: number | null | undefined
  wikiUrl: string | null
}

function displayText(v: string | string[] | number | null | undefined): string {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

function firstText(v: string | string[] | number | null | undefined): string {
  if (v == null) return ''
  if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : ''
  return String(v)
}

function langToBCP47(code: string): string {
  const map: Record<string, string> = {
    rus: 'ru-RU',
    srpCyrl: 'sr-RS',
    srpLatn: 'sr-RS',
    eng: 'en-US',
  }
  return map[code] ?? code
}

function findVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const exact = voices.find(v => v.lang === lang)
  if (exact) return exact
  const prefix = lang.split('-')[0]
  return voices.find(v => v.lang.startsWith(prefix)) ?? null
}

function speakText(text: string, lang: string, service: TTSService, key: string) {
  if (!text) return
  if (service === 'google' && key) {
    speakViaGoogle(text, lang, key).catch(() => fallbackSpeak(text, lang))
  } else if (service === 'azure' && key) {
    speakViaAzure(text, lang, key).catch(() => fallbackSpeak(text, lang))
  } else {
    fallbackSpeak(text, lang)
  }
}

function fallbackSpeak(text: string, lang: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = 0.9
  const voice = findVoice(lang)
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}

const WordCard = forwardRef<HTMLDivElement, WordCardProps>(function WordCard({ word, dictMeta, isFlipped, onFlip, settings, flyAnim, onFlyDone, onSwipeNext, onSwipeFavorite, onSwipeLearned, matchPct }, ref) {
  const { t } = useTranslation()
  const perspectiveRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [ghost, setGhost] = useState<{ rect: DOMRect; target: 'favorite' | 'learned' } | null>(null)
  const [ghostPhase, setGhostPhase] = useState<'idle' | 'flying'>('idle')
  const [dragOffset, setDragOffset] = useState(0)
  const [dragSettling, setDragSettling] = useState(false)
  const dragSettlingRef = useRef(false)
  const dragRef = useRef<{
    startX: number
    startY: number
    startTime: number
    active: boolean
  } | null>(null)
  const cardWidthRef = useRef(0)
  const justDraggedRef = useRef(false)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchActiveRef = useRef(false)
  const [displayWord, setDisplayWord] = useState<Word | null>(null)
  const prevWordId = useRef<number | null>(null)
  const [showAltOnBack, setShowAltOnBack] = useState(false)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressedRef = useRef(false)
  const [copyNotification, setCopyNotification] = useState(false)
  const [flipping, setFlipping] = useState(false)
  const prevFlipped = useRef(isFlipped)
  const isFlippedRef = useRef(isFlipped)
  const COMMIT_DISTANCE = 150
  const [textVisible, setTextVisible] = useState(true)
  const committedRef = useRef(false)
  const isDraggingRef = useRef(false)
  const flyAwayContentRef = useRef<FlyAwayContent | null>(null)
  const liveContentRef = useRef<FlyAwayContent | null>(null)
  const flyAwayRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null)

  useEffect(() => {
    if (!copyNotification) return
    const t = setTimeout(() => setCopyNotification(false), 1000)
    return () => clearTimeout(t)
  }, [copyNotification])

  useEffect(() => { dragSettlingRef.current = dragSettling }, [dragSettling])
  useEffect(() => { isFlippedRef.current = isFlipped }, [isFlipped])

  useEffect(() => {
    if (prevFlipped.current === isFlipped) return
    prevFlipped.current = isFlipped
    setFlipping(true)
    const t = setTimeout(() => setFlipping(false), 200)
    return () => { clearTimeout(t); setFlipping(false) }
  }, [isFlipped])

  useEffect(() => {
    if (prevWordId.current !== null && prevWordId.current !== word.id) {
      const wasSwipe = committedRef.current
      if (!isDraggingRef.current && !wasSwipe) {
        setDragOffset(0)
        setDragSettling(false)
        dragSettlingRef.current = false
        committedRef.current = false
      }
      if (!wasSwipe) setTextVisible(false)
      const swapTimer = setTimeout(() => {
        setDisplayWord(word)
        setTextVisible(true)
      }, wasSwipe ? 0 : 180)
      prevWordId.current = word.id
      return () => { clearTimeout(swapTimer) }
    } else {
      setDisplayWord(word)
      prevWordId.current = word.id
    }
  }, [word.id])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const getCardWidth = () => el.getBoundingClientRect().width

    const cancelDrag = () => {
      justDraggedRef.current = true
      setTimeout(() => { justDraggedRef.current = false }, 400)
      setDragSettling(true)
      setDragOffset(0)
      setTextVisible(true)
      flyAwayContentRef.current = null
      flyAwayRectRef.current = null
      settleTimerRef.current = setTimeout(() => {
        setDragSettling(false)
      }, 200)
    }

    const flyOff = (cw: number) => {
      justDraggedRef.current = true
      setTimeout(() => { justDraggedRef.current = false }, 400)
      setDragSettling(true)
      setDragOffset(cw + 50)
      settleTimerRef.current = setTimeout(() => {
        setDragOffset(0)
        setDragSettling(false)
        flyAwayContentRef.current = null
        flyAwayRectRef.current = null
      }, 250)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (dragSettlingRef.current) return
      touchActiveRef.current = true
      committedRef.current = false
      isDraggingRef.current = true
      cardWidthRef.current = getCardWidth()
      const r = el.getBoundingClientRect()
      flyAwayRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height }
      dragRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startTime: Date.now(),
        active: false,
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      const d = dragRef.current
      if (!d || dragSettlingRef.current) return
      if (committedRef.current) return

      const dx = e.touches[0].clientX - d.startX
      const dy = e.touches[0].clientY - d.startY

      if (!d.active && dx > 5 && dx > Math.abs(dy) * 1.2) {
        d.active = true
        setTextVisible(false)
        flyAwayContentRef.current = { ...liveContentRef.current! }
      }

      if (d.active) {
        if (dx > 0) {
          e.preventDefault()
          setDragOffset(dx)
          if (dx >= COMMIT_DISTANCE && !committedRef.current) {
            committedRef.current = true
            onSwipeNext?.()
            flyOff(cardWidthRef.current)
          }
        } else {
          d.active = false
          cancelDrag()
        }
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null
      isDraggingRef.current = false

      if (committedRef.current) return

      if (d.active) {
        const dx = e.changedTouches[0].clientX - d.startX
        const dt = Date.now() - d.startTime
        const velocity = dx / dt
        const cw = cardWidthRef.current

        if (dx >= COMMIT_DISTANCE || (dx >= cw * 0.2 && velocity > 0.4)) {
          committedRef.current = true
          onSwipeNext?.()
          flyOff(cw)
        } else {
          cancelDrag()
        }
        return
      }

      const dx = e.changedTouches[0].clientX - d.startX
      const dy = e.changedTouches[0].clientY - d.startY
      const dt = Date.now() - d.startTime
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      const velocity = Math.sqrt(dx * dx + dy * dy) / dt

      if (absX < 15 && absY < 15) return

      if (absY > absX && absY > 30 && velocity > 0.3) {
        if (dy < 0) onSwipeFavorite?.()
        else onSwipeLearned?.()
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      if (dragSettlingRef.current || touchActiveRef.current) return
      if (e.button !== 0) return
      committedRef.current = false
      isDraggingRef.current = true
      cardWidthRef.current = getCardWidth()
      const r = el.getBoundingClientRect()
      flyAwayRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height }
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
        active: false,
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d || dragSettlingRef.current) return
      if (committedRef.current) return

      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY

      if (!d.active && dx > 5 && dx > Math.abs(dy) * 1.2) {
        d.active = true
        setTextVisible(false)
        flyAwayContentRef.current = { ...liveContentRef.current! }
      }

      if (d.active) {
        if (dx > 0) {
          setDragOffset(dx)
          if (dx >= COMMIT_DISTANCE && !committedRef.current) {
            committedRef.current = true
            onSwipeNext?.()
            flyOff(cardWidthRef.current)
          }
        } else {
          d.active = false
          cancelDrag()
        }
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null
      isDraggingRef.current = false

      if (committedRef.current) return

      if (d.active) {
        const dx = e.clientX - d.startX
        const dt = Date.now() - d.startTime
        const velocity = dx / dt
        const cw = cardWidthRef.current

        if (dx >= COMMIT_DISTANCE || (dx >= cw * 0.2 && velocity > 0.4)) {
          committedRef.current = true
          onSwipeNext?.()
          flyOff(cw)
        } else {
          cancelDrag()
        }
        return
      }

      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      const dt = Date.now() - d.startTime
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      const velocity = Math.sqrt(dx * dx + dy * dy) / dt

      if (absX < 5 && absY < 5) return

      if (absY > absX && absY > 30 && velocity > 0.3) {
        if (dy < 0) onSwipeFavorite?.()
        else onSwipeLearned?.()
      }
    }

    const onMouseLeave = () => {
      const d = dragRef.current
      if (!d) return
      isDraggingRef.current = false
      if (committedRef.current) {
        dragRef.current = null
        return
      }
      if (d.active) {
        d.active = false
        cancelDrag()
      }
      dragRef.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseup', onMouseUp)
    el.addEventListener('mouseleave', onMouseLeave)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [onSwipeNext, onSwipeFavorite, onSwipeLearned])

  useEffect(() => {
    if (!flyAnim) {
      setGhost(null)
      setGhostPhase('idle')
      return
    }

    const el = perspectiveRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    setGhost({ rect, target: flyAnim.type })
    setGhostPhase('idle')

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setGhostPhase('flying')
      })
    })
  }, [flyAnim])

  useEffect(() => {
    setShowAltOnBack(false)
  }, [word.id])

  useEffect(() => () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
  }, [])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => setCopyNotification(true)).catch(() => {})
  }, [])

  const startLongPress = useCallback((text: string) => {
    longPressedRef.current = false
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      longPressedRef.current = true
      copyToClipboard(text)
    }, 500)
  }, [copyToClipboard])

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleClick = () => {
    if (longPressedRef.current || justDraggedRef.current) {
      longPressedRef.current = false
      justDraggedRef.current = false
      return
    }
    onFlip()
  }

  const shown = displayWord ?? word

  const isWordsType = dictMeta.type === 'words'
  const isPB = settings.phrasebookMode
  const refLang = settings.useRefLangForLabels
  const useAlt = settings.useAltInputLang
  const isDefaultForType = (isWordsType && !isPB) || (!isWordsType && isPB)

  let frontPrimary: string
  let frontAlt: string | null = null

  if (isWordsType && !isPB) {
    frontPrimary = refLang ? displayText(shown[dictMeta.langRef]) : displayText(shown[dictMeta.langFrom])
    frontAlt = refLang ? displayText(shown[dictMeta.langFrom]) : displayText(shown[dictMeta.langRef])
  } else if (isWordsType && isPB) {
    frontPrimary = (refLang && dictMeta.langToAlt && shown[dictMeta.langToAlt] != null)
      ? firstText(shown[dictMeta.langToAlt])
      : firstText(shown[dictMeta.langTo])
  } else if (!isWordsType && isPB) {
    frontPrimary = refLang ? firstText(shown[dictMeta.langRef]) : firstText(shown[dictMeta.langFrom])
  } else {
    frontPrimary = (refLang && dictMeta.langToAlt && shown[dictMeta.langToAlt] != null)
      ? firstText(shown[dictMeta.langToAlt])
      : firstText(shown[dictMeta.langTo])
  }

  let subheadMode: 'both' | 'toggle' = 'both'
  let subheadPrimary = ''
  let subheadAlt: string | null = null
  let togglePrimary = ''
  let toggleAlt = ''
  let hasToggle = false

  if (isWordsType && !isPB) {
    subheadMode = 'both'
    subheadPrimary = refLang ? displayText(shown[dictMeta.langRef]) : displayText(shown[dictMeta.langFrom])
    subheadAlt = refLang ? displayText(shown[dictMeta.langFrom]) : displayText(shown[dictMeta.langRef])
  } else if (isWordsType && isPB) {
    subheadMode = 'toggle'
    hasToggle = dictMeta.langToAlt != null && shown[dictMeta.langToAlt] != null
    if (refLang) {
      togglePrimary = hasToggle ? firstText(shown[dictMeta.langToAlt]) : firstText(shown[dictMeta.langTo])
      toggleAlt = firstText(shown[dictMeta.langTo])
    } else {
      togglePrimary = firstText(shown[dictMeta.langTo])
      toggleAlt = hasToggle ? firstText(shown[dictMeta.langToAlt]) : ''
    }
  } else if (!isWordsType && isPB) {
    subheadMode = 'toggle'
    hasToggle = dictMeta.langRef != null && shown[dictMeta.langRef] != null
    if (refLang) {
      togglePrimary = hasToggle ? firstText(shown[dictMeta.langRef]) : firstText(shown[dictMeta.langFrom])
      toggleAlt = firstText(shown[dictMeta.langFrom])
    } else {
      togglePrimary = firstText(shown[dictMeta.langFrom])
      toggleAlt = hasToggle ? firstText(shown[dictMeta.langRef]) : ''
    }
  } else {
    subheadMode = 'toggle'
    hasToggle = dictMeta.langToAlt != null && shown[dictMeta.langToAlt] != null
    togglePrimary = hasToggle ? firstText(shown[dictMeta.langToAlt]) : firstText(shown[dictMeta.langTo])
    toggleAlt = firstText(shown[dictMeta.langTo])
  }

  let backTranslations: string[]
  if (isDefaultForType) {
    const accentKey = useAlt && dictMeta.langToAlt ? dictMeta.langToAlt : dictMeta.langTo
    backTranslations = Array.isArray(shown[accentKey])
      ? shown[accentKey] as string[]
      : [displayText(shown[accentKey])]
  } else {
    const accentKey = useAlt && dictMeta.langRef ? dictMeta.langRef : dictMeta.langFrom
    backTranslations = Array.isArray(shown[accentKey])
      ? shown[accentKey] as string[]
      : [displayText(shown[accentKey])]
  }

  const showAccuracy = isPB
  const showWiki = isWordsType && !isPB
  const wikiRef = shown[dictMeta.langRef]
  const wikiUrl = showWiki && wikiRef
    ? `https://sh.wiktionary.org/w/index.php?title=${encodeURIComponent(Array.isArray(wikiRef) ? wikiRef[0] : wikiRef)}`
    : null

  const frontBaseLang = (isWordsType && !isPB)
    ? (refLang ? dictMeta.langRef : dictMeta.langFrom)
    : (isWordsType && isPB)
      ? (refLang && dictMeta.langToAlt ? dictMeta.langToAlt : dictMeta.langTo)
      : (!isWordsType && isPB)
        ? (refLang ? dictMeta.langRef : dictMeta.langFrom)
        : (refLang && dictMeta.langToAlt ? dictMeta.langToAlt : dictMeta.langTo)

  let togglePrimaryLang = ''
  let toggleAltLang = ''
  if (isWordsType && isPB) {
    if (refLang) {
      togglePrimaryLang = hasToggle && dictMeta.langToAlt ? dictMeta.langToAlt : dictMeta.langTo
      toggleAltLang = dictMeta.langTo
    } else {
      togglePrimaryLang = dictMeta.langTo
      toggleAltLang = hasToggle && dictMeta.langToAlt ? dictMeta.langToAlt : ''
    }
  } else if (!isWordsType && isPB) {
    if (refLang) {
      togglePrimaryLang = hasToggle && dictMeta.langRef ? dictMeta.langRef : dictMeta.langFrom
      toggleAltLang = dictMeta.langFrom
    } else {
      togglePrimaryLang = dictMeta.langFrom
      toggleAltLang = hasToggle && dictMeta.langRef ? dictMeta.langRef : ''
    }
  } else {
    togglePrimaryLang = hasToggle && dictMeta.langToAlt ? dictMeta.langToAlt : dictMeta.langTo
    toggleAltLang = dictMeta.langTo
  }

  const questionLangCode = !isFlipped || subheadMode === 'both'
    ? frontBaseLang
    : showAltOnBack ? toggleAltLang : togglePrimaryLang

  const answerLangCode = isDefaultForType
    ? (useAlt && dictMeta.langToAlt ? dictMeta.langToAlt : dictMeta.langTo)
    : (useAlt && dictMeta.langRef ? dictMeta.langRef : dictMeta.langFrom)

  const questionText = isFlipped
    ? (subheadMode === 'both' ? subheadPrimary : (showAltOnBack ? toggleAlt : togglePrimary))
    : frontPrimary

  const answerText = backTranslations.join(', ')

  const handleAltToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasToggle) setShowAltOnBack(prev => !prev)
  }

  liveContentRef.current = { isFlipped, frontPrimary, frontAlt, subheadMode, subheadPrimary, subheadAlt, togglePrimary, toggleAlt, hasToggle, showAltOnBack, backTranslations, showAccuracy, matchPct, wikiUrl }

  return (
    <><div ref={perspectiveRef} className="perspective w-full max-w-md mx-auto relative min-h-[300px]">
      {ghost && createPortal(
        <div
          style={{
            position: 'fixed',
            left: ghostPhase === 'flying' ? (ghost.target === 'learned' && window.innerWidth < 640 ? 60 : window.innerWidth - 60) : ghost.rect.left,
            top: ghostPhase === 'flying' ? (ghost.target === 'favorite' || (ghost.target === 'learned' && window.innerWidth < 640) ? 60 : window.innerHeight - 60) : ghost.rect.top,
            width: ghostPhase === 'flying' ? 0 : ghost.rect.width,
            height: ghostPhase === 'flying' ? 0 : ghost.rect.height,
            borderRadius: '1rem',
            border: '2px solid var(--color-accent)',
            background: 'transparent',
            pointerEvents: 'none',
            zIndex: 9999,
            transition: ghostPhase === 'flying' ? 'all 0.65s ease-in' : 'none',
            opacity: ghostPhase === 'flying' ? 0 : 1,
          }}
          onTransitionEnd={() => {
            if (ghostPhase === 'flying') {
              setGhost(null)
              setGhostPhase('idle')
              onFlyDone()
            }
          }}
        />,
        document.body
      )}
      <div
        className={`card-3d absolute inset-0 rounded-2xl ${isFlipped ? 'card-3d-flipped' : ''}`}
        aria-hidden="true"
      >
        <div className="card-face absolute inset-0 rounded-2xl bg-subhead-alt/60" />
        <div
          className="card-face absolute inset-0 rounded-2xl bg-subhead-alt border-2 border-accent"
          style={{ transform: 'rotateY(180deg)' }}
        />
      </div>

      {dragOffset > 0 && flyAwayContentRef.current && flyAwayRectRef.current && (() => {
        const fa = flyAwayContentRef.current
        const fr = flyAwayRectRef.current
        return createPortal(
          <div
            className={`pointer-events-none overflow-hidden rounded-2xl ${
              fa.isFlipped
                ? 'bg-subhead-alt border-2 border-accent'
                : 'border-2 border-transparent'
            }`}
            style={{
              position: 'fixed',
              left: fr.left,
              top: fr.top,
              width: fr.width,
              height: fr.height,
              backgroundColor: fa.isFlipped ? undefined : 'color-mix(in srgb, var(--color-bg) 87%, black 13%)',
              transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.03}deg)`,
              transition: dragSettling ? 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
              zIndex: 10,
            }}
          >
            <div className="p-8 min-h-[300px] flex flex-col items-center justify-center">
              {!fa.isFlipped ? (
                <div className="text-center">
                  {fa.frontAlt ? (
                    <>
                      <p className="text-3xl font-bold text-text mb-2">{fa.frontPrimary}</p>
                      <p className="text-xl text-text opacity-80">{fa.frontAlt}</p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-text mb-2 leading-relaxed">{fa.frontPrimary}</p>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  {fa.subheadMode === 'both' ? (
                    <>
                      <p className="text-3xl font-bold text-subhead mb-2">{fa.subheadPrimary}</p>
                      {fa.subheadAlt && (
                        <p className="text-xl text-subhead opacity-80 mb-4">{fa.subheadAlt}</p>
                      )}
                    </>
                  ) : (
                    <div className="relative grid">
                      <p className="text-xl font-bold text-subhead flex justify-center items-center mb-2 leading-relaxed col-start-1 row-start-1"
                         style={{ opacity: fa.showAltOnBack ? 0 : 1, visibility: fa.showAltOnBack ? 'hidden' : 'visible' }}>
                        {fa.togglePrimary}
                      </p>
                      {fa.hasToggle && (
                        <p className="text-xl font-bold text-subhead flex justify-center items-center mb-2 leading-relaxed col-start-1 row-start-1"
                           style={{ opacity: fa.showAltOnBack ? 1 : 0, visibility: fa.showAltOnBack ? 'visible' : 'hidden' }}>
                          {fa.toggleAlt}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 justify-center mb-4">
                    {fa.backTranslations.map((translation: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-accent/20 text-accent rounded-lg text-lg font-medium">
                        {translation}
                      </span>
                    ))}
                  </div>
                      {fa.showAccuracy && fa.matchPct != null && (
                        <span className={`inline-flex items-center gap-1 text-sm font-mono ${fa.matchPct < 50 ? 'text-error' : fa.matchPct < 80 ? 'text-caret' : 'text-accent'} opacity-90`}>
                          {t('card.match', { pct: fa.matchPct })}
                        </span>
                      )}
                  {fa.wikiUrl && (
                    <span className="inline-flex items-center gap-1 text-sm text-text opacity-60">
                      <i className="bi bi-wikipedia text-xl" />
                      <span>Wiktionary</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      })()}

      <div
        ref={(node) => {
          contentRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        className={`relative p-8 min-h-[300px] flex flex-col items-center justify-center cursor-pointer select-none rounded-2xl focus-ring ${dragSettling ? 'drag-settle' : ''}`}
        style={{
          touchAction: 'pan-y',
          opacity: textVisible ? 1 : 0,
          transition: textVisible ? 'opacity 300ms ease-out' : 'none',
        }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
        aria-label={isFlipped ? t('card.translationHint') : t('card.tapToReveal')}
      >
        {!isFlipped ? (
          <div className="text-center animate-fade-in-down" key="front">
            {frontAlt ? (
              <>
                <p
                  data-lang="from"
                  className="text-3xl font-bold text-text mb-2"
                  onPointerDown={() => startLongPress(frontPrimary)}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                >
                  {frontPrimary}
                </p>
                <p
                  data-lang="ref"
                  className="text-xl text-text opacity-80"
                  onPointerDown={() => startLongPress(frontAlt)}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                >
                  {frontAlt}
                </p>
              </>
            ) : (
              <p
                data-lang="from"
                className="text-2xl font-bold text-text mb-2 leading-relaxed"
                onPointerDown={() => startLongPress(frontPrimary)}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
              >
                {frontPrimary}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center animate-fade-in-up2" key="back">
            {subheadMode === 'both' ? (
              <>
                <p
                  data-lang="from"
                  className="text-3xl font-bold text-subhead mb-2"
                  onPointerDown={() => startLongPress(subheadPrimary)}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                >
                  {subheadPrimary}
                </p>
                {subheadAlt && (
                  <p
                    data-lang="ref"
                    className="text-xl text-subhead opacity-80 mb-4"
                    onPointerDown={() => startLongPress(subheadAlt)}
                    onPointerUp={clearLongPress}
                    onPointerLeave={clearLongPress}
                  >
                    {subheadAlt}
                  </p>
                )}
              </>
            ) : (
              <div
                data-lang="to"
                className="relative grid"
                onPointerDown={() => {
                  const text = showAltOnBack ? toggleAlt : togglePrimary
                  startLongPress(text)
                }}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
              >
                <p
                  className="text-xl font-bold text-subhead flex justify-center items-center mb-2 leading-relaxed transition-opacity duration-200 ease-in-out col-start-1 row-start-1"
                  style={{ opacity: showAltOnBack ? 0 : 1, visibility: showAltOnBack ? 'hidden' : 'visible' }}
                >
                  {togglePrimary}
                </p>
                {hasToggle && (
                  <p
                    className="text-xl font-bold text-subhead flex justify-center items-center mb-2 leading-relaxed transition-opacity duration-200 ease-in-out col-start-1 row-start-1"
                    style={{ opacity: showAltOnBack ? 1 : 0, visibility: showAltOnBack ? 'visible' : 'hidden' }}
                  >
                    {toggleAlt}
                  </p>
                )}
              </div>
            )}
            <div
              data-lang="to"
              className="flex flex-wrap gap-2 justify-center mb-4"
              onPointerDown={() => startLongPress(backTranslations.join(', '))}
              onPointerUp={clearLongPress}
              onPointerLeave={clearLongPress}
            >
              {backTranslations.map((translation, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-accent/20 text-accent rounded-lg text-lg font-medium"
                >
                  {translation}
                </span>
              ))}
            </div>
            {showAccuracy && matchPct != null && (
              <span
                data-info="accustat"
                className={`inline-flex items-center gap-1 text-sm font-mono ${matchPct < 50 ? 'text-error' : matchPct < 80 ? 'text-caret' : 'text-accent'} opacity-90`}
                onPointerDown={() => startLongPress(t('card.match', { pct: matchPct }))}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
              >
                {t('card.match', { pct: matchPct })}
              </span>
            )}
            {wikiUrl && (
              <a
                data-info="wiki"
                href={wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={t('card.wikiPage')}
                aria-label={t('card.wikiPage')}
                className="inline-flex items-center gap-1 text-sm text-text opacity-60 hover:opacity-100 hover:text-accent focus-visible:opacity-100 focus-visible:text-accent transition-all duration-200 focus-ring rounded-[0.2rem]"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={() => startLongPress(wikiUrl)}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
              >
                <i className="bi bi-wikipedia text-xl" />
                <span>Wiktionary</span>
              </a>
            )}
          </div>
        )}

        <div data-card-ui="hovercontainer">
          <button
            onClick={handleAltToggle}
            onKeyDown={(e) => e.stopPropagation()}
            tabIndex={isFlipped && subheadMode === 'toggle' && hasToggle ? 0 : -1}
            aria-hidden={!(isFlipped && subheadMode === 'toggle' && hasToggle)}
            className={`${
              isFlipped && subheadMode === 'toggle' && hasToggle
                ? 'opacity-30 focus:opacity-75 focus-visible:opacity-75 hover:opacity-75'
                : 'opacity-0 pointer-events-none'
            }`}
            style={{
              transition: isFlipped && subheadMode === 'toggle' && hasToggle
                ? 'opacity 500ms ease-in-out 200ms'
                : 'opacity 200ms ease-in-out',
            }}
            aria-label={t('card.showAlt')}
            title={t('card.showAlt')}
            data-card-ui="hoverbtn"
          >
            <i className="bi bi-translate text-lg" />
          </button>
          {settings.enableTTS && <>
            <button
              onClick={(e) => { e.stopPropagation(); speakText(questionText, langToBCP47(questionLangCode), settings.ttsService, settings.ttsKey) }}
              className={`${
                flipping
                  ? 'opacity-0 pointer-events-none'
                  : 'opacity-30 focus:opacity-75 focus-visible:opacity-75 hover:opacity-75'
              }`}
              style={{
                transition: flipping
                  ? 'opacity 200ms ease-in-out'
                  : 'opacity 500ms ease-in-out',
              }}
              data-card-ui="hoverbtn"
              aria-label={t('card.playQuestion')}
              title={t('card.playQuestion')}
            >
              <i className="bi bi-volume-down text-3xl" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); speakText(answerText, langToBCP47(answerLangCode), settings.ttsService, settings.ttsKey) }}
              tabIndex={-1}
              aria-hidden={!isFlipped}
              className={`${
                isFlipped
                  ? 'opacity-30 focus:opacity-75 focus-visible:opacity-75 hover:opacity-75'
                  : 'opacity-0 pointer-events-none'
              }`}
              style={{
                transition: isFlipped
                  ? 'opacity 500ms ease-in-out 200ms'
                  : 'opacity 200ms ease-in-out',
              }}
              data-card-ui="hoverbtn"
              aria-label={t('card.playAnswer')}
              title={t('card.playAnswer')}
            >
              <i className="bi bi-headphones text-2xl" />
            </button>
          </>}
        </div>
      </div>
    </div>
    {createPortal(
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-500 ease-in-out ${
          copyNotification ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        <span className="inline-block bg-subhead-alt text-text px-4 py-3 rounded-xl text-md font-sans">
          {t('card.copied')}
        </span>
      </div>,
      document.body
    )}
  </>)
})

export default WordCard
