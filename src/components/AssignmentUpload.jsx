import { useEffect, useState } from 'react'
import {
  getAssignmentPreviewUrl,
  listAssignments,
  saveAssignment,
  saveAssignmentAnalysis,
} from '../lib/assignments.js'
import { isSupabaseConfigured } from '../lib/supabase.js'

const maxSupabaseFileSize = 8 * 1024 * 1024
const maxLocalFileSize = 3 * 1024 * 1024
const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const initialVisionDebug = {
  envKeyStatus: 'unknown',
  fallbackReason: '',
  model: import.meta.env.VITE_OPENAI_VISION_MODEL || 'Serverns standardmodell',
  openaiError: '',
  routeStatus: 'not_requested',
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Kunde inte läsa filen.'))
    reader.readAsDataURL(file)
  })
}

function formatFileSize(size) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function normalizeAnalysis(value) {
  return value && typeof value === 'object' && Array.isArray(value.steps)
    ? value
    : null
}

function AssignmentPreview({ assignment, previewUrl }) {
  if (!assignment || !previewUrl) {
    return (
      <div className="assignment-empty-preview">
        <strong>Ingen fil vald</strong>
        <p>Välj en bild eller PDF för att se förhandsvisningen här.</p>
      </div>
    )
  }

  if (assignment.fileType === 'application/pdf') {
    return (
      <iframe
        className="assignment-pdf-preview"
        src={previewUrl}
        title={`Förhandsvisning av ${assignment.fileName}`}
      />
    )
  }

  return (
    <img
      className="assignment-image-preview"
      src={previewUrl}
      alt={`Förhandsvisning av ${assignment.fileName}`}
    />
  )
}

