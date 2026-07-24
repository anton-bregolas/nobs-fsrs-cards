import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import Home from '../../components/Home'
import type { View, Word, StoredWord, SrsCard, AppSettings, DictMeta } from '../../types'
import type { FSRS } from 'ts-fsrs'

const word1: Word = { id: 1, serbian: 'zdravo', russian: ['привет'] }
const word2: Word = { id: 2, serbian: 'hvala', russian: ['спасибо'] }

const dictMeta: DictMeta = {
  type: 'words',
  langFrom: 'serbian',
  langTo: 'russian',
  langToAlt: '',
  langRef: 'serbian',
}

const defaultSettings: AppSettings = {
  autoFlipOnWrongAttempts: false,
  autoAdvanceOnLearn: false,
  autoAddAnsweredToLearned: false,
  phrasebookMode: false,
  phrasebookThreshold: 80,
  useAltInputLang: false,
  useRefLangForLabels: false,
  enableTTS: false,
  ttsService: 'web',
  ttsKey: '',
  sortFavoritesBy: [],
  sortLearnedBy: [],
  language: 'en',
  customIntervalAgain: false,
  customIntervalGood: false,
  autoAddRankedToFavorites: false,
}

const mockScheduler = { next: vi.fn() } as unknown as FSRS

function buildHomeProps(overrides: Record<string, unknown> = {}) {
  return {
    words: [word1],
    favorites: [] as StoredWord[],
    learned: [] as StoredWord[],
    srsCards: [] as SrsCard[],
    exFavorites: [] as number[],
    settings: defaultSettings,
    dictMeta,
    currentView: 'home' as View,
    onToggleFavorite: vi.fn(),
    onToggleLearned: vi.fn(),
    onAddViewed: vi.fn(),
    onAddAnswered: vi.fn(),
    onMatchResult: vi.fn(),
    onUpdateFavoriteAccuStat: vi.fn(),
    onReviewSaved: vi.fn(),
    onRemoveFromSrs: vi.fn(),
    scheduler: mockScheduler,
    ...overrides,
  }
}

function renderHome(overrides: Record<string, unknown> = {}) {
  return render(
    <I18nProvider lang="en">
      <Home {...buildHomeProps(overrides)} />
    </I18nProvider>,
  )
}

