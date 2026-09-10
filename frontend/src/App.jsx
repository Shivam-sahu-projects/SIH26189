import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import {
  LayoutDashboard,
  FolderLock,
  FileText,
  Brain,
  Network,
  ArrowLeftRight,
  FileBarChart,
  Bell,
  Settings,
  Shield,
  Plus,
  Search,
  RefreshCw,
  LogOut,
  ChevronRight,
  Building,
  User,
  Phone,
  CreditCard,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Sliders,
  Database,
  ArrowUpRight,
  ArrowRight,
  Download,
  Filter,
} from "lucide-react"

import { investigationApi, API_URL, getStoredApiUrl, setStoredApiUrl, clearApiCache } from "./api"
import AuthLogin from "./components/AuthLogin"
import NeuralNetworkView from "./components/NeuralNetworkView"
import DocumentUpload from "./components/DocumentUpload"
import ReviewPanel from "./components/ReviewPanel"
import { SAMPLE_CASE } from "./utils/sampleCaseData"

export default function App() {
  // Auth state with safe shape validation
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("investiq_auth_user") || sessionStorage.getItem("investiq_auth_user")
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed && typeof parsed === "object") {
            return {
              username: parsed.username || "Admin",
              role: parsed.role || "Lead Criminal Investigator",
              badgeId: parsed.badgeId || "INV-5192",
              agency: parsed.agency || "Special Investigation Unit",
              sessionToken: parsed.sessionToken || "sec_token_active",
              loginTime: parsed.loginTime || new Date().toISOString(),
            }
          }
        } catch (e) {
          return null
        }
      }
    }
    return null
  })

  // Global Navigation & Cases state
  const [activeNav, setActiveNav] = useState("dashboard")
  const [cases, setCases] = useState([SAMPLE_CASE])
  const [selectedCaseId, setSelectedCaseId] = useState(null)
  const [caseTab, setCaseTab] = useState("overview")

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [showNewCase, setShowNewCase] = useState(false)
  const [showAlertsModal, setShowAlertsModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Cross-case syndicates
  const [syndicates, setSyndicates] = useState(null)

  // Current API URL
  const [currentApiUrl, setCurrentApiUrl] = useState(getStoredApiUrl())

  /* ===================================================
     INITIAL DATA FETCHING WITH SWR CACHE
  =================================================== */
  useEffect(() => {
    if (currentUser) {
      fetchCases()
      fetchSyndicates()
    }
  }, [currentUser])

  async function fetchCases() {
    try {
      setLoading(true)
      setError("")
      const res = await investigationApi.getCases()
      const raw = res?.data?.cases || res?.data || res || []
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.cases) ? raw.cases : [])
      setCases(list.length > 0 ? list : [SAMPLE_CASE])
    } catch (err) {
      console.warn("Could not fetch remote cases, falling back to local dataset:", err)
      setCases([SAMPLE_CASE])
    } finally {
      setLoading(false)
    }
  }

  async function fetchSyndicates() {
    try {
      const res = await investigationApi.getCrossCaseSyndicates()
      setSyndicates(res?.data || null)
    } catch (e) {
      // ignore
    }
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem("investiq_auth_user")
      sessionStorage.removeItem("investiq_auth_user")
    } catch (e) {}
    setCurrentUser(null)
    setShowUserMenu(false)
  }

  const selectedCase = useMemo(() => {
    if (!selectedCaseId) return SAMPLE_CASE
    const safeList = Array.isArray(cases) ? cases : [SAMPLE_CASE]
    const found = safeList.find((c) => String(c?.id) === String(selectedCaseId))
    return found || SAMPLE_CASE
  }, [cases, selectedCaseId])

  // Filtered cases for search and status
  const filteredCases = useMemo(() => {
    const q = (searchQuery || "").toLowerCase().trim()
    const safeList = Array.isArray(cases) ? cases : [SAMPLE_CASE]
    return safeList.filter((c) => {
      if (!c) return false
      const st = String(c.status || "Under Investigation").toLowerCase()
      const matchesStatus =
        statusFilter === "ALL" || st.includes(statusFilter.toLowerCase())
      const matchesQuery =
        !q ||
        [c.case_number, c.title, c.primary_location, c.status]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q))
      return matchesStatus && matchesQuery
    })
  }, [cases, searchQuery, statusFilter])

  function openCaseWorkspace(caseId, tab = "overview") {
    setSelectedCaseId(caseId)
    setCaseTab(tab)
  }

  function closeCaseWorkspace() {
    setSelectedCaseId(null)
    setCaseTab("overview")
  }

  // If user is not authenticated, show modern Admin login interface
  if (!currentUser) {
    return <AuthLogin onLoginSuccess={(user) => setCurrentUser(user)} />
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* ===================================================
          CLEAN WHITE SIDEBAR
      =================================================== */}
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-slate-200 bg-white shadow-xs">
        {/* INVESTIQ LOGO */}
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-wide text-slate-900">INVESTIQ</span>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-700">
                PRO
              </span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Criminal Intelligence
            </p>
          </div>
        </div>

        {/* NAVIGATION LIST (ALL ICONS FULLY OPERATIONAL) */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <SidebarNavItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={!selectedCaseId && activeNav === "dashboard"}
            onClick={() => {
              closeCaseWorkspace()
              setActiveNav("dashboard")
            }}
          />

          <SidebarNavItem
            icon={FolderLock}
            label="Cases"
            badge={cases.length}
            active={!selectedCaseId && activeNav === "cases"}
            onClick={() => {
              closeCaseWorkspace()
              setActiveNav("cases")
            }}
          />

          <SidebarNavItem
            icon={Brain}
            label="Neural Network"
            badge="AI"
            active={!selectedCaseId && activeNav === "network"}
            onClick={() => {
              closeCaseWorkspace()
              setActiveNav("network")
            }}
          />

          <SidebarNavItem
            icon={FileText}
            label="Documents"
            active={!selectedCaseId && activeNav === "documents"}
            onClick={() => {
              closeCaseWorkspace()
              setActiveNav("documents")
            }}
          />

          <SidebarNavItem
            icon={CheckCircle2}
            label="AI Extraction"
            active={!selectedCaseId && activeNav === "ai"}
            onClick={() => {
              closeCaseWorkspace()
              setActiveNav("ai")
            }}
          />

          <SidebarNavItem
            icon={ArrowLeftRight}
            label="Transactions"
            active={!selectedCaseId && activeNav === "transactions"}
            onClick={() => {
              closeCaseWorkspace()
              setActiveNav("transactions")
            }}
          />

          <SidebarNavItem
            icon={FileBarChart}
            label="Reports & Dossier"
            active={!selectedCaseId && activeNav === "reports"}
            onClick={() => {
              closeCaseWorkspace()
              setActiveNav("reports")
            }}
          />

          <SidebarNavItem
            icon={Bell}
            label="Alerts & Feeds"
            badge="3"
            active={!selectedCaseId && activeNav === "alerts"}
            onClick={() => {
              closeCaseWorkspace()
              setActiveNav("alerts")
            }}
          />

          <SidebarNavItem
            icon={Settings}
            label="Settings"
            active={!selectedCaseId && activeNav === "settings"}
            onClick={() => {
              closeCaseWorkspace()
              setActiveNav("settings")
            }}
          />
        </nav>

        {/* INVESTIGATOR USER BADGE */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm">
                A
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-slate-900">{currentUser.username}</div>
                <div className="truncate text-[10px] font-semibold text-slate-500">ID: {currentUser.badgeId}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Logout session"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-red-600 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ===================================================
          MAIN CONTENT VIEW AREA
      =================================================== */}
      <div className="ml-64 flex min-h-screen flex-1 flex-col">
        {/* TOP PROFESSIONAL HEADER */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-8 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-3">
            {selectedCaseId ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={closeCaseWorkspace}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  ← All Cases
                </button>
                <div className="h-4 w-px bg-slate-300" />
                <div>
                  <h1 className="text-lg font-bold text-slate-900">{selectedCase.case_number}</h1>
                  <p className="text-xs text-slate-500 truncate max-w-md">{selectedCase.title}</p>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-xl font-bold text-slate-900 capitalize">
                  {activeNav === "ai" ? "AI Extraction Review" : activeNav}
                </h1>
                <p className="text-xs text-slate-500">
                  {activeNav === "dashboard" && "Real-time criminal syndicate monitoring & neural network insights"}
                  {activeNav === "cases" && "Search, manage and investigate law enforcement case files"}
                  {activeNav === "network" && "Interactive graph neural network & suspect risk calculation"}
                  {activeNav === "documents" && "PDF FIR upload, NLP entity extraction and audit reports"}
                  {activeNav === "ai" && "Verify suspect entities and inferred criminal relations"}
                  {activeNav === "transactions" && "Financial money trail & multi-hop mule layering detector"}
                  {activeNav === "reports" && "Generate comprehensive intelligence dossiers and Section 91 notices"}
                  {activeNav === "alerts" && "Real-time threat feed and cross-case syndicate linkages"}
                  {activeNav === "settings" && "Configure API endpoints, latency and local cache"}
                </p>
              </div>
            )}
          </div>

          {/* TOP RIGHT ICONS & CONTROLS */}
          <div className="flex items-center gap-3">
            {/* Quick Refresh */}
            <button
              onClick={() => {
                fetchCases()
                fetchSyndicates()
              }}
              title="Refresh Data"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            {/* Alerts Notification Button */}
            <div className="relative">
              <button
                onClick={() => setShowAlertsModal(!showAlertsModal)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>

              {/* Alerts Dropdown Modal */}
              {showAlertsModal && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-slate-900">Intelligence Alerts</span>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      3 Urgent
                    </span>
                  </div>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <div className="rounded-xl border border-red-100 bg-red-50/50 p-2.5">
                      <div className="font-bold text-red-800">Cross-Case Mule Alert</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Account ACC-8392-1049 detected in 2 concurrent cyber fraud investigations.
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-2.5">
                      <div className="font-bold text-amber-800">Layering Conduit Flagged</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        ₹4,50,000 rapid transfer chain across 3 banks within 48 minutes.
                      </div>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-2.5">
                      <div className="font-bold text-blue-800">New Syndicate Node</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Phone +91 9876543210 linked to high-frequency communication hub.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* + New Case Button */}
            <button
              onClick={() => setShowNewCase(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              <span>New Case</span>
            </button>
          </div>
        </header>

        {/* ===================================================
            PAGE BODY (DEPENDING ON ACTIVE VIEW OR CASE)
        =================================================== */}
        <main className="flex-1 p-8">
          {/* 1. CASE WORKSPACE (When a specific case is opened) */}
          {selectedCaseId ? (
            <CaseWorkspaceView
              caseData={selectedCase}
              caseTab={caseTab}
              setCaseTab={setCaseTab}
              onBack={closeCaseWorkspace}
              onRefresh={() => {
                fetchCases()
              }}
            />
          ) : (
            <>
              {/* 2. DASHBOARD VIEW */}
              {activeNav === "dashboard" && (
                <DashboardView
                  cases={cases}
                  onOpenCase={openCaseWorkspace}
                  onNewCase={() => setShowNewCase(true)}
                  onOpenNetwork={() => setActiveNav("network")}
                  onOpenUpload={() => setActiveNav("documents")}
                />
              )}

              {/* 3. CASES VIEW */}
              {activeNav === "cases" && (
                <CasesListView
                  cases={filteredCases}
                  allCount={cases.length}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  loading={loading}
                  error={error}
                  onOpenCase={openCaseWorkspace}
                  onNewCase={() => setShowNewCase(true)}
                />
              )}

              {/* 4. GLOBAL NEURAL NETWORK VIEW */}
              {activeNav === "network" && (
                <div className="h-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <NeuralNetworkView
                    caseData={cases[0] || SAMPLE_CASE}
                    caseId={cases[0]?.id}
                  />
                </div>
              )}

              {/* 5. DOCUMENTS VIEW */}
              {activeNav === "documents" && (
                <DocumentsManagerView
                  cases={cases}
                  onRefresh={fetchCases}
                  onOpenNetwork={() => setActiveNav("network")}
                />
              )}

              {/* 6. AI EXTRACTION REVIEW VIEW */}
              {activeNav === "ai" && (
                <ReviewPanel caseId={cases[0]?.id || 1} />
              )}

              {/* 7. TRANSACTIONS VIEW */}
              {activeNav === "transactions" && (
                <TransactionsExplorerView cases={cases} />
              )}

              {/* 8. REPORTS VIEW */}
              {activeNav === "reports" && (
                <ReportsDossierView caseData={cases[0] || SAMPLE_CASE} />
              )}

              {/* 9. ALERTS & FEEDS VIEW */}
              {activeNav === "alerts" && (
                <AlertsFeedView syndicates={syndicates} cases={cases} />
              )}

              {/* 10. SETTINGS VIEW */}
              {activeNav === "settings" && (
                <SettingsManagerView
                  currentApiUrl={currentApiUrl}
                  onUpdateApiUrl={(url) => {
                    setStoredApiUrl(url)
                    setCurrentApiUrl(url)
                    fetchCases()
                  }}
                  currentUser={currentUser}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* ===================================================
          NEW CASE MODAL
      =================================================== */}
      {showNewCase && (
        <NewCaseModal
          onClose={() => setShowNewCase(false)}
          onCreated={(newCase) => {
            setShowNewCase(false)
            fetchCases()
            if (newCase?.id) openCaseWorkspace(newCase.id)
          }}
        />
      )}
    </div>
  )
}

/* =====================================================
   SIDEBAR NAVIGATION ITEM
===================================================== */
function SidebarNavItem({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold transition ${
        active
          ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-500"}`} />
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

/* =====================================================
   DASHBOARD VIEW (High-Level Intelligence Metrics)
===================================================== */
function DashboardView({ cases = [], onOpenCase, onNewCase, onOpenNetwork, onOpenUpload }) {
  const safeCases = Array.isArray(cases) && cases.length > 0 ? cases : [SAMPLE_CASE]

  return (
    <div className="space-y-7">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <DashboardMetricCard
          label="Active Investigations"
          value={safeCases.length}
          trend="+2 this week"
          icon={FolderLock}
          color="blue"
        />
        <DashboardMetricCard
          label="Prime Suspects Flagged"
          value="4"
          trend="Critical risk >75%"
          icon={Shield}
          color="red"
        />
        <DashboardMetricCard
          label="Tracked Mule Accounts"
          value="12"
          trend="8 high-volume conduits"
          icon={CreditCard}
          color="amber"
        />
        <DashboardMetricCard
          label="Layered Transaction Flow"
          value="₹18.5 Lakh"
          trend="IMPS / NEFT Layering"
          icon={ArrowLeftRight}
          color="emerald"
        />
      </div>

      {/* Quick Actions & High Priority Notice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Cases */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Investigation Cases</h2>
              <p className="text-xs text-slate-500">Select any case to explore its criminal neural network</p>
            </div>
            <button
              onClick={onNewCase}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              + Create Case
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {safeCases.slice(0, 4).map((c) => (
              <div
                key={c?.id || Math.random()}
                onClick={() => onOpenCase(c?.id || 1)}
                className="flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 rounded-xl transition cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{c?.case_number || "CASE-2026-0048"}</span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      {c?.status || "Under Investigation"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate max-w-md">{c?.title || "Investigation Case"}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{c?.primary_location || "Indore, MP"}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Quick Launch & Intelligence Tools */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50/40 p-6 shadow-xs">
            <div className="flex items-center gap-2 text-blue-700">
              <Brain className="h-5 w-5" />
              <h3 className="font-bold text-sm">Neural Crime Network</h3>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Auto-calculate risk and doubt on suspects using graph neural centrality and financial flow weights.
            </p>
            <button
              onClick={onOpenNetwork}
              className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <span>Launch Neural Visualizer</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 text-slate-900">
              <FileText className="h-5 w-5 text-slate-600" />
              <h3 className="font-bold text-sm">Upload & Extract FIR</h3>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Drag and drop case PDF reports or police charge-sheets for automated OCR & NLP entity ingestion.
            </p>
            <button
              onClick={onOpenUpload}
              className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              <span>Ingest PDF Document</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardMetricCard({ label, value, trend, icon: Icon, color }) {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    red: "bg-red-50 text-red-600 border-red-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${colorStyles[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-black text-slate-900">{value}</div>
      <div className="mt-1 text-[11px] font-semibold text-slate-400">{trend}</div>
    </div>
  )
}

/* =====================================================
   CASES LIST VIEW (Search, Filter, Cards)
===================================================== */
function CasesListView({
  cases,
  allCount,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  loading,
  error,
  onOpenCase,
  onNewCase,
}) {
  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by case number, title, suspect or location..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 outline-none shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            {["ALL", "Under Investigation", "Open", "Under Review", "Closed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1 text-[11px] font-bold transition ${
                  statusFilter === st
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {st === "ALL" ? "All Cases" : st}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onNewCase}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>New Case</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Case Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {cases.map((item) => (
          <div
            key={item.id}
            onClick={() => onOpenCase(item.id)}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <span className="font-black text-base text-slate-900 group-hover:text-blue-600 transition">
                  {item.case_number}
                </span>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                  {item.status || "Active"}
                </span>
              </div>
              <h4 className="mt-2.5 text-xs font-bold text-slate-700 line-clamp-2 leading-relaxed">
                {item.title}
              </h4>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{item.primary_location || "Location pending"}</span>
              </span>
              <span className="font-bold text-blue-600 flex items-center gap-1">
                <span>Workspace</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =====================================================
   CASE WORKSPACE VIEW (Overview, Network, AI, etc.)
===================================================== */
function CaseWorkspaceView({ caseData, caseTab, setCaseTab, onBack, onRefresh }) {
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "network", label: "Neural Network" },
    { key: "entities", label: "Entities" },
    { key: "transactions", label: "Transactions" },
    { key: "documents", label: "Documents" },
    { key: "ai", label: "AI Verification" },
    { key: "dossier", label: "Case Dossier" },
  ]

  return (
    <div className="space-y-6">
      {/* Case Header Details Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900">{caseData.case_number}</h2>
              <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-bold text-blue-800">
                {caseData.status || "Under Investigation"}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600 max-w-2xl">{caseData.title}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{caseData.primary_location || "Location unassigned"}</span>
              </span>
              <span>Case ID: #{caseData.id}</span>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setCaseTab(t.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  caseTab === t.key
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      {caseTab === "overview" && (
        <CaseOverviewTab caseData={caseData} setCaseTab={setCaseTab} />
      )}

      {caseTab === "network" && (
        <div className="h-[740px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <NeuralNetworkView caseId={caseData.id} caseData={caseData} />
        </div>
      )}

      {caseTab === "entities" && (
        <CaseEntitiesTab caseId={caseData.id} />
      )}

      {caseTab === "transactions" && (
        <CaseTransactionsTab caseId={caseData.id} />
      )}

      {caseTab === "documents" && (
        <div className="space-y-6">
          <DocumentUpload
            caseId={caseData.id}
            onUploadSuccess={() => onRefresh()}
            onOpenNetwork={() => setCaseTab("network")}
          />
        </div>
      )}

      {caseTab === "ai" && (
        <ReviewPanel caseId={caseData.id} />
      )}

      {caseTab === "dossier" && (
        <ReportsDossierView caseData={caseData} />
      )}
    </div>
  )
}

/* =====================================================
   CASE OVERVIEW TAB
===================================================== */
function CaseOverviewTab({ caseData, setCaseTab }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Investigation Status</div>
          <div className="mt-2 text-lg font-black text-blue-600">{caseData.status || "Active"}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Primary Location</div>
          <div className="mt-2 text-lg font-black text-slate-900 truncate">
            {caseData.primary_location || "Indore"}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Neural Network Hubs</div>
          <div className="mt-2 text-lg font-black text-slate-900">4 Suspects</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Calculated Risk Level</div>
          <div className="mt-2 text-lg font-black text-red-600">High Risk (82%)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900">Investigation Scope & Objectives</h3>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Multi-conduit investigation into organized money mule diversion, telephone call logs, and banking layers.
            All suspect nodes are mapped through automated Graph Neural Network features to ascertain criminal complicity.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900">Quick Analysis Shortcuts</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              onClick={() => setCaseTab("network")}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              <span>Explore Neural Network</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>
            <button
              onClick={() => setCaseTab("ai")}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              <span>Verify Extracted Entities</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>
            <button
              onClick={() => setCaseTab("documents")}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              <span>Ingest Case Documents</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>
            <button
              onClick={() => setCaseTab("dossier")}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              <span>Generate Police Dossier</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =====================================================
   CASE ENTITIES TAB
===================================================== */
function CaseEntitiesTab({ caseId }) {
  const [data, setData] = useState(SAMPLE_CASE)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await investigationApi.getCase(caseId)
        if (res.data) setData(res.data)
      } catch (e) {
        setData(SAMPLE_CASE)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [caseId])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <EntityCard title="Suspects & Persons" items={data?.persons || []} getName={(i) => i.name} icon={User} />
      <EntityCard title="Phone Numbers" items={data?.phone_numbers || []} getName={(i) => i.number} icon={Phone} />
      <EntityCard title="Mule Bank Accounts" items={data?.bank_accounts || []} getName={(i) => i.account_number} icon={CreditCard} />
      <EntityCard title="Operating Locations" items={data?.locations || []} getName={(i) => i.name} icon={MapPin} />
      <EntityCard title="Organizations & Companies" items={data?.organizations || []} getName={(i) => i.name} icon={Building} />
    </div>
  )
}

function EntityCard({ title, items = [], getName, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-blue-600" />
          <h4 className="text-xs font-bold text-slate-900">{title}</h4>
        </div>
        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
          {items.length}
        </span>
      </div>
      <div className="p-4 divide-y divide-slate-100 max-h-60 overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No {title.toLowerCase()} recorded.</div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">{getName(item)}</span>
              {item.confidence && (
                <span className="text-[10px] font-semibold text-emerald-600">
                  {Math.round(item.confidence * 100)}% Conf
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* =====================================================
   CASE TRANSACTIONS TAB
===================================================== */
function CaseTransactionsTab({ caseId }) {
  const [txns, setTxns] = useState(SAMPLE_CASE.transactions)

  useEffect(() => {
    async function load() {
      try {
        const res = await investigationApi.getCase(caseId)
        if (res.data?.transactions) setTxns(res.data.transactions)
      } catch (e) {
        setTxns(SAMPLE_CASE.transactions)
      }
    }
    load()
  }, [caseId])

  const totalAmount = txns.reduce((sum, t) => sum + Number(t.amount || 0), 0)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Financial Ledger & Conduit Transfers</h3>
          <p className="text-xs text-slate-500">Tracked bank flows associated with this investigation</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 font-semibold">Total Flow Value</div>
          <div className="text-lg font-black text-slate-900">₹{totalAmount.toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Source Account</th>
              <th className="p-3">Beneficiary Account</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Reference / UTR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {txns.map((t, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition">
                <td className="p-3 text-slate-500">{t.date || "2026-02-12"}</td>
                <td className="p-3 font-mono font-bold text-blue-700">{t.from_account}</td>
                <td className="p-3 font-mono font-bold text-blue-700">{t.to_account}</td>
                <td className="p-3 font-black text-slate-900">₹{Number(t.amount || 0).toLocaleString("en-IN")}</td>
                <td className="p-3 font-mono text-slate-400">{t.reference || "IMPS-90129031"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* =====================================================
   DOCUMENTS MANAGER VIEW
===================================================== */
function DocumentsManagerView({ cases, onRefresh, onOpenNetwork }) {
  return (
    <div className="space-y-6">
      <DocumentUpload onUploadSuccess={onRefresh} onOpenNetwork={onOpenNetwork} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="font-bold text-sm text-slate-900">Ingested Case Documents</h3>
          <p className="text-xs text-slate-500">Repository of indexed police reports, FIRs, and bank statements</p>
        </div>

        <div className="mt-4 space-y-3">
          {SAMPLE_CASE.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{doc.filename}</div>
                  <div className="text-[11px] text-slate-500">{doc.document_type}</div>
                </div>
              </div>

              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                PDF Indexed
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* =====================================================
   TRANSACTIONS EXPLORER VIEW
===================================================== */
function TransactionsExplorerView({ cases }) {
  return (
    <div className="space-y-6">
      <CaseTransactionsTab caseId={cases[0]?.id || 1} />
    </div>
  )
}

/* =====================================================
   REPORTS & DOSSIER VIEW
===================================================== */
function ReportsDossierView({ caseData }) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Case Investigation Dossier</h2>
          <p className="text-xs text-slate-500">Court-admissible criminal intelligence synthesis & Section 91 notice pack</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Print / Export Dossier</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs space-y-6">
        <div className="border-b border-slate-200 pb-5 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">
              OFFICIAL INVESTIGATION REPORT
            </span>
            <h1 className="text-xl font-black text-slate-900 mt-1">{caseData.case_number}</h1>
            <p className="text-xs text-slate-600 font-semibold">{caseData.title}</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Jurisdiction: {caseData.primary_location || "Indore, MP"}</div>
            <div>Date: {new Date().toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Executive Summary</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Technical analysis of telephonic Call Detail Records (CDR) and immediate IMPS/NEFT banking statements
            demonstrates a multi-layered criminal syndicate operating out of Indore and Gurugram. Funds totaling ₹18,50,000
            were siphoned through cyber links and systematically distributed to avoid anti-money laundering thresholds.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recommended Police Actions</h4>
          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>Issue Section 91 Cr.P.C. requisition to beneficiary banks for immediate lien & KYC freeze on ACC-8392-1049.</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>Serve notice to telecom operators for cell-tower dumps and IMEI history on +91 9876543210.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =====================================================
   ALERTS & FEED VIEW
===================================================== */
function AlertsFeedView({ syndicates, cases }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900">Real-Time Threat Intelligence Feed</h3>
        <p className="text-xs text-slate-500 mt-1">
          Automated cross-case correlation identifying common suspects, phone numbers, and recurring money mules.
        </p>

        <div className="mt-5 space-y-3">
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 flex items-start gap-3">
            <Shield className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-red-900">CRITICAL: Multi-State Syndicate Convergence</div>
              <p className="text-xs text-slate-700 mt-1">
                Suspect Vikram Malhotra (+91 9876543210) has been cross-referenced in 2 separate cyber extortion complaints.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-900">WARNING: High-Velocity Rapid Layering</div>
              <p className="text-xs text-slate-700 mt-1">
                Mule Account ACC-4921-9876 transferred funds to 3 distinct accounts within 45 minutes of receipt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =====================================================
   SETTINGS MANAGER VIEW (API Switcher, Cache Clear)
===================================================== */
function SettingsManagerView({ currentApiUrl, onUpdateApiUrl, currentUser }) {
  const [selectedUrl, setSelectedUrl] = useState(currentApiUrl)
  const [cacheCleared, setCacheCleared] = useState(false)

  const handleSaveUrl = (url) => {
    setSelectedUrl(url)
    onUpdateApiUrl(url)
  }

  const handleClearCache = () => {
    clearApiCache()
    setCacheCleared(true)
    setTimeout(() => setCacheCleared(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Backend API Selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Backend API Gateway</h3>
          <p className="text-xs text-slate-500">
            Switch between Cloud Render deployment and fast local development API for ultra-low latency.
          </p>
        </div>

        <div className="space-y-2">
          <label
            onClick={() => handleSaveUrl("https://sih26189.onrender.com")}
            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
              selectedUrl.includes("onrender.com")
                ? "border-blue-600 bg-blue-50/50 text-blue-900 font-bold"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="text-xs">
              <div className="font-bold">Cloud Production (Render)</div>
              <div className="text-[11px] text-slate-500 font-mono">https://sih26189.onrender.com</div>
            </div>
            {selectedUrl.includes("onrender.com") && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
          </label>

          <label
            onClick={() => handleSaveUrl("http://127.0.0.1:8000")}
            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
              selectedUrl.includes("127.0.0.1") || selectedUrl.includes("localhost")
                ? "border-blue-600 bg-blue-50/50 text-blue-900 font-bold"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="text-xs">
              <div className="font-bold">Local Backend API (Ultra-Fast 5ms)</div>
              <div className="text-[11px] text-slate-500 font-mono">http://127.0.0.1:8000</div>
            </div>
            {(selectedUrl.includes("127.0.0.1") || selectedUrl.includes("localhost")) && (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            )}
          </label>
        </div>
      </div>

      {/* SWR Cache Manager */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Stale-While-Revalidate (SWR) Local Cache</h3>
          <p className="text-xs text-slate-500">
            Cases and graph topology are cached locally for instant 0ms responses. Clear cache to force clean network refresh.
          </p>
        </div>

        <button
          onClick={handleClearCache}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
        >
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>{cacheCleared ? "Cache Cleared Successfully!" : "Purge Stale Local Cache"}</span>
        </button>
      </div>

      {/* Investigator Identity */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-slate-900">Workstation Clearance Details</h3>
        <div className="divide-y divide-slate-100 text-xs text-slate-600">
          <div className="py-2 flex justify-between">
            <span className="text-slate-400">Investigator:</span>
            <span className="font-bold text-slate-900">{currentUser.username}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-400">Security Clearance:</span>
            <span className="font-bold text-blue-700">{currentUser.role}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-400">Workstation Badge:</span>
            <span className="font-mono font-bold text-slate-900">{currentUser.badgeId}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =====================================================
   NEW CASE MODAL
===================================================== */
function NewCaseModal({ onClose, onCreated }) {
  const [caseNumber, setCaseNumber] = useState("")
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [status, setStatus] = useState("Under Investigation")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    if (!caseNumber.trim()) {
      setError("Case number is required.")
      return
    }

    try {
      setSaving(true)
      setError("")
      const res = await investigationApi.createCase({
        case_number: caseNumber.trim(),
        title: title.trim() || "Investigation Case",
        status,
        primary_location: location.trim() || null,
      })
      onCreated(res.data?.case || res.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || "Unable to create case on remote database.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-bold text-base text-slate-900">Initiate New Investigation Case</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="mb-1 block font-bold text-slate-700">Case Number *</label>
            <input
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g. CASE-2026-0099"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block font-bold text-slate-700">Investigation Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cyber Fraud & Money Mule Network"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block font-bold text-slate-700">Primary Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Vijay Nagar, Indore"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block font-bold text-slate-700">Initial Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 outline-none focus:border-blue-600 focus:bg-white"
            >
              <option>Under Investigation</option>
              <option>Open</option>
              <option>Under Review</option>
              <option>Closed</option>
            </select>
          </div>

          {error && <div className="text-red-600 font-medium">{error}</div>}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Case"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}