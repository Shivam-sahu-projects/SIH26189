import axios from "axios"

// Storage keys
const API_URL_KEY = "investiq_api_url"
const CACHE_PREFIX = "investiq_cache_"

// In-memory cache for ultra-fast instant rendering
const memoryCache = new Map()

export const getStoredApiUrl = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(API_URL_KEY)
    const hostname = window.location.hostname
    // If running locally, ALWAYS default to local backend for ultra-low latency & reliability
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      if (saved && !saved.includes("onrender.com")) {
        return saved
      }
      // Overwrite any stale onrender url in localStorage with local backend
      localStorage.setItem(API_URL_KEY, "http://127.0.0.1:8000")
      return "http://127.0.0.1:8000"
    }
    if (saved) return saved
  }
  return "http://127.0.0.1:8000"
}

export const setStoredApiUrl = (url) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(API_URL_KEY, url)
    api.defaults.baseURL = url
    clearApiCache()
  }
}

export const API_URL = getStoredApiUrl()

const api = axios.create({
  baseURL: API_URL,
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Auto-fallback interceptor: if local fails, try cloud, or vice versa
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (!originalRequest._retry) {
      originalRequest._retry = true
      const currentBase = originalRequest.baseURL || api.defaults.baseURL || ""
      
      // Determine fallback URL
      let fallbackUrl = ""
      if (currentBase.includes("127.0.0.1") || currentBase.includes("localhost")) {
        fallbackUrl = "https://sih26189.onrender.com"
      } else {
        fallbackUrl = "http://127.0.0.1:8000"
      }

      try {
        console.warn(`API request failed on ${currentBase}. Retrying via fallback: ${fallbackUrl}`)
        originalRequest.baseURL = fallbackUrl
        return await axios(originalRequest)
      } catch (fallbackErr) {
        console.warn("Fallback request also failed:", fallbackErr.message)
      }
    }
    return Promise.reject(error)
  }
)

// Cache helpers for blazing fast loading
export const getCachedData = (key) => {
  if (memoryCache.has(key)) {
    return memoryCache.get(key)
  }
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(CACHE_PREFIX + key)
      if (raw) {
        const parsed = JSON.parse(raw)
        memoryCache.set(key, parsed)
        return parsed
      }
    } catch (e) {
      console.warn("Cache parse error:", e)
    }
  }
  return null
}

export const setCachedData = (key, data) => {
  memoryCache.set(key, data)
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data))
    } catch (e) {
      // ignore storage quota full
    }
  }
}

export const clearApiCache = () => {
  memoryCache.clear()
  if (typeof window !== "undefined") {
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(k)
      }
    })
  }
}

// Cached GET helper with Stale-While-Revalidate (SWR)
async function cachedGet(url, cacheKey) {
  const cached = getCachedData(cacheKey)
  
  // Background refresh
  const networkPromise = api.get(url).then((res) => {
    setCachedData(cacheKey, res.data)
    return res.data
  }).catch((err) => {
    console.warn(`Network refresh failed for ${url}:`, err.message)
    if (cached) return cached
    throw err
  })

  // If cached data exists, return it immediately for instant 0ms UI render
  if (cached) {
    return { data: cached, isCached: true, networkPromise }
  }

  // Otherwise wait for network
  const data = await networkPromise
  return { data, isCached: false }
}

// Investigation API Services
export const investigationApi = {
  // Cases
  getCases: async () => {
    const res = await cachedGet("/cases/", "cases_list")
    return res
  },

  getCase: async (caseId) => {
    const res = await cachedGet(`/cases/${caseId}`, `case_details_${caseId}`)
    return res
  },

  createCase: async (data) => {
    const res = await api.post("/cases/", data)
    clearApiCache()
    return res
  },

  searchCases: (query) => api.get(`/cases/search?query=${encodeURIComponent(query)}`),

  // Network & Intelligence
  getCaseGraph: async (caseId) => {
    const res = await cachedGet(`/cases/${caseId}/neo4j-graph`, `case_graph_${caseId}`)
    return res
  },

  getNetworkAnalysis: async (caseId) => {
    const res = await cachedGet(`/cases/${caseId}/network-analysis`, `case_analysis_${caseId}`)
    return res
  },

  getCrossCaseSyndicates: async () => {
    const res = await cachedGet("/cases/intelligence/cross-case-syndicates", "cross_syndicates")
    return res
  },

  getCaseCrossCaseLinks: (caseId) => api.get(`/cases/${caseId}/cross-case-links`),
  getCaseDossier: (caseId) => api.get(`/cases/${caseId}/dossier`),

  // Documents & Extraction
  uploadDocument: async (formData) => {
    const res = await api.post("/extraction/pdf/save", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    clearApiCache()
    return res
  },

  // AI Review
  getReviewItems: (caseId) => api.get(`/cases/${caseId}/review`),
  reviewPerson: async (caseId, personId, status) => {
    const res = await api.patch(`/cases/${caseId}/persons/${personId}/review?status=${status}`)
    clearApiCache()
    return res
  },
  reviewRelationship: async (caseId, relationshipId, status) => {
    const res = await api.patch(`/cases/${caseId}/relationships/${relationshipId}/review?status=${status}`)
    clearApiCache()
    return res
  },
}

export default api