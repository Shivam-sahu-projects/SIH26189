import { useState } from "react"
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  FileCheck,
  Brain,
} from "lucide-react"
import { investigationApi } from "../api"
import { SAMPLE_FIR_TEXT } from "../utils/sampleCaseData"

export default function DocumentUpload({ caseId, onUploadSuccess, onUploadComplete, onOpenNetwork }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [stage, setStage] = useState(0) // 0: Idle, 1: Reading, 2: NLP, 3: Neural Link, 4: Saved
  const [message, setMessage] = useState("")
  const [resultData, setResultData] = useState(null)
  const [error, setError] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const STAGES = [
    "Reading Document & Binary Parser",
    "NLP Named Entity Recognition (Suspects, Phones, Accounts)",
    "Criminal Neural Network & Multi-Hop Syndicate Linking",
    "Ingestion Complete & Suspect Risk Scoring Finalized",
  ]

  async function handleUpload() {
    if (!file) {
      setError("Please select a PDF document to upload.")
      return
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only official PDF reports (.pdf) are supported.")
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    if (caseId) {
      formData.append("case_id", caseId)
    }

    setUploading(true)
    setStage(1)
    setMessage("")
    setResultData(null)
    setError("")

    // Stage progression animation
    const stageTimer1 = setTimeout(() => setStage(2), 700)
    const stageTimer2 = setTimeout(() => setStage(3), 1500)

    try {
      const response = await investigationApi.uploadDocument(formData)
      const data = response.data

      clearTimeout(stageTimer1)
      clearTimeout(stageTimer2)
      setStage(4)

      setMessage(
        caseId
          ? `Document successfully ingested into Case #${caseId}.`
          : `New investigation case imported: ${data.case_number || "Active Case"}`
      )
      setResultData(data)
      setFile(null)

      if (onUploadSuccess) onUploadSuccess(data)
      if (onUploadComplete) onUploadComplete(data)
    } catch (err) {
      clearTimeout(stageTimer1)
      clearTimeout(stageTimer2)
      console.error(err)
      setError(
        err.response?.data?.detail ||
          "Failed to process document with remote server. (Ensure backend or network is active)"
      )
      setStage(0)
    } finally {
      setUploading(false)
    }
  }

  // Instant demo helper: simulates a sample PDF FIR
  const handleLoadSampleFIR = async () => {
    // Generate sample PDF file in memory
    const blob = new Blob([SAMPLE_FIR_TEXT], { type: "application/pdf" })
    const sampleFile = new File([blob], "FIR_Cyber_Fraud_Indore_0048.pdf", { type: "application/pdf" })
    setFile(sampleFile)
    setError("")
    setMessage("Sample Police FIR loaded! Click 'Upload & Run Neural Extraction' to process.")
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
      const dropped = e.dataTransfer.files[0]
      if (dropped.name.toLowerCase().endsWith(".pdf")) {
        setFile(dropped)
        setError("")
        setMessage("")
      } else {
        setError("Only PDF files are supported.")
      }
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              {caseId ? "Ingest Investigation Document to Case" : "Import & Analyze Investigation Document"}
            </h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
              AI NLP Pipeline
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Automated extraction of suspects, communication endpoints, mule accounts & financial transactions.
          </p>
        </div>

        {/* Sample FIR Quick Test Button */}
        <button
          type="button"
          onClick={handleLoadSampleFIR}
          className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 hover:text-blue-800"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          <span>Load Sample FIR / Police Report</span>
        </button>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-50/50"
            : file
            ? "border-blue-300 bg-blue-50/20"
            : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm text-blue-600">
          <Upload className="h-6 w-6" />
        </div>

        {file ? (
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-bold text-slate-900">{file.name}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {(file.size / 1024).toFixed(1)} KB • Ready for Automated AI Extraction
            </p>
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setMessage("")
                setStage(0)
              }}
              className="mt-2.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
            >
              Remove selected file
            </button>
          </div>
        ) : (
          <div className="mt-4 text-center">
            <p className="text-sm font-semibold text-slate-800">
              Drag and drop case PDF report here, or{" "}
              <label className="cursor-pointer text-blue-600 underline hover:text-blue-700">
                browse workstation
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
            <p className="mt-1.5 text-xs text-slate-400">
              Compatible with Police FIRs, charge-sheets, bank audit statements, and CDR records.
            </p>
          </div>
        )}
      </div>

      {/* Live 4-Stage Pipeline Progress Tracker */}
      {uploading && (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span>Neural Pipeline In Progress:</span>
            </div>
            <span>Stage {stage} of 4</span>
          </div>

          <div className="mt-2 text-xs font-semibold text-blue-700">
            {STAGES[stage - 1] || "Initializing AI pipeline..."}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  stage >= s ? "bg-blue-600" : "bg-blue-200"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions & Execution Bar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          Target: {caseId ? `Active Case #${caseId}` : "Auto-creates new case or attaches to matching FIR"}
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Extracting & Synthesizing...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              <span>Upload & Run Neural Extraction</span>
            </>
          )}
        </button>
      </div>

      {/* Extracted Entity Summary Card */}
      {resultData && (
        <div className="mt-5 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="font-bold text-sm">{message}</div>
            </div>

            {onOpenNetwork && (
              <button
                onClick={onOpenNetwork}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <Brain className="h-3.5 w-3.5" />
                <span>View In Neural Network</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {resultData.entities_saved && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="rounded-lg bg-white border border-emerald-100 p-2.5 shadow-2xs">
                <div className="text-lg font-black text-slate-900">{resultData.entities_saved.persons}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Suspects</div>
              </div>
              <div className="rounded-lg bg-white border border-emerald-100 p-2.5 shadow-2xs">
                <div className="text-lg font-black text-slate-900">{resultData.entities_saved.phones}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Phone Numbers</div>
              </div>
              <div className="rounded-lg bg-white border border-emerald-100 p-2.5 shadow-2xs">
                <div className="text-lg font-black text-slate-900">{resultData.entities_saved.bank_accounts}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Mule Accounts</div>
              </div>
              <div className="rounded-lg bg-white border border-emerald-100 p-2.5 shadow-2xs">
                <div className="text-lg font-black text-slate-900">{resultData.relationships_saved}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Neural Links</div>
              </div>
              <div className="rounded-lg bg-white border border-emerald-100 p-2.5 shadow-2xs">
                <div className="text-lg font-black text-slate-900">{resultData.transactions_saved}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Transactions</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Card */}
      {error && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}