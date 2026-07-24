import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import Settings from '../../components/Settings'
import type { AppSettings, ExportedData, DictMeta } from '../../types'

const baseSettings: AppSettings = {
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
  language: 'en',
  customIntervalAgain: false,
  customIntervalGood: false,
  autoAddRankedToFavorites: false,
}

function renderSettings(overrides: Partial<{
  settings: AppSettings
  onUpdate: ReturnType<typeof vi.fn>
  onReset: ReturnType<typeof vi.fn>
  dictionaryId: string
  onExport: ReturnType<typeof vi.fn>
  onImportData: ReturnType<typeof vi.fn>
  onChangeDictionary: ReturnType<typeof vi.fn>
  initialDictName: string | null
}> = {}) {
  const defaults = {
    settings: baseSettings,
    onUpdate: vi.fn(),
    onReset: vi.fn(),
    dictionaryId: 'words-srp-rus-1200',
    onExport: vi.fn(),
    onImportData: vi.fn(),
    onChangeDictionary: vi.fn(),
    initialDictName: null,
  }
  const props = { ...defaults, ...overrides }
  return {
    ...props,
    ...render(
      <I18nProvider lang="en">
        <Settings {...(props as any)} />
      </I18nProvider>,
    ),
  }
}

function makeValidExportedData(dictId = 'words-srp-rus-1200'): ExportedData {
  return {
    dictId,
    version: 1,
    fromToFavorites: [],
    fromToExFavorites: [],
    fromToLearned: [],
    fromToAnswered: [],
    fromToViewed: [],
    toFromFavorites: [],
    toFromExFavorites: [],
    toFromLearned: [],
    toFromAnswered: [],
    toFromViewed: [],
  }
}

function makeFile(content: string, name = 'progress.json'): File {
  return new File([content], name, { type: 'application/json' })
}

function getImportFileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelectorAll<HTMLInputElement>('input[type="file"]')[0]
}

function getDictFileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelectorAll<HTMLInputElement>('input[type="file"]')[1]
}

async function triggerImport(container: HTMLElement, content: string) {
  const input = getImportFileInput(container)
  fireEvent.change(input, { target: { files: [makeFile(content)] } })
  await act(async () => {})
}

async function triggerDictChange(container: HTMLElement, content: string) {
  const input = getDictFileInput(container)
  fireEvent.change(input, { target: { files: [makeFile(content, 'my-dict.json')] } })
  await act(async () => {})
}

beforeAll(() => {
  HTMLDivElement.prototype.showPopover ??= vi.fn()
  HTMLDivElement.prototype.hidePopover ??= vi.fn()
})

afterAll(() => {
  delete (HTMLDivElement.prototype as any).showPopover
  delete (HTMLDivElement.prototype as any).hidePopover
})

