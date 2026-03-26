import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const fetchNotes = () => api.get('/notes/')
export const createNote = (data) => api.post('/notes/', data)
export const updateNote = (id, data) => api.patch(`/notes/${id}/`, data)
export const deleteNote = (id) => api.delete(`/notes/${id}/`)

/**
 * Upload a file to S3 via the backend.
 * Returns { url, key, filename, size }
 */
export const uploadToS3 = (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
      : undefined,
  })
}
