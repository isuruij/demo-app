import { useState, useEffect } from 'react'

/**
 * NoteForm – create or edit a note (title + description only).
 */
export default function NoteForm({ onSubmit, onCancel, initialData, isLoading }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '')
      setDescription(initialData.description || '')
    }
  }, [initialData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setError('')
    await onSubmit({ title: title.trim(), description: description.trim() })
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Note' : 'New Note'}</h2>
          <button className="btn-close" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="note-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="title">Title <span className="required">*</span></label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title…"
              maxLength={255}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)…"
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving…' : initialData ? 'Update Note' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
