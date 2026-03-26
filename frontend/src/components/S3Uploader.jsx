import { useState, useRef } from 'react'
import { uploadToS3 } from '../api/notesApi'

/**
 * S3Uploader – sits in the header bar.
 * Lets users upload any file to S3 and get back a permanent URL.
 */
export default function S3Uploader() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)   // { url, filename, size }
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setError(null)
    setResult(null)
    setUploading(true)
    setProgress(0)

    try {
      const res = await uploadToS3(file, setProgress)
      setResult(res.data)
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed. Check your AWS credentials.'
      setError(msg)
    } finally {
      setUploading(false)
      setProgress(0)
      // Reset input so same file can be re-uploaded
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const copyUrl = () => {
    if (result?.url) {
      navigator.clipboard.writeText(result.url)
    }
  }

  return (
    <div className="s3-uploader">
      <label className="s3-upload-btn" title="Upload a file to S3">
        {uploading ? (
          <span className="s3-uploading">
            <span className="s3-spinner" />
            {progress > 0 ? `${progress}%` : 'Uploading…'}
          </span>
        ) : (
          <>☁️ Upload to S3</>
        )}
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>

      {error && (
        <div className="s3-error" title={error}>
          ⚠️ {error.length > 50 ? error.slice(0, 50) + '…' : error}
        </div>
      )}

      {result && (
        <div className="s3-result">
          <span className="s3-filename" title={result.filename}>
            ✅ {result.filename}
          </span>
          <button className="s3-copy-btn" onClick={copyUrl} title="Copy S3 URL">
            📋 Copy URL
          </button>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="s3-view-link"
          >
            View ↗
          </a>
        </div>
      )}
    </div>
  )
}
