import { useState, useEffect, useCallback } from 'react'
import NoteList from './components/NoteList'
import NoteForm from './components/NoteForm'
import S3Uploader from './components/S3Uploader'
import { fetchNotes, createNote, updateNote, deleteNote } from './api/notesApi'

export default function App() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [notification, setNotification] = useState(null)

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3500)
  }

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchNotes()
      const data = res.data.results ?? res.data
      setNotes(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError('Failed to load notes. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadNotes() }, [loadNotes])

  const handleCreate = async (data) => {
    try {
      setFormLoading(true)
      const res = await createNote(data)
      setNotes((prev) => [res.data, ...prev])
      setShowForm(false)
      showNotification('Note created!')
    } catch (err) {
      console.error(err)
      showNotification('Failed to create note.', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async (data) => {
    try {
      setFormLoading(true)
      const res = await updateNote(editingNote.id, data)
      setNotes((prev) => prev.map((n) => (n.id === editingNote.id ? res.data : n)))
      setEditingNote(null)
      showNotification('Note updated!')
    } catch (err) {
      console.error(err)
      showNotification('Failed to update note.', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      setDeletingId(id)
      await deleteNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
      showNotification('Note deleted.')
    } catch (err) {
      console.error(err)
      showNotification('Failed to delete note.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const openEdit = (note) => { setEditingNote(note); setShowForm(false) }
  const closeForm = () => { setShowForm(false); setEditingNote(null) }

  return (
    <div className="app">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-icon">📝</span>
            <h1>Notes App</h1>
          </div>

          {/* Global S3 uploader — lives in the header */}
          <S3Uploader />

          <button
            className="btn btn-primary"
            onClick={() => { setShowForm(true); setEditingNote(null) }}
          >
            + New Note
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="main-content">
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading notes…</p>
          </div>
        )}
        {!loading && error && (
          <div className="error-banner">
            <strong>⚠️ {error}</strong>
            <button className="btn btn-secondary" onClick={loadNotes}>Retry</button>
          </div>
        )}
        {!loading && !error && (
          <NoteList
            notes={notes}
            onEdit={openEdit}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        )}
      </main>

      {showForm && (
        <NoteForm onSubmit={handleCreate} onCancel={closeForm} isLoading={formLoading} />
      )}
      {editingNote && (
        <NoteForm
          onSubmit={handleUpdate}
          onCancel={closeForm}
          initialData={editingNote}
          isLoading={formLoading}
        />
      )}
    </div>
  )
}
