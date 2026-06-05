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

function AssignmentUpload({ user }) {
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

  useEffect(() => {
    let isMounted = true

    listAssignments(user.id)
      .then((items) => {
        if (isMounted) {
          setAssignments(items)
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
  }, [user.id])

  async function selectAssignment(assignment) {
    setError('')
    setSelectedAssignment(assignment)
    setAnalysis(assignment.analysis || null)
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
      setAssignments((items) => [savedAssignment, ...items])
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

    try {
      const currentPreviewUrl =
        previewUrl || (await getAssignmentPreviewUrl(selectedAssignment))
      const response = await fetch('/api/analyze-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: selectedAssignment.fileData || fileData,
          fileName: selectedAssignment.fileName,
          fileType: selectedAssignment.fileType,
          fileUrl: selectedAssignment.fileData ? '' : currentPreviewUrl,
        }),
      })

      if (!response.ok) {
        throw new Error(`Analysen misslyckades med status ${response.status}.`)
      }

      const data = await response.json()

      if (!data.analysis?.summary || !Array.isArray(data.analysis.steps)) {
        throw new Error('AI Study Buddy returnerade ingen användbar analys.')
      }

      setAnalysis(data.analysis)
      setVisibleSteps(1)
      setStatus(
        data.source === 'openai'
          ? 'AI-analysen är klar.'
          : 'Fallback-ledtrådar visas.',
      )

      if (selectedAssignment.id) {
        await saveAssignmentAnalysis(selectedAssignment, data.analysis)
        setAssignments((items) =>
          items.map((assignment) =>
            assignment.id === selectedAssignment.id
              ? { ...assignment, analysis: data.analysis }
              : assignment,
          ),
        )
      }
    } catch (analysisError) {
      setError(analysisError.message)
      setStatus('')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <section className="assignment-layout">
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
        </div>

        {analysis ? (
          <>
            <p className="assignment-summary">{analysis.summary}</p>
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