function AssignmentUpload({
  humorMode = false,
  onAnalysisComplete = () => {},
  onAssignmentsChange,
  user,
}) {
  const [file, setFile] = useState(null)
  const [fileData, setFileData] = useState('')
  const [title, setTitle] = useState('')
  const [assignments, setAssignments] = useState([])
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [visibleSteps, setVisibleSteps] = useState(1)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [visionDebug, setVisionDebug] = useState(initialVisionDebug)

  useEffect(() => {
    let isMounted = true

    listAssignments(user.id)
      .then((items) => {
        if (isMounted) {
          setAssignments(items)
          onAssignmentsChange(items)
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError.message)
        }
      })

    return () => {
      isMounted = false
    }
  }, [onAssignmentsChange, user.id])

  async function selectAssignment(assignment) {
    setError('')
    setSelectedAssignment(assignment)
    setAnalysis(normalizeAnalysis(assignment.analysis))
    setVisibleSteps(1)

    try {
      setPreviewUrl(await getAssignmentPreviewUrl(assignment))
    } catch (previewError) {
      setError(previewError.message)
    }
  }

  async function handleFileChange(event) {
    const nextFile = event.target.files?.[0]
    setError('')
    setStatus('')

    if (!nextFile) {
      return
    }

    if (!acceptedTypes.includes(nextFile.type)) {
      setError('Välj en PDF-, JPG-, PNG- eller WEBP-fil.')
      return
    }

    const maxFileSize = isSupabaseConfigured
      ? maxSupabaseFileSize
      : maxLocalFileSize

    if (nextFile.size > maxFileSize) {
      setError(
        `Filen får vara högst ${isSupabaseConfigured ? '8 MB' : '3 MB i lokalt läge'}.`,
      )
      return
    }

    try {
      const nextFileData = await readFileAsDataUrl(nextFile)
      const draft = {
        fileName: nextFile.name,
        fileSize: nextFile.size,
        fileType: nextFile.type,
        title: nextFile.name,
      }

      setFile(nextFile)
      setFileData(nextFileData)
      setTitle(nextFile.name.replace(/\.[^.]+$/, ''))
      setSelectedAssignment(draft)
      setPreviewUrl(nextFileData)
      setAnalysis(null)
      setVisibleSteps(1)
    } catch (readError) {
      setError(readError.message)
    }
  }

  async function handleSave() {
    if (!file) {
      setError('Välj en fil först.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const savedAssignment = await saveAssignment({
        file,
        fileData,
        title: title.trim(),
        userId: user.id,
      })
      setAssignments((items) => {
        const nextItems = [savedAssignment, ...items]
        onAssignmentsChange(nextItems)
        return nextItems
      })
      setSelectedAssignment(savedAssignment)
      setStatus('Uppgiften har sparats.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAnalyze() {
    if (!selectedAssignment) {
      setError('Välj eller spara en uppgift först.')
      return
    }

    setIsAnalyzing(true)
    setError('')
    setStatus('AI Study Buddy analyserar uppgiften...')
    setVisionDebug((current) => ({
      ...current,
      fallbackReason: '',
      openaiError: '',
      routeStatus: 'requesting',
    }))

    try {
      const currentPreviewUrl =
        previewUrl || (await getAssignmentPreviewUrl(selectedAssignment))
      const inlineFileData =
        selectedAssignment.fileData ||
        fileData ||
        (currentPreviewUrl.startsWith('data:') ? currentPreviewUrl : '')
      const response = await fetch('/api/analyze-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: inlineFileData,
          fileName: selectedAssignment.fileName,
          fileType: selectedAssignment.fileType,
          fileUrl: inlineFileData ? '' : currentPreviewUrl,
          humorMode,
        }),
      })
      const data = await response.json().catch(() => ({}))

      setVisionDebug({
        envKeyStatus: data.debug?.envKeyStatus || 'unknown',
        fallbackReason: data.debug?.fallbackReason || '',
        model: data.debug?.model || 'Okänd',
        openaiError: data.debug?.openaiError || '',
        routeStatus:
          data.debug?.routeStatus || `unexpected_http_${response.status}`,
      })

      if (!response.ok) {
        throw new Error(
          data.error || `Analysen misslyckades med status ${response.status}.`,
        )
      }

      if (
        !data.analysis?.subject ||
        !data.analysis?.taskType ||
        !data.analysis?.visibleContent ||
        !Array.isArray(data.analysis.steps)
      ) {
        throw new Error('AI Study Buddy returnerade ingen användbar analys.')
      }

      if (data.source !== 'openai') {
        throw new Error(
          `API-rutten returnerade oväntad källa: ${data.source || 'saknas'}.`,
        )
      }

      setAnalysis(data.analysis)
      setVisibleSteps(1)
      setStatus('AI-analysen är klar med OpenAI Vision.')
      onAnalysisComplete()

      if (selectedAssignment.id) {
        await saveAssignmentAnalysis(selectedAssignment, data.analysis)
        setAssignments((items) => {
          const nextItems = items.map((assignment) =>
            assignment.id === selectedAssignment.id
              ? { ...assignment, analysis: data.analysis }
              : assignment,
          )
          onAssignmentsChange(nextItems)
          return nextItems
        })
      }
    } catch (analysisError) {
      setError(analysisError.message)
      setStatus('')
      setVisionDebug((current) => ({
        ...current,
        openaiError: current.openaiError || analysisError.message,
        routeStatus:
          current.routeStatus === 'requesting'
            ? 'route_unreachable'
            : current.routeStatus,
      }))
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <section className="assignment-layout" id="assignment-upload">
      <section className="panel assignment-upload-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Assignment Upload</p>
            <h2>Ladda upp skoluppgift</h2>
          </div>
        </div>

        <label className="assignment-dropzone">
          <input
            accept=".pdf,image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            type="file"
          />
          <strong>Välj bild eller PDF</strong>
          <span>
            PDF, JPG, PNG eller WEBP · max{' '}
            {isSupabaseConfigured ? '8 MB' : '3 MB lokalt'}
          </span>
        </label>

        <label className="assignment-title-field">
          <span>Uppgiftens namn</span>
          <input
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Till exempel Algebra läxa 4"
            value={title}
          />
        </label>

        {selectedAssignment && (
          <div className="assignment-file-meta">
            <strong>{selectedAssignment.fileName}</strong>
            <span>{formatFileSize(selectedAssignment.fileSize)}</span>
          </div>
        )}

        <div className="assignment-actions">
          <button onClick={handleSave} disabled={!file || isSaving} type="button">
            {isSaving ? 'Sparar...' : 'Spara uppgift'}
          </button>
          <button
            onClick={handleAnalyze}
            disabled={!selectedAssignment || isAnalyzing}
            type="button"
          >
            {isAnalyzing ? 'Analyserar...' : 'Analysera med AI'}
          </button>
        </div>

        {status && <p className="assignment-status">{status}</p>}
        {error && <p className="assignment-error">{error}</p>}

        <aside className="assignment-debug-panel">
          <strong>Vision debug</strong>
          <dl>
            <div>
              <dt>routeStatus</dt>
              <dd>{visionDebug.routeStatus}</dd>
            </div>
            <div>
              <dt>envKeyStatus</dt>
              <dd>{visionDebug.envKeyStatus}</dd>
            </div>
            <div>
              <dt>model</dt>
              <dd>{visionDebug.model}</dd>
            </div>
            <div>
              <dt>fallbackReason</dt>
              <dd>{visionDebug.fallbackReason || 'Ingen'}</dd>
            </div>
            <div>
              <dt>openaiError</dt>
              <dd>{visionDebug.openaiError || 'Inget'}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="panel assignment-preview-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Förhandsvisning</p>
            <h2>{selectedAssignment?.title || 'Din uppgift'}</h2>
          </div>
        </div>
        <AssignmentPreview
          assignment={selectedAssignment}
          previewUrl={previewUrl}
        />
      </section>

      <section className="panel assignment-hints-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">AI Study Buddy</p>
            <h2>Stegvisa ledtrådar</h2>
          </div>
          {humorMode && <span className="humor-mode-badge">Humorläge på</span>}
        </div>

        {analysis ? (
          <>
            <div className="assignment-analysis-meta">
              <span>{analysis.subject}</span>
              <strong>{analysis.taskType}</strong>
            </div>
            <div className="assignment-reading">
              <span>AI läser uppgiften som</span>
              <p>{analysis.visibleContent}</p>
            </div>
            <p className="assignment-summary">
              {analysis.problemExplanation}
            </p>
            {analysis.languageSupport && (
              <div className="assignment-language-support">
                <strong>Språkstöd</strong>
                <p>{analysis.languageSupport}</p>
              </div>
            )}
            {analysis.observations?.length > 0 && (
              <ul className="assignment-observations">
                {analysis.observations.map((observation) => (
                  <li key={observation}>{observation}</li>
                ))}
              </ul>
            )}
            <ol className="assignment-steps">
              {analysis.steps.slice(0, visibleSteps).map((step, index) => (
                <li key={`${index}-${step}`}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
            {visibleSteps < analysis.steps.length && (
              <button
                className="next-hint-button"
                onClick={() => setVisibleSteps((count) => count + 1)}
                type="button"
              >
                Visa nästa ledtråd
              </button>
            )}
          </>
        ) : (
          <p className="assignment-muted">
            Ladda upp en uppgift och starta analysen för att få hjälp ett steg i
            taget.
          </p>
        )}
      </section>

      <section className="panel assignment-history-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Mina uppgifter</p>
            <h2>Sparade filer</h2>
          </div>
        </div>

        <div className="assignment-list">
          {assignments.length === 0 ? (
            <p className="assignment-muted">Inga sparade uppgifter ännu.</p>
          ) : (
            assignments.map((assignment) => (
              <button
                className={
                  selectedAssignment?.id === assignment.id ? 'active' : ''
                }
                key={assignment.id}
                onClick={() => selectAssignment(assignment)}
                type="button"
              >
                <span>{assignment.fileType === 'application/pdf' ? 'PDF' : 'Bild'}</span>
                <strong>{assignment.title}</strong>
                <small>{formatFileSize(assignment.fileSize)}</small>
              </button>
            ))
          )}
        </div>
      </section>
    </section>
  )
}

export default AssignmentUpload
