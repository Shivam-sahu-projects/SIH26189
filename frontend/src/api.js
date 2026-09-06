import axios from "axios"

// Determine base API URL dynamically
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:8000"
    }
  }
  return "https://sih26189.onrender.com"
}

export const API_URL = getBaseUrl()

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Investigation API Services
export const investigationApi = {
  // Cases
  getCases: () => api.get("/cases/"),
  getCase: (caseId) => api.get(`/cases/${caseId}`),
  createCase: (data) => api.post("/cases/", data),
  searchCases: (query) => api.get(`/cases/search?query=${encodeURIComponent(query)}`),

  // Network & Intelligence
  getCaseGraph: async (caseId) => {
    try {
      await api.post(`/cases/${caseId}/sync-neo4j`)
    } catch (e) {
      console.warn("Neo4j sync bypassed, loading graph from Supabase:", e)
    }
    return api.get(`/cases/${caseId}/neo4j-graph`)
  },
  getNetworkAnalysis: (caseId) => api.get(`/cases/${caseId}/network-analysis`),
  getCrossCaseSyndicates: () => api.get("/cases/intelligence/cross-case-syndicates"),
  getCaseCrossCaseLinks: (caseId) => api.get(`/cases/${caseId}/cross-case-links`),
  getCaseDossier: (caseId) => api.get(`/cases/${caseId}/dossier`),

  // Documents & Extraction
  uploadDocument: (formData) =>
    api.post("/extraction/pdf/save", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  // AI Review
  getReviewItems: (caseId) => api.get(`/cases/${caseId}/review`),
  reviewPerson: (caseId, personId, status) =>
    api.patch(`/cases/${caseId}/persons/${personId}/review?status=${status}`),
  reviewRelationship: (caseId, relationshipId, status) =>
    api.patch(`/cases/${caseId}/relationships/${relationshipId}/review?status=${status}`),
}

export default api