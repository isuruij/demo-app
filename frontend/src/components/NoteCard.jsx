import { useState } from 'react'

/**
 * NoteCard – displays a single note with inline delete confirmation.
 */
export default function NoteCard({ note, onEdit, onDelete, isDeleting }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const formattedDate = new Date(note.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const handleDeleteClick = () => setConfirmDelete(true)
  const handleConfirm = () => { setConfirmDelete(false); onDelete(note.id) }
  const handleCancel = () => setConfirmDelete(false)

  return (
    <article className="note-card">
      <div className="note-card-header">
        <h3 className="note-title">{note.title}</h3>
        <span className="note-date">{formattedDate}</span>
      </div>

      {note.description && (
        <p className="note-description">{note.description}</p>
      )}

      {confirmDelete ? (
        <div className="confirm-delete">
          <span>Delete this note?</span>
          <div className="confirm-actions">
            <button className="btn btn-sm btn-danger" onClick={handleConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button className="btn btn-sm btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="note-card-actions">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onEdit(note)}
            aria-label={`Edit note: ${note.title}`}
          >
            ✏️ Edit
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            aria-label={`Delete note: ${note.title}`}
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </article>
  )
}
