const OPENAI_API_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-4.1-mini'
const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    subject: {
      type: 'string',
      enum: ['Matematik', 'Svenska', 'Engelska', 'Annat', 'Okänt'],
    },
    taskType: { type: 'string' },
    visibleContent: { type: 'string' },
    problemExplanation: { type: 'string' },
    languageSupport: { type: 'string' },
    observations: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 6,
    },
    steps: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 6,
    },
  },
  required: [
    'subject',
    'taskType',
    'visibleContent',
    'problemExplanation',
    'languageSupport',
    'observations',
    'steps',
  ],
}

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

function getModelName() {
  return (
    process.env.OPENAI_VISION_MODEL ||
    process.env.OPENAI_MODEL ||
    DEFAULT_MODEL
  )
}

function makeDebugStatus({
  envKeyStatus,
  fallbackReason = '',
  model,
  openaiError = '',
  routeStatus,
}) {
  return {
    envKeyStatus,
    fallbackReason,
    model,
    openaiError,
    routeStatus,
  }
}

function logVisionStatus(message, details) {
  console.info(`[api/analyze-assignment] ${message}`, details)
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

export function parseAnalysis(text) {
  const normalized = text
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '')
  const parsed = JSON.parse(normalized)
  const subject = sanitizeText(parsed.subject, 50)
  const taskType = sanitizeText(parsed.taskType, 300)
  const visibleContent = sanitizeText(parsed.visibleContent, 2500)
  const problemExplanation = sanitizeText(parsed.problemExplanation, 1500)
  const languageSupport = sanitizeText(parsed.languageSupport, 1500)
  const observations = Array.isArray(parsed.observations)
    ? parsed.observations
      .map((observation) => sanitizeText(String(observation), 500))
      .filter(Boolean)
    : []
  const steps = Array.isArray(parsed.steps)
    ? parsed.steps.map((step) => sanitizeText(String(step), 500)).filter(Boolean)
    : []

  if (
    !ANALYSIS_SCHEMA.properties.subject.enum.includes(subject) ||
    !taskType ||
    !visibleContent ||
    !problemExplanation ||
    observations.length === 0 ||
    steps.length < 3
  ) {
    throw new Error('Analysis response did not match the expected format')
  }

  return {
    subject,
    taskType,
    visibleContent,
    problemExplanation,
    languageSupport,
    observations: observations.slice(0, 6),
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
  const humorMode = body.humorMode === true
  const model = getModelName()
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY?.trim())
  const envKeyStatus = hasApiKey ? 'configured' : 'missing'

  logVisionStatus('Configuration', {
    envKeyStatus,
    model,
    routeStatus: 'request_received',
  })

  if (!fileName || !fileType || (!fileData && !fileUrl)) {
    return response.status(400).json({
      error: 'Assignment file is required',
      debug: makeDebugStatus({
        envKeyStatus,
        fallbackReason: 'invalid_assignment_file',
        model,
        routeStatus: 'invalid_request',
      }),
    })
  }

  if (!hasApiKey) {
    logVisionStatus('Fallback status', {
      envKeyStatus,
      fallbackReason: 'missing_openai_api_key',
      routeStatus: 'configuration_error',
    })

    return response.status(503).json({
      error: 'OpenAI API-nyckel saknas på servern',
      debug: makeDebugStatus({
        envKeyStatus,
        fallbackReason: 'missing_openai_api_key',
        model,
        routeStatus: 'configuration_error',
      }),
    })
  }

  try {
    const fileContent = makeFileContent({
      fileData,
      fileName,
      fileType,
      fileUrl,
    })

    logVisionStatus('Vision request starting', {
      envKeyStatus,
      fileInputType: fileContent.type,
      fileName,
      fileSource: fileUrl ? 'url' : 'data',
      imageIncluded: fileContent.type === 'input_image',
      model,
    })

    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instructions:
          [
            'Du är PluggArenas visionbaserade AI Study Buddy för svenska skolelever.',
            'Läs först allt synligt innehåll i bilden eller PDF-filen: rubriker, instruktioner, tal, symboler, luckor, tabeller och markerade exempel.',
            'Utgå endast från det du faktiskt kan se. Ge inte generella studietips när en konkret uppgift är läsbar.',
            'Identifiera ämnet automatiskt som Matematik, Svenska, Engelska, Annat eller Okänt och identifiera uppgiftstypen så specifikt som möjligt.',
            'visibleContent ska återge eller tydligt beskriva den konkreta uppgiften. observations ska nämna konkreta visuella bevis, till exempel synliga tal, ord, operatorer eller instruktioner.',
            'För Matematik: förklara vilken matematisk uppgiftstyp det är och ge 3-6 ledtrådar som använder de synliga talen eller symbolerna. Visa aldrig hela slutsvaret, en färdig svarstabell eller alla lösningar direkt. För tiokompisar ska du känna igen att eleven söker talpar som tillsammans blir 10 och leda eleven med exempelmetod utan att fylla alla svar.',
            'För Svenska: ge konkret språkstöd om stavning, grammatik, läsförståelse eller textstruktur utifrån orden i uppgiften.',
            'För Engelska: ge konkret översättnings-, ordförråds- och grammatikhjälp utifrån den synliga engelska texten.',
            'Om något är oläsligt, säg exakt vad som är osäkert i visibleContent. Hitta inte på text eller tal.',
            'Ledtrådarna ska gå från försiktig knuff till tydligare metodstöd, men aldrig avslöja hela svaret direkt.',
            humorMode
              ? 'Humorläge är på: ledtrådarna får innehålla korta, snälla och skolvänliga kommentarer. Skämten får aldrig ändra fakta, tal, metod eller korrekthet och du får aldrig ge fel svar med flit.'
              : 'Humorläge är av: håll tonen vänlig och tydlig utan skämt.',
          ].join(' '),
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: [
                  `Analysera skoluppgiften "${fileName}".`,
                  'Börja med att läsa och klassificera det faktiska innehållet.',
                  'Kontrollera att varje ledtråd hänvisar till något konkret som syns i uppgiften.',
                ].join(' '),
              },
              fileContent,
            ],
          },
        ],
        max_output_tokens: 900,
        model,
        text: {
          format: {
            type: 'json_schema',
            name: 'assignment_analysis',
            strict: true,
            schema: ANALYSIS_SCHEMA,
          },
        },
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

    logVisionStatus('Vision request completed', {
      envKeyStatus,
      model,
      responseId: data.id || null,
      routeStatus: 'openai_success',
    })

    return response.status(200).json({
      analysis,
      source: 'openai',
      debug: makeDebugStatus({
        envKeyStatus,
        model,
        routeStatus: 'openai_success',
      }),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error('[api/analyze-assignment] Analysis failed', {
      envKeyStatus,
      error: errorMessage,
      fallbackReason: 'openai_request_failed',
      model,
      routeStatus: 'openai_error',
    })

    return response.status(502).json({
      error: `OpenAI Vision-anropet misslyckades: ${errorMessage}`,
      debug: makeDebugStatus({
        envKeyStatus,
        fallbackReason: 'openai_request_failed',
        model,
        openaiError: errorMessage,
        routeStatus: 'openai_error',
      }),
    })
  }
}
