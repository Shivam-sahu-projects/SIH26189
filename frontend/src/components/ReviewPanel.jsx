import { useEffect, useState } from "react"
import { investigationApi } from "../api"

function ReviewPanel({ caseId }) {
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
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-400">
        Select a case to review extracted information.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-400">
        Loading review items...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-950/40 p-6 text-red-400">
        {error}
      </div>
    )
  }

  const persons = reviewData?.pending_persons || []
  const relationships =
    reviewData?.pending_relationships || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-[#101413] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              AI Extraction Review
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Review and verify AI-extracted suspects and relationships before
              promoting them into the certified crime network.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-2 text-sm text-amber-400">
              Pending: {reviewData?.total_pending || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Persons */}
      <div className="rounded-xl border border-slate-800 bg-[#101413] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Persons of Interest ({persons.length})
          </h3>
          {persons.length > 0 && (
            <button
              onClick={approveAllPersons}
              disabled={actionInProgress}
              className="rounded-lg bg-green-700/80 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
            >
              Approve All Persons
            </button>
          )}
        </div>

        {persons.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            ✓ All extracted persons have been reviewed.
          </p>
        ) : (
          <div className="space-y-3">
            {persons.map((person) => (
              <div
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#0c100f] p-4"
              >
                <div>
                  <div className="font-medium text-white">{person.name}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                      AI Extracted
                    </span>
                    <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                      Pending Review
                    </span>
                    <span className="text-xs text-slate-400">
                      Confidence:{" "}
                      <span className="font-medium text-white">
                        {person.confidence !== null
                          ? `${Math.round(person.confidence * 100)}%`
                          : "85%"}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Extracted from investigation document narrative
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => reviewPerson(person.id, "approved")}
                    disabled={actionInProgress}
                    className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reviewPerson(person.id, "rejected")}
                    disabled={actionInProgress}
                    className="rounded-lg bg-red-600/80 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Relationships */}
      <div className="rounded-xl border border-slate-800 bg-[#101413] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Relationships ({relationships.length})
          </h3>
          {relationships.length > 0 && (
            <button
              onClick={approveAllRelationships}
              disabled={actionInProgress}
              className="rounded-lg bg-green-700/80 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
            >
              Approve All Relationships
            </button>
          )}
        </div>

        {relationships.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            ✓ All extracted relationships have been reviewed.
          </p>
        ) : (
          <div className="space-y-3">
            {relationships.map((relationship) => (
              <div
                key={relationship.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#0c100f] p-4"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    {relationship.source}
                    <span className="mx-2 text-emerald-400 font-bold">
                      →
                    </span>
                    {relationship.target}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Type:{" "}
                    <span className="font-mono text-emerald-400">
                      {relationship.relationship_type}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                      AI Inferred
                    </span>
                    <span className="text-xs text-slate-400">
                      Confidence:{" "}
                      <span className="font-medium text-white">
                        {relationship.confidence !== null
                          ? `${Math.round(relationship.confidence * 100)}%`
                          : "80%"}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => reviewRelationship(relationship.id, "approved")}
                    disabled={actionInProgress}
                    className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reviewRelationship(relationship.id, "rejected")}
                    disabled={actionInProgress}
                    className="rounded-lg bg-red-600/80 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Reject
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

export default ReviewPanel