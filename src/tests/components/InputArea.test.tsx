import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import InputArea from '../../components/InputArea'

const dictMeta = {
  type: 'words',
  langFrom: 'sr',
  langTo: 'ru',
  langToAlt: 'en',
  langRef: 'sr-Latn',
}

const word = { id: 1, sr: 'здраво', ru: ['здравствуйте'], 'sr-Latn': 'zdravo' }

function renderInputArea(overrides = {}) {
  const defaults = {
    word,
    dictMeta,
    settings: {
      phrasebookMode: false,
      useAltInputLang: false,
      useRefLangForLabels: false,
      enableTTS: false,
      ttsService: 'web' as const,
      ttsKey: '',
      autoFlipOnWrongAttempts: false as const,
      autoAddAnsweredToLearned: false,
      autoAdvanceOnLearn: false,
      autoAddRankedToFavorites: false,
      phrasebookThreshold: 75,
      customIntervalAgain: false as const,
      customIntervalGood: false as const,
      sortFavoritesBy: ['date_desc'],
      sortLearnedBy: ['date_desc'],
      language: 'ru',
    },
    onCorrect: vi.fn(),
    onWrongAttempt: vi.fn(),
    wrongAttempts: 0,
    isFlipped: false,
    clearKey: 0,
    onMatchResult: vi.fn(),
  }
  return render(
    <I18nProvider lang="en">
      <InputArea {...defaults} {...overrides} />
    </I18nProvider>,
  )
}

describe('InputArea', () => {
  it('renders input field with placeholder', () => {
    renderInputArea()
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).not.toBeDisabled()
  })

  it('has disabled input when word is null', () => {
    renderInputArea({ word: null })
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('shows correct feedback on correct answer (not flipped)', () => {
    renderInputArea({ isFlipped: false })
    const input = screen.getByRole('textbox')
    const submitBtn = screen.getByTitle('Check your translation')

    fireEvent.change(input, { target: { value: 'здравствуйте' } })
    fireEvent.click(submitBtn)

    expect(screen.getByTitle('Check your translation')).toBeDisabled()
  })

  it('shows wrong feedback on incorrect answer', () => {
    const onWrongAttempt = vi.fn()
    renderInputArea({ onWrongAttempt })
    const input = screen.getByRole('textbox')
    const submitBtn = screen.getByTitle('Check your translation')

    fireEvent.change(input, { target: { value: 'wrong' } })
    fireEvent.click(submitBtn)

    expect(onWrongAttempt).toHaveBeenCalledTimes(1)
  })

  it('submits on Enter key', () => {
    const onWrongAttempt = vi.fn()
    renderInputArea({ onWrongAttempt })
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'wrong' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onWrongAttempt).toHaveBeenCalledTimes(1)
  })

  it('clears input when clear key changes', () => {
    const { rerender } = renderInputArea({ clearKey: 0 })
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'some text' } })
    expect(input.value).toBe('some text')

    rerender(
      <I18nProvider lang="en">
        <InputArea word={word} dictMeta={dictMeta} settings={{
          phrasebookMode: false, useAltInputLang: false, useRefLangForLabels: false, enableTTS: false, ttsService: 'web' as const, ttsKey: '',
          autoFlipOnWrongAttempts: false, autoAddAnsweredToLearned: false, autoAdvanceOnLearn: false,
          autoAddRankedToFavorites: false, phrasebookThreshold: 75,
          customIntervalAgain: false, customIntervalGood: false,
          sortFavoritesBy: ['date_desc'], sortLearnedBy: ['date_desc'], language: 'ru',
        }} onCorrect={vi.fn()} onWrongAttempt={vi.fn()} wrongAttempts={0} isFlipped={false} clearKey={1} onMatchResult={vi.fn()} />
      </I18nProvider>,
    )

    expect(input.value).toBe('')
  })

  it('auto-flips on wrong attempts when configured', () => {
    vi.useFakeTimers()
    const onCorrect = vi.fn()
    renderInputArea({
      onCorrect,
      wrongAttempts: 2,
      settings: {
        phrasebookMode: false, useAltInputLang: false, useRefLangForLabels: false, enableTTS: false, ttsService: 'web' as const, ttsKey: '',
        autoFlipOnWrongAttempts: 3, autoAddAnsweredToLearned: false, autoAdvanceOnLearn: false,
        autoAddRankedToFavorites: false, phrasebookThreshold: 75,
        customIntervalAgain: false, customIntervalGood: false,
        sortFavoritesBy: ['date_desc'], sortLearnedBy: ['date_desc'], language: 'ru',
      },
    })

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'wrong' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    vi.advanceTimersByTime(600)
    expect(onCorrect).toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('handles phrasebook mode matching', () => {
    renderInputArea({
      settings: {
        phrasebookMode: true, useAltInputLang: false, useRefLangForLabels: false,
        autoFlipOnWrongAttempts: false, autoAddAnsweredToLearned: false, autoAdvanceOnLearn: false,
        autoAddRankedToFavorites: false, phrasebookThreshold: 75,
        customIntervalAgain: false, customIntervalGood: false,
        sortFavoritesBy: ['date_desc'], sortLearnedBy: ['date_desc'], language: 'ru',
      },
    })

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'здравствуйте' } })
    fireEvent.keyDown(input, { key: 'Enter' })
  })

  it('renders clear button when input has text', () => {
    renderInputArea()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(screen.getByTitle('Clear input field')).toBeInTheDocument()
  })

  it('clear button removes text and refocuses input', () => {
    renderInputArea()
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'test' } })
    expect(input.value).toBe('test')
    fireEvent.click(screen.getByTitle('Clear input field'))
    expect(input.value).toBe('')
    expect(document.activeElement).toBe(input)
  })

  it('shows correct feedback when answer is correct and card is already flipped', () => {
    renderInputArea({ isFlipped: true })
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'здравствуйте' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByTitle('Check your translation')).toBeDisabled()
  })
})
