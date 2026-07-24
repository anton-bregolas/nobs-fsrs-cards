import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { speakViaGoogle, speakViaAzure, validateGoogleKey, validateAzureKey } from '../../utils/tts'

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch')
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
  vi.spyOn(URL, 'revokeObjectURL')
})

let origAudio: typeof Audio

beforeEach(() => {
  origAudio = globalThis.Audio
})

function mockAudio() {
  const audio = {
    play: vi.fn().mockImplementation(() => {
      queueMicrotask(() => audio.onended?.())
      return Promise.resolve()
    }),
    onended: null as (() => void) | null,
  }
  globalThis.Audio = function () { return audio } as unknown as typeof Audio
  return audio
}

afterEach(() => {
  vi.restoreAllMocks()
  globalThis.Audio = origAudio
})

describe('speakViaGoogle', () => {
  it('fetches TTS from Google API and plays audio', async () => {
    const audio = mockAudio()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ audioContent: 'base64data' }),
    } as Response)
    vi.mocked(fetch).mockResolvedValueOnce({
      blob: () => Promise.resolve(new Blob()),
    } as Response)

    const promise = speakViaGoogle('hello', 'en-US', 'fake-key')
    await promise

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('texttospeech.googleapis.com'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetch).toHaveBeenNthCalledWith(2, 'data:audio/mp3;base64,base64data')
    expect(audio.play).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('throws on API error', async () => {
    mockAudio()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    } as Response)

    await expect(speakViaGoogle('hello', 'en-US', 'bad-key')).rejects.toThrow()
  })
})

describe('speakViaAzure', () => {
  it('fetches TTS from Azure API and plays audio', async () => {
    const audio = mockAudio()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    } as Response)

    const promise = speakViaAzure('hello', 'en-US', 'fake-key')
    await promise

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('cognitiveservices'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(audio.play).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('throws on API error', async () => {
    mockAudio()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    } as Response)

    await expect(speakViaAzure('hello', 'en-US', 'bad-key')).rejects.toThrow()
  })
})

describe('validateGoogleKey', () => {
  it('returns true when API responds ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response)
    const result = await validateGoogleKey('valid-key')
    expect(result).toBe(true)
  })

  it('returns false when API responds error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response)
    const result = await validateGoogleKey('bad-key')
    expect(result).toBe(false)
  })

  it('returns false on network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    const result = await validateGoogleKey('bad-key')
    expect(result).toBe(false)
  })
})

describe('validateAzureKey', () => {
  it('returns true when API responds ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response)
    const result = await validateAzureKey('valid-key')
    expect(result).toBe(true)
  })

  it('returns false when API responds error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response)
    const result = await validateAzureKey('bad-key')
    expect(result).toBe(false)
  })

  it('returns false on network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    const result = await validateAzureKey('bad-key')
    expect(result).toBe(false)
  })
})
