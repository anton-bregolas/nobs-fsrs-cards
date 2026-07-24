export type TTSService = 'web' | 'google' | 'azure'

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function getAzureVoice(lang: string): string {
  const map: Record<string, string> = {
    'ru-RU': 'ru-RU-DariyaNeural',
    'sr-RS': 'sr-RS-NicholasNeural',
    'en-US': 'en-US-JennyNeural',
  }
  return map[lang] ?? 'en-US-JennyNeural'
}

export async function speakViaGoogle(text: string, lang: string, apiKey: string): Promise<void> {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: lang },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body || `HTTP ${res.status}`)
  }
  const data = await res.json()
  const blobResp = await fetch(`data:audio/mp3;base64,${data.audioContent}`)
  const blob = await blobResp.blob()
  const url = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const audio = new Audio(url)
    audio.onended = () => { URL.revokeObjectURL(url); resolve() }
    audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('playback failed')) }
    audio.play().catch(reject)
  })
}

export async function speakViaAzure(text: string, lang: string, apiKey: string): Promise<void> {
  const voice = getAzureVoice(lang)
  const ssml = `<speak version='1.0' xml:lang='${lang}'><voice xml:lang='${lang}' name='${voice}'>${escapeXml(text)}</voice></speak>`
  const res = await fetch(
    'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1',
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: ssml,
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body || `HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const audio = new Audio(url)
    audio.onended = () => { URL.revokeObjectURL(url); resolve() }
    audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('playback failed')) }
    audio.play().catch(reject)
  })
}

export async function validateGoogleKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: 't' },
          voice: { languageCode: 'en-US' },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      }
    )
    return res.ok
  } catch { return false }
}

export async function validateAzureKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1',
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        },
        body: `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' name='en-US-JennyNeural'>t</voice></speak>`,
      }
    )
    return res.ok
  } catch { return false }
}
