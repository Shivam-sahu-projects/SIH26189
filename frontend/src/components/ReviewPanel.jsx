import { useEffect, useState } from "react"
import axios from "axios"

const API_URL = "http://127.0.0.1:8000"

function ReviewPanel({ caseId }) {
  const [reviewData, setReviewData] = useState(null)
  const [loading, setLoading] = useState(true)
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

      const response = await axios.get(
        `${API_URL}/cases/${caseId}/review`
      )

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
      await axios.patch(
        `${API_URL}/cases/${caseId}/persons/${personId}/review`,
        null,
        {
          params: {
            status,
          },
        }
      )

      fetchReviewItems()
    } catch (err) {
      console.error(err)
      setError("Unable to update person review")
    }
  }

  async function reviewRelationship(
    relationshipId,
    status
  ) {
    try {
      await axios.patch(
        `${API_URL}/cases/${caseId}/relationships/${relationshipId}/review`,
        null,
        {
          params: {
            status,
          },
        }
      )

      fetchReviewItems()
    } catch (err) {
      console.error(err)
      setError("Unable to update relationship review")
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

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <h2 className="text-xl font-semibold text-white">
              AI Extraction Review
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Review AI-extracted entities and relationships
              before using them as verified investigative data.
            </p>
          </div>

          <div className="rounded-lg bg-yellow-500/10 px-4 py-2 text-sm text-yellow-400">
            Pending: {reviewData?.total_pending || 0}
          </div>

        </div>

      </div>


      {/* Persons */}

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">

        <h3 className="mb-4 text-lg font-semibold text-white">
          Persons
        </h3>

        {persons.length === 0 ? (

          <p className="text-sm text-slate-400">
            No pending persons.
          </p>

        ) : (

          <div className="space-y-3">

            {persons.map((person) => (

              <div
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4"
              >

                <div>

                  <div className="font-medium text-white">
                    {person.name}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">

  <span className="rounded-md bg-yellow-500/10 px-2 py-1 text-xs text-yellow-400">
    AI Extracted
  </span>

  <span className="rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-400">
    Pending Review
  </span>

  <span className="text-xs text-slate-400">
    Confidence:{" "}
    <span className="font-medium text-white">
      {person.confidence !== null
        ? `${Math.round(person.confidence * 100)}%`
        : "Not available"}
    </span>
  </span>

</div>

<div className="mt-2 text-xs text-slate-500">
  Reason: Name extracted from the Persons of Interest section
</div>

                </div>

                <div className="flex gap-2">

                  <button
                    onClick={() =>
                      reviewPerson(
                        person.id,
                        "approved"
                      )
                    }
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() =>
                      reviewPerson(
                        person.id,
                        "rejected"
                      )
                    }
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
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

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">

        <h3 className="mb-4 text-lg font-semibold text-white">
          Relationships
        </h3>

        {relationships.length === 0 ? (

          <p className="text-sm text-slate-400">
            No pending relationships.
          </p>

        ) : (

          <div className="space-y-3">

            {relationships.map((relationship) => (

              <div
                key={relationship.id}
                className="rounded-lg border border-slate-700 bg-slate-800/60 p-4"
              >

                <div className="flex flex-wrap items-center justify-between gap-4">

                  <div>

                    <div className="text-sm font-medium text-white">

                      {relationship.source}

                      <span className="mx-2 text-cyan-400">
                        →
                      </span>

                      {relationship.target}

                    </div>
<div className="mt-1 text-xs text-slate-400">

  Relationship:{" "}

  <span className="text-slate-300">
    {relationship.relationship_type}
  </span>

</div>

<div className="mt-2 flex flex-wrap items-center gap-2">

  <span className="rounded-md bg-yellow-500/10 px-2 py-1 text-xs text-yellow-400">
    AI Extracted
  </span>

  <span className="text-xs text-slate-400">
    Confidence:{" "}

    <span className="font-medium text-white">

      {relationship.confidence !== null
        ? `${Math.round(
            relationship.confidence * 100
          )}%`
        : "Not available"}

    </span>

  </span>

</div>

<div className="mt-2 text-xs text-slate-500">
  Reason: Relationship extracted from the
  structured relationship section
</div>

                  </div>

                  <div className="flex gap-2">

                    <button
                      onClick={() =>
                        reviewRelationship(
                          relationship.id,
                          "approved"
                        )
                      }
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() =>
                        reviewRelationship(
                          relationship.id,
                          "rejected"
                        )
                      }
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                    >
                      Reject
                    </button>

                  </div>

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