function rerenderHome(
  rerender: (ui: React.ReactElement) => void,
  overrides: Record<string, unknown> = {},
) {
  rerender(
    <I18nProvider lang="en">
      <Home {...buildHomeProps(overrides)} />
    </I18nProvider>,
  )
}

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows "All words learned" UI when no words remain', async () => {
    const { rerender } = renderHome()
    await screen.findByRole('button', { name: /tap to see translation/i })
    rerenderHome(rerender, { words: [] })
    expect(screen.getByText('All words learned. Congratulations!')).toBeInTheDocument()
    expect(document.querySelector('.bi-check-all')).toBeInTheDocument()
  })

  it('shows word card when a word is available', async () => {
    renderHome()
    expect(
      await screen.findByRole('button', { name: /tap to see translation/i }),
    ).toBeInTheDocument()
  })

  it('shows input area when a word is available', async () => {
    renderHome()
    expect(
      await screen.findByRole('textbox', { name: /input translation/i }),
    ).toBeInTheDocument()
  })

  it('shows action buttons when a word is available', async () => {
    renderHome()
    expect(
      await screen.findByRole('navigation', { name: /word actions/i }),
    ).toBeInTheDocument()
  })

  it('flips the card when clicked', async () => {
    renderHome()
    const card = await screen.findByRole('button', { name: /tap to see translation/i })
    fireEvent.click(card)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /card with translation/i }),
      ).toBeInTheDocument()
    })
  })

  it('renders ReviewButtons hidden before flip', async () => {
    renderHome()
    await screen.findByRole('button', { name: /tap to see translation/i })
    const container = document.querySelector('.srs-container')!
    expect(container.className).toContain('opacity-0')
    expect(container.className).toContain('pointer-events-none')
  })

  it('renders ReviewButtons visible after flip', async () => {
    renderHome()
    await screen.findByRole('button', { name: /tap to see translation/i })
    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await waitFor(() => {
      const container = document.querySelector('.srs-container')!
      expect(container.className).toContain('opacity-100')
    })
  })

  it('calls onToggleFavorite when clicking add to favorites', async () => {
    const onToggleFavorite = vi.fn()
    renderHome({ onToggleFavorite })
    await screen.findByRole('button', { name: /tap to see translation/i })
    fireEvent.click(screen.getByTitle('Add to Favorites'))
    expect(onToggleFavorite).toHaveBeenCalledWith(1)
  })

  it('calls onToggleFavorite when removing from favorites', async () => {
    const onToggleFavorite = vi.fn()
    renderHome({
      onToggleFavorite,
      favorites: [{ id: 1, addedAt: '2024-01-01' }],
    })
    await screen.findByRole('button', { name: /tap to see translation/i })
    fireEvent.click(screen.getByTitle('Remove from Favorites'))
    expect(onToggleFavorite).toHaveBeenCalledWith(1)
  })

  it('calls onToggleLearned when adding to learned', async () => {
    const onToggleLearned = vi.fn()
    renderHome({ onToggleLearned })
    await screen.findByRole('button', { name: /tap to see translation/i })
    fireEvent.click(screen.getByTitle("Add to Learned (Don't show again)"))
    expect(onToggleLearned).toHaveBeenCalledWith(1)
  })

  it('calls onToggleLearned and onRemoveFromSrs when removing from learned', async () => {
    const onToggleLearned = vi.fn()
    const onRemoveFromSrs = vi.fn()
    const { rerender } = renderHome()
    await screen.findByRole('button', { name: /tap to see translation/i })
    rerenderHome(rerender, {
      onToggleLearned,
      onRemoveFromSrs,
      learned: [{ id: 1, addedAt: '2024-01-01' }],
    })
    fireEvent.click(screen.getByTitle('Remove from Learned'))
    expect(onToggleLearned).toHaveBeenCalledWith(1)
    expect(onRemoveFromSrs).toHaveBeenCalledWith(1)
  })

  it('calls onAddViewed when a word is displayed', async () => {
    const onAddViewed = vi.fn()
    renderHome({ onAddViewed })
    await screen.findByRole('button', { name: /tap to see translation/i })
    expect(onAddViewed).toHaveBeenCalledWith(1)
  })

  it('handleNext resets flip state and calls onMatchResult(null)', async () => {
    const onMatchResult = vi.fn()
    renderHome({ onMatchResult })
    await screen.findByRole('button', { name: /tap to see translation/i })
    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })
    fireEvent.click(screen.getByTitle('Skip to next word (Random pick)'))
    await waitFor(() => {
      expect(onMatchResult).toHaveBeenCalledWith(null)
    })
    expect(
      screen.getByRole('button', { name: /tap to see translation/i }),
    ).toBeInTheDocument()
  })

  it('handleNext picks a different word when available', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    renderHome({ words: [word1, word2] })
    await screen.findByRole('button', { name: /tap to see translation/i })
    expect(screen.getAllByText('zdravo')).toHaveLength(2)
    fireEvent.click(screen.getByTitle('Skip to next word (Random pick)'))
    await waitFor(() => {
      expect(screen.queryAllByText('zdravo')).toHaveLength(0)
    })
    expect(screen.getAllByText('hvala')).toHaveLength(2)
  })

  it('handleNext calls onRemoveFromSrs when flipped (auto-rating = 0)', async () => {
    const onRemoveFromSrs = vi.fn()
    renderHome({ onRemoveFromSrs })
    await screen.findByRole('button', { name: /tap to see translation/i })
    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })
    fireEvent.click(screen.getByTitle('Skip to next word (Random pick)'))
    await waitFor(() => {
      expect(onRemoveFromSrs).toHaveBeenCalledWith(1)
    })
  })

  it('handles back-to-back navigation without errors', async () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
    renderHome({ words: [word1, word2] })
    await screen.findByRole('button', { name: /tap to see translation/i })
    expect(screen.getAllByText('zdravo')).toHaveLength(2)
    fireEvent.click(screen.getByTitle('Skip to next word (Random pick)'))
    await waitFor(() => {
      expect(screen.queryAllByText('zdravo')).toHaveLength(0)
    })
    expect(screen.getAllByText('hvala')).toHaveLength(2)
    fireEvent.click(screen.getByTitle('Skip to next word (Random pick)'))
    await waitFor(() => {
      expect(screen.queryAllByText('hvala')).toHaveLength(0)
    })
    expect(screen.getAllByText('zdravo')).toHaveLength(2)
    expect(
      screen.getByRole('button', { name: /tap to see translation/i }),
    ).toBeInTheDocument()
  })

  it('pickRandom selects due SRS word before future due', async () => {
    const pastDue: SrsCard = {
      id: 1, addedAt: '2024-01-01', due: '2020-01-01T00:00:00.000Z',
      stability: 1, difficulty: 1, reps: 0, lapses: 0, state: 0,
    }
    const futureDue: SrsCard = {
      id: 2, addedAt: '2024-01-01', due: '2099-01-01T00:00:00.000Z',
      stability: 1, difficulty: 1, reps: 0, lapses: 0, state: 0,
    }
    renderHome({
      words: [word1, word2],
      srsCards: [futureDue, pastDue],
    })
    await screen.findByRole('button', { name: /tap to see translation/i })
    expect(screen.getAllByText('zdravo').length).toBeGreaterThan(0)
  })

  it('pickRandom falls through to random when no due words', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const futureDue: SrsCard = {
      id: 1, addedAt: '2024-01-01', due: '2099-01-01T00:00:00.000Z',
      stability: 1, difficulty: 1, reps: 0, lapses: 0, state: 0,
    }
    renderHome({
      words: [word1, word2],
      srsCards: [futureDue],
    })
    await screen.findByRole('button', { name: /tap to see translation/i })
    expect(screen.getAllByText('hvala').length).toBeGreaterThan(0)
  })

  it('handleNext calls onReviewSaved when selectedRating is non-zero', async () => {
    const onReviewSaved = vi.fn()
    const onRemoveFromSrs = vi.fn()
    renderHome({ onReviewSaved, onRemoveFromSrs })

    await screen.findByRole('button', { name: /tap to see translation/i })
    const input = screen.getByRole('textbox', { name: /input translation/i })
    fireEvent.change(input, { target: { value: 'wrong answer' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })

    fireEvent.click(screen.getByTitle('Skip to next word (Random pick)'))
    await waitFor(() => {
      expect(onReviewSaved).toHaveBeenCalledWith(1, 1)
    })
    expect(onRemoveFromSrs).not.toHaveBeenCalled()
  })

  it('handleNext calls onToggleFavorite with autoAddRankedToFavorites', async () => {
    const onToggleFavorite = vi.fn()
    const onReviewSaved = vi.fn()
    renderHome({
      onToggleFavorite,
      onReviewSaved,
      settings: { ...defaultSettings, autoAddRankedToFavorites: true },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })
    const input = screen.getByRole('textbox', { name: /input translation/i })
    fireEvent.change(input, { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })
    fireEvent.click(screen.getByTitle('Skip to next word (Random pick)'))
    await waitFor(() => {
      expect(onToggleFavorite).toHaveBeenCalledWith(1)
    })
  })

  it('handleNext skips autoAddRankedToFavorites when word already favorite', async () => {
    const onToggleFavorite = vi.fn()
    renderHome({
      onToggleFavorite,
      favorites: [{ id: 1, addedAt: '2024-01-01' }],
      settings: { ...defaultSettings, autoAddRankedToFavorites: true },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })
    const input = screen.getByRole('textbox', { name: /input translation/i })
    fireEvent.change(input, { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })
    fireEvent.click(screen.getByTitle('Skip to next word (Random pick)'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tap to see translation/i })).toBeInTheDocument()
    })
    expect(onToggleFavorite).not.toHaveBeenCalled()
  })

  it('handleNext skips autoAddRankedToFavorites when word in exFavorites', async () => {
    const onToggleFavorite = vi.fn()
    renderHome({
      onToggleFavorite,
      exFavorites: [1],
      settings: { ...defaultSettings, autoAddRankedToFavorites: true },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })
    const input = screen.getByRole('textbox', { name: /input translation/i })
    fireEvent.change(input, { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })
    fireEvent.click(screen.getByTitle('Skip to next word (Random pick)'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tap to see translation/i })).toBeInTheDocument()
    })
    expect(onToggleFavorite).not.toHaveBeenCalled()
  })

  it('handleNext calls onReviewSaved when rating set via ReviewButtons', async () => {
    const onReviewSaved = vi.fn()
    const onRemoveFromSrs = vi.fn()
    renderHome({ onReviewSaved, onRemoveFromSrs })

    await screen.findByRole('button', { name: /tap to see translation/i })
    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })

    fireEvent.click(screen.getByLabelText('Good (Needs just a bit more work)'))
    fireEvent.click(screen.getByTitle('Skip to next word (Random pick)'))
    await waitFor(() => {
      expect(onReviewSaved).toHaveBeenCalledWith(1, 3)
    })
    expect(onRemoveFromSrs).not.toHaveBeenCalled()
  })

  it('handleNext calls onRemoveFromSrs when rating is 0 via ReviewButtons', async () => {
    const onRemoveFromSrs = vi.fn()
    renderHome({ onRemoveFromSrs })

    await screen.findByRole('button', { name: /tap to see translation/i })
    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })

    fireEvent.click(screen.getByLabelText("Skip (Pretend I didn't see)"))
    fireEvent.click(screen.getByTitle('Skip to next word (Random pick)'))
    await waitFor(() => {
      expect(onRemoveFromSrs).toHaveBeenCalledWith(1)
    })
  })

  it('handleFlip sets selectedRating=1 when wrongAttempts > 0', async () => {
    renderHome()

    await screen.findByRole('button', { name: /tap to see translation/i })
    const input = screen.getByRole('textbox', { name: /input translation/i })
    fireEvent.change(input, { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })

    const againLabel = screen.getByLabelText('Again (No idea)')
    const radio = againLabel.querySelector('input[type="radio"]') as HTMLInputElement
    expect(radio.checked).toBe(true)
  })

  it('autoAddAnsweredToLearned calls onToggleLearned after correct answer', async () => {
    const onToggleLearned = vi.fn()
    renderHome({
      onToggleLearned,
      settings: { ...defaultSettings, autoAddAnsweredToLearned: true },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const input = screen.getByRole('textbox', { name: /input translation/i })
      fireEvent.change(input, { target: { value: 'привет' } })
      fireEvent.click(screen.getByRole('button', { name: /check/i }))
      await act(async () => { await vi.advanceTimersByTimeAsync(2300) })
      expect(onToggleLearned).toHaveBeenCalledWith(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('autoAddAnsweredToLearned with autoAdvanceOnLearn sets pendingNext', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const onToggleLearned = vi.fn()
    renderHome({
      onToggleLearned,
      words: [word1, word2],
      settings: { ...defaultSettings, autoAddAnsweredToLearned: true, autoAdvanceOnLearn: true },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const input = screen.getByRole('textbox', { name: /input translation/i })
      fireEvent.change(input, { target: { value: 'привет' } })
      fireEvent.click(screen.getByRole('button', { name: /check/i }))
      await act(async () => { await vi.advanceTimersByTimeAsync(2300) })
      expect(onToggleLearned).toHaveBeenCalledWith(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('autoAddAnsweredToLearned does not add word if answer triggers handleWrongAttempt before correct', async () => {
    const onToggleLearned = vi.fn()
    renderHome({
      onToggleLearned,
      settings: { ...defaultSettings, autoAddAnsweredToLearned: true },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })
    const input = screen.getByRole('textbox', { name: /input translation/i })
    fireEvent.change(input, { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    await waitFor(() => {
      expect(onToggleLearned).not.toHaveBeenCalled()
    })
  })

  it('handleToggleLearned focuses next button when not learned and autoAdvanceOff', async () => {
    const onToggleLearned = vi.fn()
    const onRemoveFromSrs = vi.fn()
    renderHome({
      onToggleLearned,
      onRemoveFromSrs,
      settings: { ...defaultSettings, autoAdvanceOnLearn: false },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })
    fireEvent.click(screen.getByTitle("Add to Learned (Don't show again)"))

    await waitFor(() => {
      expect(onToggleLearned).toHaveBeenCalledWith(1)
      expect(onRemoveFromSrs).toHaveBeenCalledWith(1)
    })
    await waitFor(() => {
      expect(screen.getByTitle('Skip to next word (Random pick)')).toHaveFocus()
    })
  })

  it('cleanup effect calls onRemoveFromSrs on unmount when rating is 0', async () => {
    const onRemoveFromSrs = vi.fn()
    const { unmount } = renderHome({ onRemoveFromSrs })

    await screen.findByRole('button', { name: /tap to see translation/i })
    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })

    unmount()
    expect(onRemoveFromSrs).toHaveBeenCalledWith(1)
  })

  it('cleanup effect calls onReviewSaved on unmount when rating is non-zero', async () => {
    const onReviewSaved = vi.fn()
    const { unmount } = renderHome({ onReviewSaved })

    await screen.findByRole('button', { name: /tap to see translation/i })
    const input = screen.getByRole('textbox', { name: /input translation/i })
    fireEvent.change(input, { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })

    unmount()
    expect(onReviewSaved).toHaveBeenCalledWith(1, 1)
  })

  it('shows match percentage on flipped card in phrasebook mode', async () => {
    renderHome({
      settings: { ...defaultSettings, phrasebookMode: true },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })
    const input = screen.getByRole('textbox', { name: /input translation/i })
    fireEvent.change(input, { target: { value: 'zdrav' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })

    expect(document.querySelector('[data-info="accustat"]')).toBeInTheDocument()
  })

  it('shows matchPct on card when phrasebook correct answer submitted', async () => {
    renderHome({
      settings: { ...defaultSettings, phrasebookMode: true },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })
    const input = screen.getByRole('textbox', { name: /input translation/i })
    fireEvent.change(input, { target: { value: 'zdravo' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    fireEvent.click(screen.getByRole('button', { name: /tap to see translation/i }))
    await screen.findByRole('button', { name: /card with translation/i })

    expect(document.querySelector('[data-info="accustat"]')).toBeInTheDocument()
  })

  it('handleFlyDone with pendingNext calls handleNext when autoAdvanceOnLearn', async () => {
    const onToggleLearned = vi.fn()
    const onMatchResult = vi.fn()
    renderHome({
      onToggleLearned,
      onMatchResult,
      learned: [],
      settings: { ...defaultSettings, autoAdvanceOnLearn: true },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })

    fireEvent.click(screen.getByTitle("Add to Learned (Don't show again)"))
    await waitFor(() => {
      expect(onToggleLearned).toHaveBeenCalledWith(1)
    })

    const ghostEl = Array.from(document.querySelectorAll('div')).find(
      (el) => el.style.zIndex === '9999',
    )
    if (ghostEl) {
      fireEvent.transitionEnd(ghostEl)
    }

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tap to see translation/i })).toBeInTheDocument()
    })
  })

  it('handleCorrect updates favorite accu stat in phrasebook mode', async () => {
    const onUpdateFavoriteAccuStat = vi.fn()
    renderHome({
      onUpdateFavoriteAccuStat,
      favorites: [{ id: 1, addedAt: '2024-01-01' }],
      settings: { ...defaultSettings, phrasebookMode: true, autoAddAnsweredToLearned: false },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })
    const input = screen.getByRole('textbox', { name: /input translation/i })
    fireEvent.change(input, { target: { value: 'zdravo' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    await waitFor(() => {
      expect(onUpdateFavoriteAccuStat).toHaveBeenCalledWith(1, 100)
    })
  })

  it('handleCorrect auto-advances when autoAdvanceOnLearn and autoAddAnsweredToLearned', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const onToggleLearned = vi.fn()
    const onAddAnswered = vi.fn()
    renderHome({
      onToggleLearned,
      onAddAnswered,
      words: [word1, word2],
      settings: {
        ...defaultSettings,
        autoAddAnsweredToLearned: true,
        autoAdvanceOnLearn: true,
      },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const input = screen.getByRole('textbox', { name: /input translation/i })
      fireEvent.change(input, { target: { value: 'привет' } })
      fireEvent.click(screen.getByRole('button', { name: /check/i }))

      await act(async () => { await vi.advanceTimersByTimeAsync(300) })
      expect(onAddAnswered).toHaveBeenCalledWith(1)

      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(onToggleLearned).toHaveBeenCalledWith(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('correct answer triggers handleCorrect which flips card and sets rating', async () => {
    const onAddAnswered = vi.fn()
    renderHome({
      onAddAnswered,
      settings: { ...defaultSettings, autoAddAnsweredToLearned: false },
    })

    await screen.findByRole('button', { name: /tap to see translation/i })
    const input = screen.getByRole('textbox', { name: /input translation/i })
    fireEvent.change(input, { target: { value: 'привет' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))

    await waitFor(() => {
      expect(onAddAnswered).toHaveBeenCalledWith(1)
    })
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /card with translation/i }),
      ).toBeInTheDocument()
    })
  })

  describe('keyboard shortcuts', () => {
    it('F2 toggles favorite', async () => {
      const onToggleFavorite = vi.fn()
      renderHome({ onToggleFavorite, words: [word1] })
      await screen.findByRole('button', { name: /tap to see translation/i })
      fireEvent.keyDown(window, { key: 'F2' })
      expect(onToggleFavorite).toHaveBeenCalledWith(1)
    })

    it('Ctrl+Shift+F toggles favorite', async () => {
      const onToggleFavorite = vi.fn()
      renderHome({ onToggleFavorite, words: [word1] })
      await screen.findByRole('button', { name: /tap to see translation/i })
      fireEvent.keyDown(window, { key: 'f', ctrlKey: true, shiftKey: true })
      expect(onToggleFavorite).toHaveBeenCalledWith(1)
    })

    it('F8 toggles learned', async () => {
      const onToggleLearned = vi.fn()
      const onRemoveFromSrs = vi.fn()
      renderHome({ onToggleLearned, onRemoveFromSrs, words: [word1] })
      await screen.findByRole('button', { name: /tap to see translation/i })
      fireEvent.keyDown(window, { key: 'F8' })
      expect(onToggleLearned).toHaveBeenCalledWith(1)
      expect(onRemoveFromSrs).toHaveBeenCalledWith(1)
    })

    it('Ctrl+Shift+X toggles learned', async () => {
      const onToggleLearned = vi.fn()
      const onRemoveFromSrs = vi.fn()
      renderHome({ onToggleLearned, onRemoveFromSrs, words: [word1] })
      await screen.findByRole('button', { name: /tap to see translation/i })
      fireEvent.keyDown(window, { key: 'x', ctrlKey: true, shiftKey: true })
      expect(onToggleLearned).toHaveBeenCalledWith(1)
      expect(onRemoveFromSrs).toHaveBeenCalledWith(1)
    })

    it('F4 advances to next word', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const onMatchResult = vi.fn()
      renderHome({ onMatchResult, words: [word1, word2] })
      await screen.findByRole('button', { name: /tap to see translation/i })
      fireEvent.keyDown(window, { key: 'F4' })
      await waitFor(() => {
        expect(onMatchResult).toHaveBeenCalledWith(null)
      })
    })

    it('Ctrl+Shift+E advances to next word', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const onMatchResult = vi.fn()
      renderHome({ onMatchResult, words: [word1, word2] })
      await screen.findByRole('button', { name: /tap to see translation/i })
      fireEvent.keyDown(window, { key: 'e', ctrlKey: true, shiftKey: true })
      await waitFor(() => {
        expect(onMatchResult).toHaveBeenCalledWith(null)
      })
    })

    it('Ctrl+Shift+digit selects rating when flipped', async () => {
      const onReviewSaved = vi.fn()
      renderHome({ onReviewSaved, words: [word1] })
      await screen.findByRole('button', { name: /tap to see translation/i })
      const input = screen.getByRole('textbox', { name: /input translation/i })
      fireEvent.change(input, { target: { value: 'привет' } })
      fireEvent.click(screen.getByRole('button', { name: /check/i }))
      await screen.findByRole('button', { name: /card with translation/i })

      fireEvent.keyDown(window, { key: '4', ctrlKey: true, shiftKey: true, code: 'Digit4' })
      const goodLabel = screen.getByLabelText('Good (Needs just a bit more work)')
      const radio = goodLabel.querySelector('input[type="radio"]') as HTMLInputElement
      expect(radio.checked).toBe(true)
    })

    it('shortcuts do nothing when not on home view', async () => {
      const onToggleFavorite = vi.fn()
      const onToggleLearned = vi.fn()
      renderHome({ onToggleFavorite, onToggleLearned, currentView: 'favorites', words: [word1] })
      fireEvent.keyDown(window, { key: 'F2' })
      fireEvent.keyDown(window, { key: 'F8' })
      expect(onToggleFavorite).not.toHaveBeenCalled()
      expect(onToggleLearned).not.toHaveBeenCalled()
    })
  })
})
