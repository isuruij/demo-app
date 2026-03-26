import NoteCard from './NoteCard'

/**
 * NoteList – renders the grid of NoteCards or an empty state.
 */
export default function NoteList({ notes, onEdit, onDelete, deletingId }) {
  if (notes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📝</div>
        <h3>No notes yet</h3>
        <p>Click <strong>+ New Note</strong> to create your first note.</p>
      </div>
    )
  }

  return (
    <div className="notes-grid">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onEdit={onEdit}
          onDelete={onDelete}
          isDeleting={deletingId === note.id}
        />
      ))}
    </div>
  )
}
