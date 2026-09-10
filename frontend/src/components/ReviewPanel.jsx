import { useEffect, useState } from "react"
import { Check, X, ShieldAlert, CheckCheck, UserCheck, Network, AlertCircle } from "lucide-react"
import { investigationApi } from "../api"

export default function ReviewPanel({ caseId }) {
  const [reviewData, setReviewData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (caseId) {
      fetchReviewItems()
    }
  }, [caseId])

  async function fetchReviewItems() {
    try {
      setLoading(true)
      setError("")

      const response = await investigationApi.getReviewItems(caseId)
      setReviewData(response.data)
    } catch (err) {
      console.error(err)
      setError("Unable to load review items")
    } finally {
      setLoading(false)
    }
  }

  async function reviewPerson(personId, status) {
    try {
      await investigationApi.reviewPerson(caseId, personId, status)
      fetchReviewItems()
    } catch (err) {
      console.error(err)
      setError("Unable to update person review")
    }
  }

  async function reviewRelationship(relationshipId, status) {
    try {
      await investigationApi.reviewRelationship(caseId, relationshipId, status)
      fetchReviewItems()
    } catch (err) {
      console.error(err)
      setError("Unable to update relationship review")
    }
  }

  async function approveAllPersons() {
    if (!reviewData?.pending_persons?.length) return
    setActionInProgress(true)
    try {
      for (const p of reviewData.pending_persons) {
        await investigationApi.reviewPerson(caseId, p.id, "approved")
      }
      await fetchReviewItems()
    } catch (e) {
      console.error(e)
    } finally {
      setActionInProgress(false)
    }
  }

  async function approveAllRelationships() {
    if (!reviewData?.pending_relationships?.length) return
    setActionInProgress(true)
    try {
      for (const r of reviewData.pending_relationships) {
        await investigationApi.reviewRelationship(caseId, r.id, "approved")
      }
      await fetchReviewItems()
    } catch (e) {
      console.error(e)
    } finally {
      setActionInProgress(false)
    }
  }

  if (!caseId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Select an active case to inspect and verify AI-extracted entities.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Loading verification queue...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
        <span>{error}</span>
      </div>
    )
  }

  const persons = reviewData?.pending_persons || []
  const relationships = reviewData?.pending_relationships || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                AI Extraction Verification Queue
              </h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                Requires Investigator Certification
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Certify or reject AI-inferred suspects and criminal links before promoting them to the court-ready evidence ledger.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
              Pending Verification: {reviewData?.total_pending || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Persons of Interest */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Suspects & Persons of Interest ({persons.length})
            </h3>
          </div>
          {persons.length > 0 && (
            <button
              onClick={approveAllPersons}
              disabled={actionInProgress}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Certify All Suspects</span>
            </button>
          )}
        </div>

        {persons.length === 0 ? (
          <p className="py-8 text-center text-xs font-medium text-slate-500">
            ✓ All extracted persons for this case have been verified by investigator.
          </p>
        ) : (
          <div className="space-y-3">
            {persons.map((person) => (
              <div
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900">{person.name}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      NLP Identified
                    </span>
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                      Pending
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      AI Confidence:{" "}
                      <span className="font-bold text-slate-800">
                        {person.confidence !== null ? `${Math.round(person.confidence * 100)}%` : "85%"}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => reviewPerson(person.id, "approved")}
                    disabled={actionInProgress}
                    className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Certify</span>
                  </button>
                  <button
                    onClick={() => reviewPerson(person.id, "rejected")}
                    disabled={actionInProgress}
                    className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Relationships */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Synaptic & Conduit Relationships ({relationships.length})
            </h3>
          </div>
          {relationships.length > 0 && (
            <button
              onClick={approveAllRelationships}
              disabled={actionInProgress}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Certify All Links</span>
            </button>
          )}
        </div>

        {relationships.length === 0 ? (
          <p className="py-8 text-center text-xs font-medium text-slate-500">
            ✓ All extracted relationships for this case have been verified.
          </p>
        ) : (
          <div className="space-y-3">
            {relationships.map((rel) => (
              <div
                key={rel.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{rel.source}</span>
                    <span className="text-blue-600 font-black">→</span>
                    <span>{rel.target}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>Relationship Type:</span>
                    <span className="font-bold text-blue-700 font-mono">{rel.relationship_type}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => reviewRelationship(rel.id, "approved")}
                    disabled={actionInProgress}
                    className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Certify</span>
                  </button>
                  <button
                    onClick={() => reviewRelationship(rel.id, "rejected")}
                    disabled={actionInProgress}
                    className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}