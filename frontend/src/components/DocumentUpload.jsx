import { useState } from "react"
import { investigationApi } from "../api"

function DocumentUpload({ caseId, onUploadSuccess, onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [resultData, setResultData] = useState(null)
  const [error, setError] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  async function handleUpload() {
    if (!file) {
      setError("Please select a PDF file.")
      return
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF documents (.pdf) are supported.")
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    if (caseId) {
      formData.append("case_id", caseId)
    }

    setUploading(true)
    setMessage("")
    setResultData(null)
    setError("")

    try {
      const response = await investigationApi.uploadDocument(formData)
      const data = response.data

      setMessage(
        caseId
          ? `Document successfully attached and parsed for Case ID #${caseId}.`
          : `Case imported successfully. Case ID: ${data.case_id} (${data.case_number || "Active"})`
      )
      setResultData(data)
      setFile(null)

      if (onUploadSuccess) {
        onUploadSuccess(data)
      }
      if (onUploadComplete) {
        onUploadComplete(data)
      }
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          "Failed to upload and process PDF investigation report."
      )
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.toLowerCase().endsWith(".pdf")) {
        setFile(droppedFile)
        setError("")
        setMessage("")
      } else {
        setError("Only PDF files are supported.")
      }
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-[#101413] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {caseId ? "Ingest Document to This Case" : "Import Investigation Document"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Automated NLP entity recognition & financial transaction extraction.
          </p>
        </div>
        <span className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-mono text-slate-400">
          PDF AI Pipeline
        </span>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragging
            ? "border-green-500 bg-green-950/20"
            : file
            ? "border-slate-700 bg-slate-900/40"
            : "border-slate-800 bg-[#0c100f] hover:border-slate-700"
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 bg-[#141a18] text-2xl text-slate-400">
          📄
        </div>

        {file ? (
          <div className="mt-3 text-center">
            <p className="text-sm font-medium text-white">{file.name}</p>
            <p className="text-xs text-slate-500">
              {(file.size / 1024).toFixed(1)} KB • Ready for extraction
            </p>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="mt-2 text-xs text-red-400 hover:text-red-300"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="mt-3 text-center">
            <p className="text-sm text-slate-300">
              Drag and drop case PDF report here, or{" "}
              <label className="cursor-pointer text-green-400 underline hover:text-green-300">
                browse
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    setFile(e.target.files[0] || null)
                    setMessage("")
                    setError("")
                  }}
                  className="hidden"
                />
              </label>
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Supports FIRs, charge-sheets, bank audit statements, CDR summaries
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          {caseId ? `Target: Case #${caseId}` : "Auto-creates or attaches case"}
        </div>
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Extracting Entities...
            </span>
          ) : (
            "Upload & Extract"
          )}
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-green-900/60 bg-green-950/30 p-3 text-xs text-green-300">
          <div className="font-semibold">{message}</div>
          {resultData?.entities_saved && (
            <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-green-400/80">
              <span>Persons: {resultData.entities_saved.persons}</span>
              <span>Phones: {resultData.entities_saved.phones}</span>
              <span>Accounts: {resultData.entities_saved.bank_accounts}</span>
              <span>Transactions: {resultData.transactions_saved}</span>
              <span>Relationships: {resultData.relationships_saved}</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}

export default DocumentUpload