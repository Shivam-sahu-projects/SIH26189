import { useState } from "react"
import axios from "axios"

function DocumentUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleUpload() {
    if (!file) {
      setError("Please select a PDF file.")
      return
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.")
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    setUploading(true)
    setMessage("")
    setError("")

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/extraction/pdf/save",
        formData
      )

      setMessage(
        `Case imported successfully. Case ID: ${response.data.case_id}`
      )

      setFile(null)

      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (err) {
      console.error(err)

      setError(
        err.response?.data?.detail ||
        "Failed to upload and process PDF."
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="text-xl font-semibold">
        Import Investigation Document
      </h3>

      <p className="mt-1 text-sm text-slate-400">
        Upload a PDF case report for automated extraction.
      </p>

      <div className="mt-5">
        <input
          type="file"
          accept=".pdf"
          onChange={(event) => {
            setFile(event.target.files[0] || null)
            setMessage("")
            setError("")
          }}
          className="block w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-sm file:text-white"
        />
      </div>

      {file && (
        <p className="mt-3 text-sm text-slate-400">
          Selected: {file.name}
        </p>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? "Processing..." : "Upload & Analyze"}
      </button>

      {message && (
        <div className="mt-4 rounded-lg border border-green-900 bg-green-950/40 p-3 text-sm text-green-300">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}

export default DocumentUpload