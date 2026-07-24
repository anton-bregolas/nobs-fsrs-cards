import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import WordCard from '../../components/WordCard'
import type { Word, DictMeta, AppSettings } from '../../types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const writeTextMock = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: writeTextMock },
  writable: true,
  configurable: true,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeWord(overrides: Partial<Word> = {}): Word {
  return {
    id: 1,
    srp: 'jabuka',
    rus: 'яблоко',
    rusAlt: 'яблочко',
    eng: 'apple',
    ...overrides,
  }
}

function wordsMeta(overrides: Partial<DictMeta> = {}): DictMeta {
  return {
    type: 'words',
    langFrom: 'srp',
    langTo: 'rus',
    langToAlt: 'rusAlt',
    langRef: 'eng',
    ...overrides,
  }
}

function phrasesMeta(overrides: Partial<DictMeta> = {}): DictMeta {
  return {
    type: 'phrases',
    langFrom: 'rus',
    langTo: 'srp',
    langToAlt: '',
    langRef: 'eng',
    ...overrides,
  }
}

function settings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    phrasebookMode: false,
    phrasebookThreshold: 80,
    useAltInputLang: false,
    useRefLangForLabels: false,
    enableTTS: false,
    ttsService: 'web',
    ttsKey: '',
    language: 'en',
    autoFlipOnWrongAttempts: false,
    autoAdvanceOnLearn: false,
    autoAddAnsweredToLearned: false,
    sortFavoritesBy: [],
    sortLearnedBy: [],
    customIntervalAgain: false,
    customIntervalGood: false,
    autoAddRankedToFavorites: false,
    ...overrides,
  }
}

interface RenderOpts {
  word?: Word
  dictMeta?: DictMeta
  isFlipped?: boolean
  onFlip?: () => void
  settings?: AppSettings
  flyAnim?: { type: 'favorite' | 'learned' } | null
  onFlyDone?: () => void
  onSwipeNext?: () => void
  onSwipeFavorite?: () => void
  onSwipeLearned?: () => void
  matchPct?: number | null
}

