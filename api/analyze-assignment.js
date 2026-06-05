const OPENAI_API_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-4.1-mini'

function isDevelopment() {
  return process.env.NODE_ENV !== 'production'
}

function parseRequestBody(request) {
  if (typeof request.body === 'string') {
    return JSON.parse(request.body)
  }

  return request.body ?? {}
}

function sanitizeText(value, maxLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function makeFallbackAnalysis(fileName) {
  return {
    summary: `Uppgiften ${fileName || 'du laddade upp'} är redo att bearbetas.`,
    steps: [
      'Läs hela uppgiften och markera vad som faktiskt efterfrågas.',
      'Skriv ner givna fakta, begrepp eller tal innan du börjar lösa.',
      'Välj en metod och arbeta ett delsteg i taget.',
      'Kontrollera till sist att svaret matchar frågan.',
    ],
  }
}

function extractResponseText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim()
  }

  return (
    data.output
      ?.flatMap((item) => item.content ?? [])
      ?.map((content) => content.text)
      ?.filter(Boolean)
      ?.join('\n')
      ?.trim() || ''
  )
}

function parseAnalysis(text) {
  const normalized = text
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '')
  const parsed = JSON.parse(normalized)
  const steps = Array.isArray(parsed.steps)
    ? parsed.steps.map((step) => sanitizeText(String(step), 500)).filter(Boolean)
    : []

  if (!sanitizeText(parsed.summary, 1500) || steps.length === 0) {
    throw new Error('Analysis response did not match the expected format')
  }

  return {
    summary: sanitizeText(parsed.summary, 1500),
    steps: steps.slice(0, 6),
  }
}

function makeFileContent({ fileData, fileName, fileType, fileUrl }) {
  const source = fileUrl || fileData

  if (fileType.startsWith('image/')) {
    return {
      detail: 'high',
      image_url: source,
      type: 'input_image',
    }
  }

  return {
    filename: fileName,
    ...(fileUrl ? { file_url: fileUrl } : { file_data: fileData }),
    type: 'input_file',
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  let body

  try {
    body = parseRequestBody(request)
  } catch (error) {
    return response.status(400).json({
      error: 'Invalid JSON request body',
      ...(isDevelopment() && { detail: error.message }),
    })
  }

  const fileData = sanitizeText(body.fileData, 12_000_000)
  const fileName = sanitizeText(body.fileName, 200)
  const fileType = sanitizeText(body.fileType, 100)
  const fileUrl = sanitizeText(body.fileUrl, 4000)

  if (!fileName || !fileType || (!fileData && !fileUrl)) {
    return response.status(400).json({ error: 'Assignment file is required' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(200).json({
      analysis: makeFallbackAnalysis(fileName),
      source: 'mock',
    })
  }

  try {
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instructions:
          'Du är PluggArenas AI Study Buddy. Analysera elevens skoluppgift på svenska. Lös inte hela uppgiften åt eleven. Returnera endast giltig JSON med fälten summary (kort sammanfattning) och steps (array med 3-6 pedagogiska ledtrådar i stigande tydlighet). Varje steg ska hjälpa eleven vidare utan att avslöja slutsvaret direkt.',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Analysera skoluppgiften "${fileName}" och skapa stegvisa ledtrådar.`,
              },
              makeFileContent({ fileData, fileName, fileType, fileUrl }),
            ],
          },
        ],
        max_output_tokens: 500,
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(
        `OpenAI request failed: ${openaiResponse.status} ${errorText.slice(0, 400)}`,
      )
    }

    const data = await openaiResponse.json()
    const analysis = parseAnalysis(extractResponseText(data))

    return response.status(200).json({ analysis, source: 'openai' })
  } catch (error) {
    console.error('[api/analyze-assignment] Analysis failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    return response.status(200).json({
      analysis: makeFallbackAnalysis(fileName),
      source: 'mock',
      ...(isDevelopment() && {
        debug: error instanceof Error ? error.message : String(error),
      }),
    })
  }
}
