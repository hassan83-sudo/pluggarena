const fallbackOptions = [
  'Kontrollera uppgiftens instruktion igen',
  'Hoppa över alla mellanled',
  'Utgå från ett annat ämne',
  'Svara utan att läsa underlaget',
]

function shorten(value, maxLength = 120) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 1).trim()}…`
}

function createOptions(answer, candidates, index) {
  const normalizedAnswer = shorten(answer)
  const uniqueOptions = [normalizedAnswer]

  ;[...candidates, ...fallbackOptions].forEach((candidate) => {
    const option = shorten(candidate)

    if (option && !uniqueOptions.includes(option) && uniqueOptions.length < 4) {
      uniqueOptions.push(option)
    }
  })

  const answerPosition = index % uniqueOptions.length
  const options = uniqueOptions.filter((option) => option !== normalizedAnswer)
  options.splice(answerPosition, 0, normalizedAnswer)

  return options
}

function createQuestion(question, answer, candidates, index, hint) {
  const normalizedAnswer = shorten(answer)

  return {
    answer: normalizedAnswer,
    hint,
    id: `generated-question-${index + 1}`,
    options: createOptions(normalizedAnswer, candidates, index),
    question,
  }
}

export function buildGeneratedQuiz(analysis, assignment) {
  const steps = Array.isArray(analysis?.steps)
    ? analysis.steps.filter(Boolean)
    : []
  const observations = Array.isArray(analysis?.observations)
    ? analysis.observations.filter(Boolean)
    : []
  const subject = analysis?.subject || 'Uppgiften'
  const taskType = analysis?.taskType || 'Skoluppgift'
  const visibleContent =
    analysis?.visibleContent || assignment?.title || assignment?.fileName
  const explanation =
    analysis?.problemExplanation || 'Läs uppgiften och arbeta steg för steg.'
  const languageSupport =
    analysis?.languageSupport || 'Använd uppgiftens nyckelord som stöd.'
  const contentPool = [
    visibleContent,
    explanation,
    languageSupport,
    ...steps,
    ...observations,
  ].filter(Boolean)
  const questions = [
    createQuestion(
      'Vilket ämne handlar uppgiften främst om?',
      subject,
      ['Matematik', 'Svenska', 'Engelska', 'Naturkunskap'].filter(
        (option) => option !== subject,
      ),
      0,
      'Titta på ämnesetiketten i AI-analysen.',
    ),
    createQuestion(
      'Vilken typ av uppgift identifierade AI Study Buddy?',
      taskType,
      ['Faktatext', 'Problemlösning', 'Språkövning', 'Resonemangsuppgift'],
      1,
      'Uppgiftstypen visas bredvid ämnet.',
    ),
    createQuestion(
      'Vilken beskrivning stämmer bäst med uppgiftens innehåll?',
      visibleContent,
      [explanation, languageSupport, ...observations],
      2,
      'Utgå från det AI Vision kunde läsa i filen.',
    ),
  ]

  steps.forEach((step, stepIndex) => {
    questions.push(
      createQuestion(
        `Vad bör du göra i steg ${stepIndex + 1}?`,
        step,
        [...steps.filter((item) => item !== step), ...observations],
        questions.length,
        `Jämför med lösningssteg ${stepIndex + 1}.`,
      ),
    )
  })

  observations.forEach((observation) => {
    questions.push(
      createQuestion(
        'Vilken observation hör till den analyserade uppgiften?',
        observation,
        [...observations.filter((item) => item !== observation), ...steps],
        questions.length,
        'Leta efter detaljer som AI Vision hittade i underlaget.',
      ),
    )
  })

  const extraQuestions = [
    ['Vad är den viktigaste förklaringen av problemet?', explanation],
    ['Vilket språkstöd passar bäst till uppgiften?', languageSupport],
    ['Vilket underlag ska du främst utgå från?', visibleContent],
  ]

  extraQuestions.forEach(([question, answer]) => {
    if (questions.length < 5) {
      questions.push(
        createQuestion(
          question,
          answer,
          contentPool.filter((item) => item !== answer),
          questions.length,
          'Använd sammanfattningen från AI Study Buddy.',
        ),
      )
    }
  })

  const targetCount = Math.min(
    10,
    Math.max(5, 5 + Math.min(steps.length, 3)),
  )

  return questions.slice(0, targetCount)
}