function renderCard(opts: RenderOpts = {}) {
  const {
    word: w = makeWord(),
    dictMeta: dm = wordsMeta(),
    isFlipped = false,
    onFlip = vi.fn(),
    settings: s = settings(),
    flyAnim = null,
    onFlyDone = vi.fn(),
    onSwipeNext,
    onSwipeFavorite,
    onSwipeLearned,
    matchPct,
  } = opts

  const view = render(
    <I18nProvider lang="en">
      <WordCard
        word={w}
        dictMeta={dm}
        isFlipped={isFlipped}
        onFlip={onFlip}
        settings={s}
        flyAnim={flyAnim}
        onFlyDone={onFlyDone}
        onSwipeNext={onSwipeNext}
        onSwipeFavorite={onSwipeFavorite}
        onSwipeLearned={onSwipeLearned}
        matchPct={matchPct ?? null}
      />
    </I18nProvider>,
  )

  return { ...view, onFlip, onFlyDone, onSwipeNext, onSwipeFavorite, onSwipeLearned }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('WordCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ======================== FRONT FACE ========================

  describe('front face', () => {
    it('renders primary text — words + non-PB', () => {
      renderCard()
      expect(screen.getByText('jabuka')).toBeInTheDocument()
    })

    it('renders alt text when available — words + non-PB', () => {
      renderCard()
      expect(screen.getByText('jabuka')).toBeInTheDocument()
      expect(screen.getByText('apple')).toBeInTheDocument()
    })

    it('renders single-line front when no alt', () => {
      renderCard({ word: makeWord({ eng: null }) })
      expect(screen.getByText('jabuka')).toBeInTheDocument()
      expect(screen.queryByText('apple')).not.toBeInTheDocument()
    })

    it('swaps primary/alt with refLang — words + non-PB', () => {
      renderCard({ settings: settings({ useRefLangForLabels: true }) })
      const els = screen.getAllByText('apple')
      expect(els.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('jabuka')).toBeInTheDocument()
    })

    it('shows translation on front — words + PB', () => {
      renderCard({ settings: settings({ phrasebookMode: true }) })
      expect(screen.getByText('яблоко')).toBeInTheDocument()
      expect(screen.queryByText('jabuka')).not.toBeInTheDocument()
    })

    it('shows translation on front with refLang — words + PB', () => {
      renderCard({
        settings: settings({ phrasebookMode: true, useRefLangForLabels: true }),
      })
      // refLang && langToAlt exists && shown[langToAlt] != null
      // → frontPrimary = firstText(shown['rusAlt']) = "яблочко"
      expect(screen.getByText('яблочко')).toBeInTheDocument()
    })

    it('shows from-lang on front — phrases + PB', () => {
      renderCard({
        word: makeWord({ id: 2, rus: 'я говорю по-русски', srp: 'ја говорим руски' }),
        dictMeta: phrasesMeta(),
        settings: settings({ phrasebookMode: true }),
      })
      expect(screen.getByText('я говорю по-русски')).toBeInTheDocument()
    })

    it('front has no alt when langRef missing — phrases + PB', () => {
      renderCard({
        word: makeWord({ id: 3, rus: 'привет', srp: 'здраво', eng: null }),
        dictMeta: phrasesMeta(),
        settings: settings({ phrasebookMode: true }),
      })
      expect(screen.getByText('привет')).toBeInTheDocument()
      expect(screen.queryByText('здраво')).not.toBeInTheDocument()
    })
  })

  // ======================== BACK FACE ========================

  describe('back face', () => {
    it('renders subhead in both mode — words + non-PB', () => {
      renderCard({ isFlipped: true })
      expect(screen.getByText('jabuka')).toBeInTheDocument()
      expect(screen.getByText('apple')).toBeInTheDocument()
    })

    it('renders translation badges', () => {
      renderCard({ isFlipped: true })
      expect(screen.getByText('яблоко')).toBeInTheDocument()
    })

    it('renders multiple badge entries from array values', () => {
      renderCard({ word: makeWord({ rus: ['яблоко', 'яблоня'] }), isFlipped: true })
      expect(screen.getByText('яблоко')).toBeInTheDocument()
      expect(screen.getByText('яблоня')).toBeInTheDocument()
    })

    it('renders toggle subhead mode — words + PB', () => {
      renderCard({ isFlipped: true, settings: settings({ phrasebookMode: true }) })
      expect(screen.getByText('яблоко')).toBeInTheDocument()
    })

    it('shows match percentage in PB mode', () => {
      renderCard({
        isFlipped: true,
        settings: settings({ phrasebookMode: true }),
        matchPct: 85,
      })
      expect(screen.getByText('Match: 85%')).toBeInTheDocument()
    })

    it('hides match percentage in non-PB mode', () => {
      renderCard({ isFlipped: true, matchPct: 85 })
      expect(screen.queryByText('Match: 85%')).not.toBeInTheDocument()
    })

    it('hides match when matchPct is null even in PB mode', () => {
      renderCard({
        isFlipped: true,
        settings: settings({ phrasebookMode: true }),
        matchPct: null,
      })
      expect(screen.queryByText(/Match:/)).not.toBeInTheDocument()
    })

    it('applies correct accuracy color classes — low', () => {
      renderCard({
        isFlipped: true,
        settings: settings({ phrasebookMode: true }),
        matchPct: 30,
      })
      const badge = screen.getByText('Match: 30%')
      expect(badge.className).toContain('text-error')
    })

    it('applies correct accuracy color classes — medium', () => {
      renderCard({
        isFlipped: true,
        settings: settings({ phrasebookMode: true }),
        matchPct: 65,
      })
      const badge = screen.getByText('Match: 65%')
      expect(badge.className).toContain('text-caret')
    })

    it('applies correct accuracy color classes — high', () => {
      renderCard({
        isFlipped: true,
        settings: settings({ phrasebookMode: true }),
        matchPct: 95,
      })
      const badge = screen.getByText('Match: 95%')
      expect(badge.className).toContain('text-accent')
    })

    it('shows wiki link — words + non-PB', () => {
      renderCard({ isFlipped: true })
      const link = screen.getByText('Wiktionary')
      expect(link).toBeInTheDocument()
      expect(link.closest('a')).toHaveAttribute(
        'href',
        expect.stringContaining('wiktionary'),
      )
    })

    it('hides wiki link in PB mode', () => {
      renderCard({
        isFlipped: true,
        settings: settings({ phrasebookMode: true }),
      })
      expect(screen.queryByText('Wiktionary')).not.toBeInTheDocument()
    })

    it('hides wiki link when langRef value is null', () => {
      renderCard({
        word: makeWord({ eng: null }),
        isFlipped: true,
      })
      expect(screen.queryByText('Wiktionary')).not.toBeInTheDocument()
    })

    it('does not show subhead alt when it is null — both mode', () => {
      renderCard({
        word: makeWord({ eng: null }),
        isFlipped: true,
      })
      expect(screen.getByText('jabuka')).toBeInTheDocument()
      expect(screen.queryByText('apple')).not.toBeInTheDocument()
    })
  })

  // ======================== ALT TOGGLE ========================

  describe('alt toggle button', () => {
    it('renders toggle when hasToggle — words + PB', () => {
      renderCard({ isFlipped: true, settings: settings({ phrasebookMode: true }) })
      expect(screen.getByLabelText('Show reference translation')).toBeInTheDocument()
    })

    it('renders toggle — phrases + PB', () => {
      renderCard({
        word: makeWord({ id: 5, rus: 'привет', srp: 'здраво', eng: 'hello' }),
        dictMeta: phrasesMeta(),
        isFlipped: true,
        settings: settings({ phrasebookMode: true }),
      })
      // phrases + PB: hasToggle = langRef != null && shown[langRef] != null = true
      expect(screen.getByLabelText('Show reference translation')).toBeInTheDocument()
    })

    it('hidden when hasToggle is false', () => {
      renderCard({
        dictMeta: wordsMeta({ langToAlt: '' }),
        isFlipped: true,
        settings: settings({ phrasebookMode: true }),
      })
      const btn = screen.getByLabelText('Show reference translation')
      expect(btn.classList.contains('opacity-0')).toBe(true)
      expect(btn.classList.contains('pointer-events-none')).toBe(true)
    })

    it('hidden in non-PB words mode (subheadMode=both)', () => {
      renderCard({ isFlipped: true })
      const btn = screen.getByLabelText('Show reference translation')
      expect(btn.classList.contains('opacity-0')).toBe(true)
      expect(btn.classList.contains('pointer-events-none')).toBe(true)
    })

    it('swaps displayed text on click', () => {
      renderCard({ isFlipped: true, settings: settings({ phrasebookMode: true }) })
      // default: togglePrimary = "яблоко" is visible, toggleAlt = "яблочко" hidden
      expect(screen.getByText('яблоко')).toBeInTheDocument()
      const btn = screen.getByLabelText('Show reference translation')
      fireEvent.click(btn)
      // after click: showAltOnBack = true, toggleAlt now visible
      expect(screen.getByText('яблочко')).toBeInTheDocument()
    })
  })

  // ======================== TTS (TEXT-TO-SPEECH) ========================

  describe('TTS buttons', () => {
    it('renders question play button when TTS enabled', () => {
      renderCard({ settings: settings({ enableTTS: true }) })
      expect(screen.getByLabelText('Read the question aloud')).toBeInTheDocument()
    })

    it('renders answer play button when flipped and TTS enabled', () => {
      renderCard({ isFlipped: true, settings: settings({ enableTTS: true }) })
      expect(screen.getByLabelText('Read the answer aloud')).toBeInTheDocument()
    })

    it('does not render TTS buttons when TTS disabled', () => {
      renderCard({ settings: settings({ enableTTS: false }) })
      expect(screen.queryByLabelText('Read the question aloud')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Read the answer aloud')).not.toBeInTheDocument()
    })

    it('hides answer button when not flipped', () => {
      renderCard({ settings: settings({ enableTTS: true }) })
      const btn = screen.getByLabelText('Read the answer aloud')
      expect(btn.classList.contains('opacity-0')).toBe(true)
      expect(btn.classList.contains('pointer-events-none')).toBe(true)
    })
  })

  // ======================== FLIP INTERACTION ========================

  describe('flip interaction', () => {
    it('calls onFlip on click', () => {
      const { onFlip } = renderCard()
      fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
      expect(onFlip).toHaveBeenCalledTimes(1)
    })

    it('calls onFlip on Enter key', () => {
      const { onFlip } = renderCard()
      fireEvent.keyDown(
        screen.getByRole('button', { name: /tap to see translation/i }),
        { key: 'Enter' },
      )
      expect(onFlip).toHaveBeenCalledTimes(1)
    })

    it('calls onFlip on Space key', () => {
      const { onFlip } = renderCard()
      fireEvent.keyDown(
        screen.getByRole('button', { name: /tap to see translation/i }),
        { key: ' ' },
      )
      expect(onFlip).toHaveBeenCalledTimes(1)
    })
  })

  // ======================== LONG PRESS & CLIPBOARD ========================

  describe('long press & clipboard', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('copies front primary text on long press', async () => {
      renderCard()
      fireEvent.pointerDown(screen.getByText('jabuka'))
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(writeTextMock).toHaveBeenCalledWith('jabuka')
    })

    it('copies front alt text on long press', async () => {
      renderCard()
      fireEvent.pointerDown(screen.getByText('apple'))
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(writeTextMock).toHaveBeenCalledWith('apple')
    })

    it('copies back subhead text on long press', async () => {
      renderCard({ isFlipped: true })
      fireEvent.pointerDown(screen.getByText('jabuka'))
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(writeTextMock).toHaveBeenCalledWith('jabuka')
    })

    it('copies back badge text on long press', async () => {
      renderCard({ isFlipped: true })
      const badges = screen.getByText('яблоко')
      fireEvent.pointerDown(badges)
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(writeTextMock).toHaveBeenCalledWith('яблоко')
    })

    it('shows Copied toast after successful copy', async () => {
      renderCard()
      fireEvent.pointerDown(screen.getByText('jabuka'))
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(screen.getByText('Copied')).toBeInTheDocument()
    })

    it('does NOT copy when released before 500 ms', async () => {
      renderCard()
      fireEvent.pointerDown(screen.getByText('jabuka'))
      fireEvent.pointerUp(screen.getByText('jabuka'))
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(writeTextMock).not.toHaveBeenCalled()
    })

    it('does NOT copy on pointerLeave before 500 ms', async () => {
      renderCard()
      fireEvent.pointerDown(screen.getByText('jabuka'))
      fireEvent.pointerLeave(screen.getByText('jabuka'))
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(writeTextMock).not.toHaveBeenCalled()
    })

    it('click is suppressed after long press', async () => {
      const { onFlip } = renderCard()
      fireEvent.pointerDown(screen.getByText('jabuka'))
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })

      fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
      expect(onFlip).not.toHaveBeenCalled()
    })
  })

  // ======================== COPY TOAST AUTO-HIDE ========================

  describe('copy notification auto-hide', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('fades out after 1 second', async () => {
      renderCard()
      fireEvent.pointerDown(screen.getByText('jabuka'))
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })

      const toast = screen.getByText('Copied')
      const portalDiv = toast.parentElement!
      expect(portalDiv.className).toContain('opacity-100')

      await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
      expect(portalDiv.className).toContain('opacity-0')
    })

    it('cleanup on unmount does not throw', async () => {
      const { unmount } = renderCard()
      fireEvent.pointerDown(screen.getByText('jabuka'))
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(() => unmount()).not.toThrow()
    })
  })

  // ======================== GHOST ANIMATION ========================

  describe('ghost animation', () => {
    // happy-dom doesn't fire requestAnimationFrame; mock it to run immediately
    beforeEach(() => {
      let rafId = 0
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
        cb(++rafId)
        return rafId
      })
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('renders ghost portal when flyAnim is set', () => {
      renderCard({ flyAnim: { type: 'favorite' } })
      const ghost = document.body.querySelector<HTMLElement>('[style*="z-index: 9999"]')
      expect(ghost).toBeInTheDocument()
    })

    it('ghost calls onFlyDone after transition end', () => {
      const { onFlyDone } = renderCard({ flyAnim: { type: 'favorite' } })
      const ghost = document.body.querySelector<HTMLElement>('[style*="z-index: 9999"]')
      expect(ghost).toBeInTheDocument()
      ghost!.dispatchEvent(new Event('transitionend', { bubbles: true }))
      expect(onFlyDone).toHaveBeenCalled()
    })
  })

  // ======================== SWIPE GESTURES ========================

  describe('swipe gestures', () => {
    function card() {
      return screen.getByRole('button', { name: /tap to see translation/i })
    }

    it('right swipe calls onSwipeNext', () => {
      const onSwipeNext = vi.fn()
      renderCard({ onSwipeNext })
      fireEvent.mouseDown(card(), { clientX: 0, clientY: 100 })
      fireEvent.mouseMove(card(), { clientX: 200, clientY: 100 })
      fireEvent.mouseUp(card(), { clientX: 200, clientY: 100 })
      expect(onSwipeNext).toHaveBeenCalled()
    })

    it('small drag without activation does NOT call onSwipeNext', () => {
      const onSwipeNext = vi.fn()
      renderCard({ onSwipeNext })
      fireEvent.mouseDown(card(), { clientX: 0, clientY: 100 })
      // dx=5 does not activate drag (condition: dx > 5)
      fireEvent.mouseUp(card(), { clientX: 5, clientY: 100 })
      expect(onSwipeNext).not.toHaveBeenCalled()
    })

    it('up swipe calls onSwipeFavorite', () => {
      const onSwipeFavorite = vi.fn()
      renderCard({ onSwipeFavorite })
      fireEvent.mouseDown(card(), { clientX: 100, clientY: 200 })
      fireEvent.mouseUp(card(), { clientX: 102, clientY: 50 })
      expect(onSwipeFavorite).toHaveBeenCalled()
    })

    it('down swipe calls onSwipeLearned', () => {
      const onSwipeLearned = vi.fn()
      renderCard({ onSwipeLearned })
      fireEvent.mouseDown(card(), { clientX: 100, clientY: 50 })
      fireEvent.mouseUp(card(), { clientX: 102, clientY: 200 })
      expect(onSwipeLearned).toHaveBeenCalled()
    })

    it('right swipe triggers flyoff and onSwipeNext', async () => {
      const onSwipeNext = vi.fn()
      renderCard({ onSwipeNext })
      await act(async () => {
        fireEvent.mouseDown(card(), { clientX: 0, clientY: 100 })
      })
      await act(async () => {
        fireEvent.mouseMove(card(), { clientX: 180, clientY: 100 })
      })
      await waitFor(() => {
        expect(onSwipeNext).toHaveBeenCalled()
      })
    })
  })

  // ======================== ELSE SUBHEAD BRANCH ========================

  describe('else subhead branch (non-words, non-PB)', () => {
    it('renders toggle subhead with langToAlt available', () => {
      renderCard({
        word: makeWord({ id: 10, rus: 'привет', rusAlt: 'приветик', eng: 'hello' }),
        dictMeta: { type: 'phrases' as const, langFrom: 'eng', langTo: 'rus', langToAlt: 'rusAlt', langRef: '' },
        isFlipped: true,
      })
      expect(screen.getByText('привет')).toBeInTheDocument()
      expect(screen.getByLabelText('Show reference translation')).toBeInTheDocument()
    })
  })

  // ======================== MATCH ACCURACY LONG PRESS ========================

  describe('match accuracy long press', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('copies match percentage text on long press', async () => {
      renderCard({
        isFlipped: true,
        settings: settings({ phrasebookMode: true }),
        matchPct: 85,
      })
      const badge = screen.getByText('Match: 85%')
      fireEvent.pointerDown(badge)
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(writeTextMock).toHaveBeenCalledWith('Match: 85%')
    })

    it('copies wiki URL on long press', async () => {
      renderCard({ isFlipped: true })
      const wikiText = screen.getByText('Wiktionary')
      fireEvent.pointerDown(wikiText)
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('wiktionary'))
    })

    it('cancels long press on pointer leave', async () => {
      renderCard({ isFlipped: true })
      const wikiText = screen.getByText('Wiktionary')
      fireEvent.pointerDown(wikiText)
      fireEvent.pointerLeave(wikiText)
      await act(async () => { await vi.advanceTimersByTimeAsync(500) })
      expect(writeTextMock).not.toHaveBeenCalled()
    })
  })

  // ======================== ALT TOGGLE ON BACK ========================

  describe('alt toggle on back (non-words, non-PB)', () => {
    it('toggles between primary and alt on click', () => {
      renderCard({
        word: makeWord({ id: 12, rus: 'привет', rusAlt: 'приветик', eng: 'hello' }),
        dictMeta: { type: 'phrases' as const, langFrom: 'eng', langTo: 'rus', langToAlt: 'rusAlt', langRef: '' },
        isFlipped: true,
      })
      expect(screen.getByText('привет')).toBeInTheDocument()
      const btn = screen.getByLabelText('Show reference translation')
      fireEvent.click(btn)
      expect(screen.getByText('приветик')).toBeInTheDocument()
    })
  })

  // ======================== CLEANUP ON UNMOUNT ========================

  describe('cleanup on unmount', () => {
    it('does not throw when unmounted while long press timer is active', () => {
      const { unmount } = renderCard()
      fireEvent.pointerDown(screen.getByText('jabuka'))
      expect(() => unmount()).not.toThrow()
    })
  })

  // ======================== FORWARDED REF ========================

  describe('forwarded ref', () => {
    it('forwards ref to the card element', () => {
      const ref = { current: null as HTMLDivElement | null }
      render(
        <I18nProvider lang="en">
          <WordCard
            ref={ref}
            word={makeWord()}
            dictMeta={wordsMeta()}
            isFlipped={false}
            onFlip={vi.fn()}
            settings={settings()}
            flyAnim={null}
            onFlyDone={vi.fn()}
            matchPct={null}
          />
        </I18nProvider>,
      )
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })
})
