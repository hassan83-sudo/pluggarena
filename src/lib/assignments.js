import { isSupabaseConfigured, supabase } from './supabase.js'

const localAssignmentsKey = 'pluggarena.assignments'
const assignmentBucket = 'assignments'

function readLocalAssignments() {
  try {
    const value = JSON.parse(
      window.localStorage.getItem(localAssignmentsKey) || '[]',
    )
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeLocalAssignments(assignments) {
  try {
    window.localStorage.setItem(
      localAssignmentsKey,
      JSON.stringify(assignments),
    )
  } catch {
    // Local assignment state remains usable if storage is unavailable.
  }
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-')
}

function mapAssignment(row) {
  return {
    analysis: row.analysis || '',
    createdAt: row.created_at,
    fileData: row.file_data || '',
    fileName: row.file_name,
    filePath: row.file_path || '',
    fileSize: row.file_size,
    fileType: row.file_type,
    id: row.id,
    title: row.title,
    userId: row.user_id,
  }
}

export async function listAssignments(userId) {
  if (!isSupabaseConfigured) {
    return readLocalAssignments()
      .filter((assignment) => assignment.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data.map(mapAssignment)
}

export async function saveAssignment({ file, fileData, title, userId }) {
  const assignment = {
    analysis: '',
    createdAt: new Date().toISOString(),
    fileData,
    fileName: file.name,
    filePath: '',
    fileSize: file.size,
    fileType: file.type,
    id: createId(),
    title: title || file.name,
    userId,
  }

  if (!isSupabaseConfigured) {
    writeLocalAssignments([assignment, ...readLocalAssignments()])
    return assignment
  }

  const filePath = `${userId}/${assignment.id}-${sanitizeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage
    .from(assignmentBucket)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data, error } = await supabase
    .from('assignments')
    .insert({
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      title: assignment.title,
      user_id: userId,
    })
    .select()
    .single()

  if (error) {
    await supabase.storage.from(assignmentBucket).remove([filePath])
    throw error
  }

  return mapAssignment(data)
}

export async function getAssignmentPreviewUrl(assignment) {
  if (assignment.fileData) {
    return assignment.fileData
  }

  if (!isSupabaseConfigured || !assignment.filePath) {
    return ''
  }

  const { data, error } = await supabase.storage
    .from(assignmentBucket)
    .createSignedUrl(assignment.filePath, 3600)

  if (error) {
    throw error
  }

  return data.signedUrl
}

export async function saveAssignmentAnalysis(assignment, analysis) {
  if (!isSupabaseConfigured) {
    const assignments = readLocalAssignments().map((entry) =>
      entry.id === assignment.id ? { ...entry, analysis } : entry,
    )
    writeLocalAssignments(assignments)
    return
  }

  const { error } = await supabase
    .from('assignments')
    .update({ analysis, updated_at: new Date().toISOString() })
    .eq('id', assignment.id)
    .eq('user_id', assignment.userId)

  if (error) {
    throw error
  }
}

export { assignmentBucket }