describe('Settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('rendering', () => {
    it('renders the settings title', () => {
      renderSettings()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('shows language selection with 3 options', () => {
      renderSettings()
      expect(screen.getByText('Русский')).toBeInTheDocument()
      expect(screen.getByText('English')).toBeInTheDocument()
      expect(screen.getByText('Srpski')).toBeInTheDocument()
    })

    it('highlights the current language', () => {
      renderSettings({ settings: { ...baseSettings, language: 'ru' } })
      const radio = screen.getByDisplayValue('ru') as HTMLInputElement
      expect(radio.checked).toBe(true)
    })

    it('shows the save progress button', () => {
      renderSettings()
      expect(screen.getByText('Save progress')).toBeInTheDocument()
    })

    it('shows the load progress button', () => {
      renderSettings()
      expect(screen.getByText('Load progress')).toBeInTheDocument()
    })

    it('shows the change dictionary button', () => {
      renderSettings()
      expect(screen.getByText('Change dictionary')).toBeInTheDocument()
    })

    it('shows the reset data button', () => {
      renderSettings()
      expect(screen.getByText('Reset data')).toBeInTheDocument()
    })

    it('shows the dict file name at the bottom', () => {
      renderSettings()
      expect(screen.getByText(/loaded/)).toBeInTheDocument()
    })

    it('shows the initialDictName when provided', () => {
      renderSettings({ initialDictName: 'phrases-rus-srp-trudno275' })
      expect(screen.getByText(/Phrases-Rus-Srp-Trudno275 loaded/)).toBeInTheDocument()
    })

    it('shows all checkbox settings', () => {
      renderSettings()
      expect(screen.getByText(/Repetition interval for words rated.*Again/)).toBeInTheDocument()
      expect(screen.getByText(/Repetition interval for words rated.*Good/)).toBeInTheDocument()
      expect(screen.getByText(/Automatically flip word card after/)).toBeInTheDocument()
      expect(screen.getByText(/Use Phrasebook Mode/)).toBeInTheDocument()
      expect(screen.getByText(/Automatically add rated words to Favorites/)).toBeInTheDocument()
      expect(screen.getByText(/Automatically change word when adding to Learned/)).toBeInTheDocument()
      expect(screen.getByText(/Automatically add all answered words to Learned/)).toBeInTheDocument()
      expect(screen.getByText(/Use alternative input language/)).toBeInTheDocument()
      expect(screen.getByText(/Use reference language in task labels/)).toBeInTheDocument()
    })

    it('renders time unit label when interval is enabled', () => {
      renderSettings({
        settings: {
          ...baseSettings,
          customIntervalAgain: 1,
          customIntervalGood: 10,
        },
      })
      expect(screen.getByText('minute')).toBeInTheDocument()
    })
  })

  describe('language selection', () => {
    it('calls onUpdate when language is changed', () => {
      const onUpdate = vi.fn()
      renderSettings({ settings: { ...baseSettings, language: 'en' }, onUpdate })
      fireEvent.click(screen.getByText('Русский'))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'ru' }),
      )
    })
  })

  describe('checkbox toggles', () => {
    it('toggles phrasebookMode', () => {
      const onUpdate = vi.fn()
      renderSettings({ onUpdate })
      fireEvent.click(screen.getByText(/Use Phrasebook Mode/))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ phrasebookMode: true }),
      )
    })

    it('toggles autoAdvanceOnLearn', () => {
      const onUpdate = vi.fn()
      renderSettings({ onUpdate })
      fireEvent.click(screen.getByText(/Automatically change word when adding to Learned/))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ autoAdvanceOnLearn: true }),
      )
    })

    it('toggles autoAddAnsweredToLearned', () => {
      const onUpdate = vi.fn()
      renderSettings({ onUpdate })
      fireEvent.click(screen.getByText(/Automatically add all answered words to Learned/))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ autoAddAnsweredToLearned: true }),
      )
    })

    it('toggles useAltInputLang', () => {
      const onUpdate = vi.fn()
      renderSettings({ onUpdate })
      fireEvent.click(screen.getByText(/Use alternative input language/))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ useAltInputLang: true }),
      )
    })

    it('toggles useRefLangForLabels', () => {
      const onUpdate = vi.fn()
      renderSettings({ onUpdate })
      fireEvent.click(screen.getByText(/Use reference language in task labels/))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ useRefLangForLabels: true }),
      )
    })

    it('toggles autoAddRankedToFavorites', () => {
      const onUpdate = vi.fn()
      renderSettings({ onUpdate })
      fireEvent.click(screen.getByText(/Automatically add rated words to Favorites/))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ autoAddRankedToFavorites: true }),
      )
    })
  })

  describe('stepper checkboxes', () => {
    it('toggles customIntervalAgain checkbox on', () => {
      const onUpdate = vi.fn()
      renderSettings({ onUpdate })
      fireEvent.click(screen.getByText(/Repetition interval for words rated.*Again/))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalAgain: 1 }),
      )
    })

    it('toggles customIntervalAgain checkbox off', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
        onUpdate,
      })
      fireEvent.click(screen.getByText(/Repetition interval for words rated.*Again/))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalAgain: false }),
      )
    })

    it('toggles customIntervalGood checkbox on', () => {
      const onUpdate = vi.fn()
      renderSettings({ onUpdate })
      fireEvent.click(screen.getByText(/Repetition interval for words rated.*Good/))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalGood: 10 }),
      )
    })

    it('toggles autoFlipOnWrongAttempts checkbox on', () => {
      const onUpdate = vi.fn()
      renderSettings({ onUpdate })
      fireEvent.click(screen.getByText(/Automatically flip word card after/))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ autoFlipOnWrongAttempts: 3 }),
      )
    })
  })

  describe('TTS settings', () => {
    it('enable TTS checkbox calls onUpdate', () => {
      const onUpdate = vi.fn()
      renderSettings({ onUpdate, settings: { ...baseSettings, enableTTS: false } })
      fireEvent.click(screen.getByText(/Enable text-to-speech/))
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ enableTTS: true }),
      )
    })

    it('shows TTS key popover when clicking add key button', () => {
      renderSettings({ settings: { ...baseSettings, enableTTS: true } })
      fireEvent.click(screen.getByText('Add TTS service key'))
      expect(screen.getByPlaceholderText('Paste your API key...')).toBeInTheDocument()
    })

    it('shows change TTS key button when key exists', () => {
      renderSettings({
        settings: { ...baseSettings, enableTTS: true, ttsKey: 'existing-key' },
      })
      expect(screen.getByText('Change TTS service key')).toBeInTheDocument()
    })

    it('closes TTS key popover on close button', () => {
      renderSettings({ settings: { ...baseSettings, enableTTS: true } })
      fireEvent.click(screen.getByText('Add TTS service key'))
      fireEvent.click(screen.getByText('Close'))
      expect(screen.queryByPlaceholderText('Paste your API key...')).not.toBeInTheDocument()
    })

    it('disables Google/Azure buttons when input is empty', () => {
      renderSettings({ settings: { ...baseSettings, enableTTS: true } })
      fireEvent.click(screen.getByText('Add TTS service key'))
      expect(screen.getByText('Set Google TTS Key')).toBeDisabled()
      expect(screen.getByText('Set Azure TTS Key')).toBeDisabled()
    })

    it('shows TTS reset confirm popover on reset button', async () => {
      const hidePopoverOrig = HTMLDivElement.prototype.hidePopover
      HTMLDivElement.prototype.hidePopover = vi.fn()
      const showPopoverOrig = HTMLDivElement.prototype.showPopover
      HTMLDivElement.prototype.showPopover = vi.fn()
      renderSettings({ settings: { ...baseSettings, enableTTS: true, ttsKey: 'some-key' } })
      fireEvent.click(screen.getByText('Change TTS service key'))
      fireEvent.click(screen.getByText('Reset key'))
      expect(screen.getByText('Are you sure you want to reset the TTS key?')).toBeInTheDocument()
      HTMLDivElement.prototype.hidePopover = hidePopoverOrig
      HTMLDivElement.prototype.showPopover = showPopoverOrig
    })

    it('hides TTS key region when enableTTS is false', () => {
      renderSettings({ settings: { ...baseSettings, enableTTS: false } })
      expect(screen.queryByText('Add TTS service key')).not.toBeInTheDocument()
    })
  })

  describe('stepper controls', () => {
    it('decrements again interval', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Decrease value')[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalAgain: 4 }),
      )
    })

    it('increments again interval', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Increase value')[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalAgain: 6 }),
      )
    })

    it('decrements good interval by 10', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalGood: 50 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Decrease value')[1])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalGood: 40 }),
      )
    })

    it('increments good interval by 10', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalGood: 50 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Increase value')[1])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalGood: 60 }),
      )
    })

    it('decrements auto-flip wrong attempts', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, autoFlipOnWrongAttempts: 5 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Decrease value')[2])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ autoFlipOnWrongAttempts: 4 }),
      )
    })

    it('increments auto-flip wrong attempts', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, autoFlipOnWrongAttempts: 5 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Increase value')[2])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ autoFlipOnWrongAttempts: 6 }),
      )
    })

    it('decrements phrasebook threshold by 5', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, phrasebookMode: true, phrasebookThreshold: 80 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Decrease value')[3])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ phrasebookThreshold: 75 }),
      )
    })

    it('increments phrasebook threshold by 5', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, phrasebookMode: true, phrasebookThreshold: 80 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Increase value')[3])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ phrasebookThreshold: 85 }),
      )
    })

    it('again value floors at 1', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 1 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Decrease value')[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalAgain: 1 }),
      )
    })

    it('again value caps at 9', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 9 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Increase value')[0])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalAgain: 9 }),
      )
    })

    it('good value floors at 10', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalGood: 10 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Decrease value')[1])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalGood: 10 }),
      )
    })

    it('good value caps at 90', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalGood: 90 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Increase value')[1])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalGood: 90 }),
      )
    })

    it('auto-flip floors at 1', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, autoFlipOnWrongAttempts: 1 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Decrease value')[2])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ autoFlipOnWrongAttempts: 1 }),
      )
    })

    it('auto-flip caps at 9', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, autoFlipOnWrongAttempts: 9 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Increase value')[2])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ autoFlipOnWrongAttempts: 9 }),
      )
    })

    it('phrasebook threshold floors at 50', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, phrasebookMode: true, phrasebookThreshold: 50 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Decrease value')[3])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ phrasebookThreshold: 50 }),
      )
    })

    it('phrasebook threshold caps at 100', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, phrasebookMode: true, phrasebookThreshold: 100 },
        onUpdate,
      })
      fireEvent.click(screen.getAllByTitle('Increase value')[3])
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ phrasebookThreshold: 100 }),
      )
    })

    it('stepper buttons are disabled when checkbox is off', () => {
      renderSettings()
      screen.getAllByTitle('Decrease value').forEach((btn) => {
        expect(btn).toBeDisabled()
      })
      screen.getAllByTitle('Increase value').forEach((btn) => {
        expect(btn).toBeDisabled()
      })
    })
  })

  describe('stepper input editing', () => {
    it('edits again interval input directly', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
        onUpdate,
      })
      const input = screen.getByDisplayValue('5')
      fireEvent.change(input, { target: { value: '3' } })
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalAgain: 3 }),
      )
    })

    it('clamps again interval to max 9 on input', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
        onUpdate,
      })
      const input = screen.getByDisplayValue('5')
      fireEvent.change(input, { target: { value: '15' } })
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalAgain: 9 }),
      )
    })

    it('clamps again interval to 1 on empty input', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
        onUpdate,
      })
      const input = screen.getByDisplayValue('5')
      fireEvent.change(input, { target: { value: '' } })
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalAgain: 1 }),
      )
    })

    it('clamps again interval on blur', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 15 },
        onUpdate,
      })
      const input = screen.getByDisplayValue('15')
      fireEvent.blur(input)
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalAgain: 9 }),
      )
    })

    it('clamps good interval on blur', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, customIntervalGood: 5 },
        onUpdate,
      })
      const input = screen.getByDisplayValue('5')
      fireEvent.blur(input)
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ customIntervalGood: 10 }),
      )
    })

    it('edits phrasebook threshold input directly', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, phrasebookMode: true, phrasebookThreshold: 80 },
        onUpdate,
      })
      const input = screen.getByDisplayValue('80')
      fireEvent.change(input, { target: { value: '85' } })
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ phrasebookThreshold: 85 }),
      )
    })

    it('clamps phrasebook threshold on blur', () => {
      const onUpdate = vi.fn()
      renderSettings({
        settings: { ...baseSettings, phrasebookMode: true, phrasebookThreshold: 30 },
        onUpdate,
      })
      const input = screen.getByDisplayValue('30')
      fireEvent.blur(input)
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ phrasebookThreshold: 50 }),
      )
    })

    it('selects input text on focus', () => {
      renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
      })
      const input = screen.getByDisplayValue('5')
      const selectSpy = vi.spyOn(input as unknown as { select: () => void }, 'select')
      fireEvent.focus(input)
      expect(selectSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('stepper keyboard navigation', () => {
    function getGroupSteppers(container: HTMLElement): NodeListOf<HTMLElement> {
      const groups = container.querySelectorAll<HTMLElement>('[role="group"]')
      return groups[0].querySelectorAll<HTMLElement>('[data-stepper]')
    }

    it('navigates with ArrowRight within a group', () => {
      const { container } = renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
      })
      const steppers = getGroupSteppers(container)
      const focusSpy = vi.spyOn(steppers[1], 'focus')
      fireEvent.keyDown(steppers[0], { key: 'ArrowRight' })
      expect(focusSpy).toHaveBeenCalledTimes(1)
    })

    it('navigates with ArrowLeft within a group', () => {
      const { container } = renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
      })
      const steppers = getGroupSteppers(container)
      const focusSpy = vi.spyOn(steppers[steppers.length - 1], 'focus')
      fireEvent.keyDown(steppers[0], { key: 'ArrowLeft' })
      expect(focusSpy).toHaveBeenCalledTimes(1)
    })

    it('wraps around with ArrowRight at end', () => {
      const { container } = renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
      })
      const steppers = getGroupSteppers(container)
      const lastIdx = steppers.length - 1
      const focusSpy = vi.spyOn(steppers[0], 'focus')
      fireEvent.keyDown(steppers[lastIdx], { key: 'ArrowRight' })
      expect(focusSpy).toHaveBeenCalledTimes(1)
    })

    it('wraps around with ArrowLeft at start', () => {
      const { container } = renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
      })
      const steppers = getGroupSteppers(container)
      const lastIdx = steppers.length - 1
      const focusSpy = vi.spyOn(steppers[lastIdx], 'focus')
      fireEvent.keyDown(steppers[0], { key: 'ArrowLeft' })
      expect(focusSpy).toHaveBeenCalledTimes(1)
    })

    it('navigates with Home and End keys', () => {
      const { container } = renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
      })
      const steppers = getGroupSteppers(container)
      const endSpy = vi.spyOn(steppers[steppers.length - 1], 'focus')
      fireEvent.keyDown(steppers[0], { key: 'End' })
      expect(endSpy).toHaveBeenCalledTimes(1)

      const homeSpy = vi.spyOn(steppers[0], 'focus')
      fireEvent.keyDown(steppers[steppers.length - 1], { key: 'Home' })
      expect(homeSpy).toHaveBeenCalledTimes(1)
    })

    it('does nothing for unrelated keys', () => {
      const { container } = renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
      })
      const steppers = getGroupSteppers(container)
      const focusSpy = vi.spyOn(steppers[1], 'focus')
      fireEvent.keyDown(steppers[0], { key: 'Enter' })
      expect(focusSpy).not.toHaveBeenCalled()
    })

    it('does nothing when target data-stepper is not in a group', () => {
      renderSettings({
        settings: { ...baseSettings, customIntervalAgain: 5 },
      })
      const loneElem = document.createElement('div')
      loneElem.setAttribute('data-stepper', 'true')
      document.body.appendChild(loneElem)

      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus')
      fireEvent.keyDown(loneElem, { key: 'ArrowRight' })
      expect(focusSpy).not.toHaveBeenCalled()

      document.body.removeChild(loneElem)
    })
  })

  describe('save/export', () => {
    it('calls onExport when save button clicked', () => {
      const onExport = vi.fn()
      renderSettings({ onExport })
      fireEvent.click(screen.getByText('Save progress'))
      expect(onExport).toHaveBeenCalledTimes(1)
    })

    it('forwards saveRef to the save button', () => {
      const saveRef = { current: null } as React.RefObject<HTMLButtonElement | null>
      render(
        <I18nProvider lang="en">
          <Settings
            settings={baseSettings}
            onUpdate={vi.fn()}
            onReset={vi.fn()}
            dictionaryId="test"
            onExport={vi.fn()}
            onImportData={vi.fn()}
            onChangeDictionary={vi.fn()}
            saveRef={saveRef}
          />
        </I18nProvider>,
      )
      expect(saveRef.current).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe('file import (load progress)', () => {
    it('calls onImportData for valid progress file', async () => {
      const onImportData = vi.fn()
      const { container } = renderSettings({ onImportData })
      await triggerImport(container, JSON.stringify(makeValidExportedData()))
      await waitFor(() => {
        expect(onImportData).toHaveBeenCalledTimes(1)
      })
    })

    it('shows error popover for mismatched dictId', async () => {
      const onImportData = vi.fn()
      const data = makeValidExportedData('other-dict-id')
      const { container } = renderSettings({ onImportData, dictionaryId: 'words-srp-rus-1200' })
      await triggerImport(container, JSON.stringify(data))
      await waitFor(() => {
        expect(screen.getByText(/Dictionary ID does not match/)).toBeInTheDocument()
      })
    })

    it('shows error popover for corrupted file (missing arrays)', async () => {
      const onImportData = vi.fn()
      const { container } = renderSettings({ onImportData })
      await triggerImport(container, JSON.stringify({ dictId: 'words-srp-rus-1200', version: 1 }))
      await waitFor(() => {
        expect(screen.getByText(/File corrupted/)).toBeInTheDocument()
      })
    })

    it('shows error popover for invalid JSON', async () => {
      const onImportData = vi.fn()
      const { container } = renderSettings({ onImportData })
      await triggerImport(container, 'not json')
      await waitFor(() => {
        expect(screen.getByText(/Failed to read file/)).toBeInTheDocument()
      })
    })

    it('resets file input after import', async () => {
      const onImportData = vi.fn()
      const { container } = renderSettings({ onImportData })
      const input = getImportFileInput(container)
      const resetSpy = vi.spyOn(input, 'value', 'set')
      await triggerImport(container, JSON.stringify(makeValidExportedData()))
      await waitFor(() => {
        expect(resetSpy).toHaveBeenCalledWith('')
      })
    })
  })

  describe('dictionary file change', () => {
    it('calls onChangeDictionary after clicking confirm for plain array', async () => {
      const onChangeDictionary = vi.fn()
      const { container } = renderSettings({ onChangeDictionary })
      await triggerDictChange(container, JSON.stringify([{ id: 1, sr: 'word', ru: ['trans'] }]))
      await waitFor(async () => {
        const buttons = screen.getAllByText('Change')
        fireEvent.click(buttons[buttons.length - 1])
        await act(async () => {})
        expect(onChangeDictionary).toHaveBeenCalledWith(
          [{ id: 1, sr: 'word', ru: ['trans'] }],
          undefined,
          'my-dict',
        )
      })
    })

    it('calls onChangeDictionary with meta after clicking confirm', async () => {
      const onChangeDictionary = vi.fn()
      const meta: DictMeta = { type: 'words', langFrom: 'sr', langTo: 'ru', langToAlt: 'en', langRef: 'sr-Latn' }
      const { container } = renderSettings({ onChangeDictionary })
      await triggerDictChange(container, JSON.stringify([
        meta,
        { id: 1, sr: 'word', ru: ['trans'] },
      ]))
      await waitFor(async () => {
        const buttons = screen.getAllByText('Change')
        fireEvent.click(buttons[buttons.length - 1])
        await act(async () => {})
        expect(onChangeDictionary).toHaveBeenCalledWith(
          [{ id: 1, sr: 'word', ru: ['trans'] }],
          meta,
          'my-dict',
        )
      })
      expect(onChangeDictionary).toHaveBeenCalledTimes(1)
    })

    it('shows error for non-array file', async () => {
      const onChangeDictionary = vi.fn()
      const { container } = renderSettings({ onChangeDictionary })
      await triggerDictChange(container, JSON.stringify({ not: 'array' }))
      await waitFor(() => {
        expect(screen.getByText(/Expected an array of word objects/)).toBeInTheDocument()
      })
    })

    it('shows error for empty array', async () => {
      const onChangeDictionary = vi.fn()
      const { container } = renderSettings({ onChangeDictionary })
      await triggerDictChange(container, JSON.stringify([]))
      await waitFor(() => {
        expect(screen.getByText(/Expected an array of word objects/)).toBeInTheDocument()
      })
    })

    it('shows error for array without numeric ids', async () => {
      const onChangeDictionary = vi.fn()
      const { container } = renderSettings({ onChangeDictionary })
      await triggerDictChange(container, JSON.stringify([{ foo: 'bar' }]))
      await waitFor(() => {
        expect(screen.getByText(/Expected an array of word objects/)).toBeInTheDocument()
      })
    })

    it('shows error for meta-array without word data', async () => {
      const onChangeDictionary = vi.fn()
      const { container } = renderSettings({ onChangeDictionary })
      await triggerDictChange(container, JSON.stringify([
        { type: 'words', langFrom: 'sr', langTo: 'ru', langToAlt: 'en', langRef: 'sr-Latn' },
      ]))
      await waitFor(() => {
        expect(screen.getByText(/Expected an object with dictionary metadata/)).toBeInTheDocument()
      })
    })

    it('shows error for invalid JSON in dict file', async () => {
      const onChangeDictionary = vi.fn()
      const { container } = renderSettings({ onChangeDictionary })
      await triggerDictChange(container, 'not json')
      await waitFor(() => {
        expect(screen.getByText(/Failed to read file/)).toBeInTheDocument()
      })
    })

    it('does not call onChangeDictionary when cancel is clicked', async () => {
      const onChangeDictionary = vi.fn()
      const { container } = renderSettings({ onChangeDictionary })
      await triggerDictChange(container, JSON.stringify([{ id: 1, sr: 'word', ru: ['trans'] }]))
      await waitFor(() => {
        fireEvent.click(screen.getAllByText('Cancel')[0])
        expect(onChangeDictionary).not.toHaveBeenCalled()
      })
    })
  })

  describe('reset data', () => {
    it('calls onReset when reset confirmed', () => {
      const onReset = vi.fn()
      renderSettings({ onReset })
      fireEvent.click(screen.getByText('Reset data'))
      const popover = document.getElementById('reset-confirm')!
      fireEvent.click(within(popover).getByText('Reset'))
      expect(onReset).toHaveBeenCalledTimes(1)
    })

    it('renders the reset confirm section with description', () => {
      renderSettings()
      fireEvent.click(screen.getByText('Reset data'))
      expect(screen.getByText(/Delete all data/)).toBeInTheDocument()
    })
  })

  describe('dictIdMatch via import', () => {
    it('matches dict id with strict mode (localStorage)', async () => {
      localStorage.setItem('useStrictDictIdChecks', 'true')
      const onImportData = vi.fn()
      const { container } = renderSettings({ onImportData, dictionaryId: 'words-srp-rus-1200' })
      await triggerImport(container, JSON.stringify(makeValidExportedData('words-srp-rus-1200')))
      await waitFor(() => {
        expect(onImportData).toHaveBeenCalledTimes(1)
      })
    })

    it('rejects mismatched dict id in strict mode', async () => {
      localStorage.setItem('useStrictDictIdChecks', 'true')
      const onImportData = vi.fn()
      const { container } = renderSettings({ onImportData, dictionaryId: 'words-srp-rus-1200' })
      await triggerImport(container, JSON.stringify(makeValidExportedData('other-dict')))
      await waitFor(() => {
        expect(screen.getByText(/Dictionary ID does not match/)).toBeInTheDocument()
      })
    })

    it('matches lenient dict id (first 3 segments)', async () => {
      const onImportData = vi.fn()
      const { container } = renderSettings({ onImportData, dictionaryId: 'words-srp-rus-9999' })
      await triggerImport(container, JSON.stringify(makeValidExportedData('words-srp-rus-1200')))
      await waitFor(() => {
        expect(onImportData).toHaveBeenCalledTimes(1)
      })
    })

    it('rejects lenient dict id when more than first 3 segments differ', async () => {
      const onImportData = vi.fn()
      const { container } = renderSettings({ onImportData, dictionaryId: 'phrases-rus-srp-trudno275' })
      await triggerImport(container, JSON.stringify(makeValidExportedData('words-srp-rus-1200')))
      await waitFor(() => {
        expect(screen.getByText(/Dictionary ID does not match/)).toBeInTheDocument()
      })
    })
  })

  describe('popovers', () => {
    it('shows error text in popover for invalid JSON', () => {
      const { container } = renderSettings()
      expect(container.textContent).toContain('Change dictionary')
    })

    it('shows error text after failed import', async () => {
      const onImportData = vi.fn()
      const { container } = renderSettings({ onImportData })
      await triggerImport(container, 'bad json')
      await waitFor(() => {
        expect(container.textContent).toContain('Failed to read file')
      })
      expect(screen.getAllByText('OK').length).toBe(2)
    })

    it('renders success popover for valid import', async () => {
      const onImportData = vi.fn()
      const { container } = renderSettings({ onImportData })
      await triggerImport(container, JSON.stringify(makeValidExportedData()))
      await waitFor(() => {
        expect(container.textContent).toContain('Data restored successfully')
      })
    })

    it('clicking OK dismisses error popover', async () => {
      const hideSpy = vi.spyOn(HTMLDivElement.prototype, 'hidePopover')
      const { container } = renderSettings()
      await triggerImport(container, 'bad json')
      await waitFor(() => {
        expect(container.textContent).toContain('Failed to read file')
      })
      const okButtons = screen.getAllByText('OK')
      fireEvent.click(okButtons[0])
      expect(hideSpy).toHaveBeenCalled()
    })

    it('clicking OK dismisses success popover', async () => {
      const hideSpy = vi.spyOn(HTMLDivElement.prototype, 'hidePopover')
      const { container } = renderSettings()
      await triggerImport(container, JSON.stringify(makeValidExportedData()))
      await waitFor(() => {
        expect(container.textContent).toContain('Data restored successfully')
      })
      const okButtons = screen.getAllByText('OK')
      fireEvent.click(okButtons[0])
      expect(hideSpy).toHaveBeenCalled()
    })
  })

  describe('file action buttons', () => {
    it('clicking Load Progress does not throw', () => {
      renderSettings()
      const btn = screen.getByText('Load progress')
      expect(() => fireEvent.click(btn)).not.toThrow()
    })

    it('clicking Change Dictionary does not throw', () => {
      renderSettings()
      const btn = screen.getByText('Change dictionary')
      expect(() => fireEvent.click(btn)).not.toThrow()
    })
  })

  describe('dictFileName display and updates', () => {
    it('formats dict file name with capitalized words', () => {
      renderSettings({ initialDictName: 'my-custom-dict-123' })
      expect(screen.getByText(/My-Custom-Dict-123 loaded/)).toBeInTheDocument()
    })

    it('uses fallback to default name when initialDictName is null', () => {
      renderSettings({ initialDictName: null })
      expect(screen.getByText(/Words-Srp-Rus-1200 loaded/)).toBeInTheDocument()
    })

    it('updates dict file name after confirming dict change', async () => {
      const onChangeDictionary = vi.fn()
      const { container } = renderSettings({ onChangeDictionary, initialDictName: 'old-dict' })
      expect(screen.getByText(/Old-Dict loaded/)).toBeInTheDocument()

      await triggerDictChange(container, JSON.stringify([{ id: 1, sr: 'word', ru: ['trans'] }]))
      await waitFor(async () => {
        const buttons = screen.getAllByText('Change')
        fireEvent.click(buttons[buttons.length - 1])
        await act(async () => {})
        expect(onChangeDictionary).toHaveBeenCalled()
      })
      expect(screen.getByText(/My-Dict loaded/)).toBeInTheDocument()
    })
  })

  describe('effect: sync dictFileName from props', () => {
    it('updates dictFileName when dictionaryId changes with initialDictName', () => {
      const { rerender } = render(
        <I18nProvider lang="en">
          <Settings
            settings={baseSettings}
            onUpdate={vi.fn()}
            onReset={vi.fn()}
            dictionaryId="words-srp-rus-1200"
            onExport={vi.fn()}
            onImportData={vi.fn()}
            onChangeDictionary={vi.fn()}
            initialDictName="first-dict"
          />
        </I18nProvider>,
      )
      expect(screen.getByText(/First-Dict loaded/)).toBeInTheDocument()

      rerender(
        <I18nProvider lang="en">
          <Settings
            settings={baseSettings}
            onUpdate={vi.fn()}
            onReset={vi.fn()}
            dictionaryId="phrases-rus-srp-trudno275"
            onExport={vi.fn()}
            onImportData={vi.fn()}
            onChangeDictionary={vi.fn()}
            initialDictName="second-dict"
          />
        </I18nProvider>,
      )
      expect(screen.getByText(/Second-Dict loaded/)).toBeInTheDocument()
    })

    it('updates dictFileName when initialDictName changes but dictionaryId stays same', () => {
      const { rerender } = render(
        <I18nProvider lang="en">
          <Settings
            settings={baseSettings}
            onUpdate={vi.fn()}
            onReset={vi.fn()}
            dictionaryId="test-dict"
            onExport={vi.fn()}
            onImportData={vi.fn()}
            onChangeDictionary={vi.fn()}
            initialDictName="first-name"
          />
        </I18nProvider>,
      )
      expect(screen.getByText(/First-Name loaded/)).toBeInTheDocument()

      rerender(
        <I18nProvider lang="en">
          <Settings
            settings={baseSettings}
            onUpdate={vi.fn()}
            onReset={vi.fn()}
            dictionaryId="test-dict"
            onExport={vi.fn()}
            onImportData={vi.fn()}
            onChangeDictionary={vi.fn()}
            initialDictName="second-name"
          />
        </I18nProvider>,
      )
      expect(screen.getByText(/Second-Name loaded/)).toBeInTheDocument()
    })

    it('falls back to default name when dictionaryId changes but initialDictName is null', () => {
      const { rerender } = render(
        <I18nProvider lang="en">
          <Settings
            settings={baseSettings}
            onUpdate={vi.fn()}
            onReset={vi.fn()}
            dictionaryId="first-id"
            onExport={vi.fn()}
            onImportData={vi.fn()}
            onChangeDictionary={vi.fn()}
            initialDictName={null}
          />
        </I18nProvider>,
      )
      expect(screen.getByText(/Words-Srp-Rus-1200 loaded/)).toBeInTheDocument()

      rerender(
        <I18nProvider lang="en">
          <Settings
            settings={baseSettings}
            onUpdate={vi.fn()}
            onReset={vi.fn()}
            dictionaryId="second-id"
            onExport={vi.fn()}
            onImportData={vi.fn()}
            onChangeDictionary={vi.fn()}
            initialDictName={null}
          />
        </I18nProvider>,
      )
      expect(screen.getByText(/Words-Srp-Rus-1200 loaded/)).toBeInTheDocument()
    })
  })
})
