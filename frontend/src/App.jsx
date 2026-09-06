import { useEffect, useMemo, useState } from "react"
import axios from "axios"

import NetworkGraph from "./components/NetworkGraph"
import DocumentUpload from "./components/DocumentUpload"
import ReviewPanel from "./components/ReviewPanel"

const API_URL = "https://sih26189.onrender.com"

function App() {
  const [cases, setCases] = useState([])
  const [selectedCaseId, setSelectedCaseId] = useState(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [showNewCase, setShowNewCase] = useState(false)

  useEffect(() => {
    fetchCases()
  }, [])

  async function fetchCases() {
    try {
      setLoading(true)
      setError("")

      const response = await axios.get(
        `${API_URL}/cases/`
      )

      setCases(response.data.cases || [])
    } catch (err) {
      console.error(err)
      setError("Unable to load cases")
    } finally {
      setLoading(false)
    }
  }

  const filteredCases = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()

    if (!query) return cases

    return cases.filter((item) =>
      [
        item.case_number,
        item.title,
        item.status,
        item.primary_location,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        )
    )
  }, [cases, searchQuery])

  const selectedCase = cases.find(
    (item) => item.id === selectedCaseId
  )

  function openCase(caseId) {
    setSelectedCaseId(caseId)
    setActiveTab("overview")
  }

  function closeCase() {
    setSelectedCaseId(null)
    setActiveTab("overview")
  }

  return (
    <div className="min-h-screen bg-[#080b0a] text-slate-200">

      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-slate-800 bg-[#0c100f]">

        {/* LOGO */}
        <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900">
            <span className="text-xl text-slate-300">
              ◈
            </span>
          </div>

          <div>
            <div className="text-lg font-bold tracking-wide text-white">
              INVESTIQ
            </div>

            <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">
              Investigation
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-1 px-3 py-5">

          <NavItem
            icon="⌂"
            label="Dashboard"
            active={!selectedCaseId}
            onClick={closeCase}
          />

          <NavItem
            icon="▣"
            label="Cases"
            active={!selectedCaseId}
            onClick={closeCase}
          />

          <NavItem
            icon="◌"
            label="Documents"
            disabled
          />

          <NavItem
            icon="◎"
            label="AI Extraction"
            disabled
          />

          <NavItem
            icon="⌘"
            label="Network Analysis"
            disabled
          />

          <NavItem
            icon="⇄"
            label="Transactions"
            disabled
          />

          <NavItem
            icon="▤"
            label="Reports"
            disabled
          />

          <NavItem
            icon="♢"
            label="Alerts"
            disabled
          />

          <NavItem
            icon="⚙"
            label="Settings"
            disabled
          />

        </nav>

        {/* USER */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#101413] p-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300">
              ◉
            </div>

            <div className="min-w-0">
              <div className="text-sm font-medium text-white">
                Investigator
              </div>

              <div className="text-[10px] text-slate-600">
                ID: INV-1001
              </div>
            </div>

          </div>
        </div>

      </aside>

      {/* MAIN */}
      <main className="ml-60 min-h-screen">

        {/* TOP BAR */}
        <header className="flex h-20 items-center justify-between border-b border-slate-800 bg-[#0c100f]/95 px-8">

          <div>
            <h1 className="text-xl font-semibold text-white">
              {selectedCase
                ? selectedCase.case_number
                : "Investigation Cases"}
            </h1>

            <p className="mt-1 text-xs text-slate-600">
              {selectedCase
                ? "Investigation workspace"
                : "Search and manage investigations"}
            </p>
          </div>

          <div className="flex items-center gap-5">

            <button className="text-lg text-slate-600 transition hover:text-slate-300">
              ♢
            </button>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-sm text-slate-400">
                ◉
              </div>

              <span className="text-sm text-slate-400">
                Investigator
              </span>

            </div>

          </div>

        </header>

        {/* CASE LIST */}
        {!selectedCase && (
          <CasesPage
            cases={filteredCases}
            allCases={cases}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            loading={loading}
            error={error}
            onOpenCase={openCase}
            onNewCase={() => setShowNewCase(true)}
          />
        )}

        {/* CASE WORKSPACE */}
        {selectedCase && (
          <CaseWorkspace
            caseData={selectedCase}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onBack={closeCase}
            onRefresh={fetchCases}
          />
        )}

      </main>

      {/* NEW CASE MODAL */}
      {showNewCase && (
        <NewCaseModal
          onClose={() => setShowNewCase(false)}
          onCreated={(caseData) => {
            setShowNewCase(false)
            fetchCases()

            if (caseData?.id) {
              openCase(caseData.id)
            }
          }}
        />
      )}

    </div>
  )
}


/* =====================================================
   CASES PAGE
===================================================== */

function CasesPage({
  cases,
  allCases,
  searchQuery,
  setSearchQuery,
  loading,
  error,
  onOpenCase,
  onNewCase,
}) {
  return (
    <div className="p-8">

      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">

        <div>
          <h2 className="text-2xl font-semibold text-white">
            Cases
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select an investigation to continue.
          </p>
        </div>

        <button
          onClick={onNewCase}
          className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-600"
        >
          + New Case
        </button>

      </div>

      <div className="mb-7 flex max-w-3xl items-center gap-3">

        <div className="relative flex-1">

          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">
            ⌕
          </span>

          <input
            type="text"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Search case number, title or location..."
            className="w-full rounded-xl border border-slate-800 bg-[#101413] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-600"
          />

        </div>

        <div className="rounded-xl border border-slate-800 bg-[#101413] px-4 py-3 text-sm text-slate-500">
          {cases.length} cases
        </div>

      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-20 text-center text-sm text-slate-500">
          Loading cases...
        </div>
      )}

      {!loading && cases.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#101413] py-20 text-center">

          <div className="text-4xl text-slate-700">
            □
          </div>

          <h3 className="mt-4 font-medium text-white">
            No cases found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Create a new case or upload an investigation document.
          </p>

          <button
            onClick={onNewCase}
            className="mt-5 rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-600"
          >
            + Create New Case
          </button>

        </div>
      )}

      {!loading && cases.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">

          {cases.map((item) => (
            <CaseCard
              key={item.id}
              caseData={item}
              onClick={() => onOpenCase(item.id)}
            />
          ))}

        </div>
      )}

      {!loading &&
        allCases.length > 0 &&
        cases.length === 0 && (
          <div className="py-20 text-center text-sm text-slate-500">
            No cases match "{searchQuery}".
          </div>
        )}

    </div>
  )
}


/* =====================================================
   CASE CARD
===================================================== */

function CaseCard({ caseData, onClick }) {
  const status =
    caseData.status || "Under Investigation"

  return (
    <button
      onClick={onClick}
      className="group rounded-xl border border-slate-800 bg-[#101413] p-5 text-left transition hover:border-slate-600 hover:bg-[#131817]"
    >

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <div className="text-sm font-semibold text-white">
            {caseData.case_number}
          </div>

          <div className="mt-2 truncate text-sm text-slate-400">
            {caseData.title || "Investigation Case"}
          </div>

        </div>

        <StatusBadge status={status} />

      </div>

      <div className="mt-5 flex items-center justify-between text-xs text-slate-600">

        <span>
          {caseData.primary_location ||
            "Location unavailable"}
        </span>

        <span className="text-slate-500">
          →
        </span>

      </div>

    </button>
  )
}


/* =====================================================
   CASE WORKSPACE
===================================================== */

function CaseWorkspace({
  caseData,
  activeTab,
  setActiveTab,
  onBack,
  onRefresh,
}) {
  const tabs = [
    "overview",
    "entities",
    "transactions",
    "documents",
    "network",
    "ai",
  ]

  return (
    <div className="p-6 lg:p-8">

      <button
        onClick={onBack}
        className="mb-5 text-sm text-slate-500 transition hover:text-slate-200"
      >
        ← All Cases
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-5">

        <div>

          <div className="flex flex-wrap items-center gap-3">

            <h2 className="text-2xl font-semibold text-white">
              {caseData.case_number}
            </h2>

            <StatusBadge
              status={
                caseData.status ||
                "Under Investigation"
              }
            />

          </div>

          <p className="mt-2 text-sm text-slate-400">
            {caseData.title ||
              "Investigation Case"}
          </p>

          <div className="mt-3 flex flex-wrap gap-5 text-xs text-slate-600">

            <span>
              ◉ {caseData.primary_location ||
                "Location unavailable"}
            </span>

            <span>
              Case ID: {caseData.id}
            </span>

          </div>

        </div>

        <div className="flex gap-2">

          <button
            onClick={onRefresh}
            className="rounded-lg border border-slate-800 bg-[#101413] px-4 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:text-white"
            title="Refresh"
          >
            ↻
          </button>

        </div>

      </div>

      <div className="mb-6 flex overflow-x-auto border-b border-slate-800">

        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition ${
              activeTab === tab
                ? "border-green-500 text-green-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab === "ai"
              ? "AI Extraction"
              : tab.charAt(0).toUpperCase() +
                tab.slice(1)}
          </button>
        ))}

      </div>

      {activeTab === "overview" && (
        <Overview
          caseData={caseData}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "entities" && (
        <EntitiesPage
          caseId={caseData.id}
        />
      )}

      {activeTab === "transactions" && (
        <TransactionsPage
          caseId={caseData.id}
        />
      )}

      {activeTab === "documents" && (
        <DocumentsPage
          caseId={caseData.id}
          onRefresh={onRefresh}
        />
      )}

      {activeTab === "network" && (
        <div className="h-[720px] overflow-hidden rounded-xl border border-slate-800 bg-[#101413]">
          <NetworkGraph
            caseId={caseData.id}
          />
        </div>
      )}

      {activeTab === "ai" && (
        <ReviewPanel
          caseId={caseData.id}
        />
      )}

    </div>
  )
}


/* =====================================================
   ENTITIES
===================================================== */

function EntitiesPage({ caseId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchDetails()
  }, [caseId])

  async function fetchDetails() {
    try {
      setLoading(true)
      setError("")

      const response = await axios.get(
        `${API_URL}/cases/${caseId}`
      )

      setData(response.data)
    } catch (err) {
      console.error(err)
      setError("Unable to load entities")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-slate-500">
        Loading entities...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-5 text-sm text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      <div>

        <h2 className="text-xl font-semibold text-white">
          Entities
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Entities extracted from investigation documents.
        </p>

      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        <EntityCard
          title="Persons"
          items={data?.persons || []}
          getName={(item) => item.name}
          type="PERSON"
        />

        <EntityCard
          title="Phone Numbers"
          items={data?.phone_numbers || []}
          getName={(item) => item.number}
          type="PHONE"
        />

        <EntityCard
          title="Bank Accounts"
          items={data?.bank_accounts || []}
          getName={(item) => item.account_number}
          type="BANK_ACCOUNT"
        />

        <EntityCard
          title="Locations"
          items={data?.locations || []}
          getName={(item) => item.name}
          type="LOCATION"
        />

        <EntityCard
          title="Organizations"
          items={data?.organizations || []}
          getName={(item) => item.name}
          type="ORGANIZATION"
        />

      </div>

    </div>
  )
}


/* =====================================================
   ENTITY CARD
===================================================== */

function EntityCard({
  title,
  items = [],
  getName,
  type,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#101413]">

      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

        <h3 className="text-sm font-semibold text-white">
          {title}
        </h3>

        <span className="rounded-md bg-slate-900 px-2 py-1 text-xs text-slate-500">
          {items.length}
        </span>

      </div>

      {items.length === 0 ? (
        <div className="p-5 text-sm text-slate-600">
          No {title.toLowerCase()} found.
        </div>
      ) : (
        <div className="divide-y divide-slate-800">

          {items.map((item) => (
            <div
              key={item.id}
              className="px-5 py-4 transition hover:bg-slate-900/40"
            >

              <div className="text-sm text-slate-200">
                {getName(item)}
              </div>

              {item.confidence !== undefined &&
                item.confidence !== null && (
                  <div className="mt-1 text-xs text-slate-600">
                    AI confidence:{" "}
                    {Math.round(
                      item.confidence * 100
                    )}
                    %
                  </div>
                )}

            </div>
          ))}

        </div>
      )}

    </div>
  )
}


/* =====================================================
   TRANSACTIONS
===================================================== */

function TransactionsPage({ caseId }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchTransactions()
  }, [caseId])

  async function fetchTransactions() {
    try {
      setLoading(true)
      setError("")

      const response = await axios.get(
        `${API_URL}/cases/${caseId}`
      )

      setTransactions(
        response.data.transactions || []
      )
    } catch (err) {
      console.error(err)
      setError("Unable to load transactions")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-slate-500">
        Loading transactions...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-5 text-sm text-red-400">
        {error}
      </div>
    )
  }

  const totalAmount = transactions.reduce(
    (sum, transaction) =>
      sum + Number(transaction.amount || 0),
    0
  )

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-end justify-between gap-4">

        <div>

          <h2 className="text-xl font-semibold text-white">
            Transactions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Financial activity associated with this case.
          </p>

        </div>

        <div className="text-right">

          <div className="text-xs text-slate-600">
            Total Transaction Value
          </div>

          <div className="mt-1 text-lg font-semibold text-white">
            ₹{totalAmount.toLocaleString("en-IN")}
          </div>

        </div>

      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#101413]">

        {transactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-600">
            No transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="border-b border-slate-800 bg-[#0c100f]">

                <tr>

                  <th className="px-5 py-4 text-xs font-medium text-slate-600">
                    Date
                  </th>

                  <th className="px-5 py-4 text-xs font-medium text-slate-600">
                    From
                  </th>

                  <th className="px-5 py-4 text-xs font-medium text-slate-600">
                    To
                  </th>

                  <th className="px-5 py-4 text-xs font-medium text-slate-600">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-xs font-medium text-slate-600">
                    Reference
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-800">

                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="transition hover:bg-slate-900/40"
                  >

                    <td className="px-5 py-4 text-sm text-slate-400">
                      {transaction.date || "—"}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-300">
                      {transaction.from_account}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-300">
                      {transaction.to_account}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-white">
                      ₹
                      {Number(
                        transaction.amount || 0
                      ).toLocaleString("en-IN")}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {transaction.reference || "—"}
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  )
}


/* =====================================================
   DOCUMENTS
===================================================== */

function DocumentsPage({
  caseId,
  onRefresh,
}) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDocuments()
  }, [caseId])

  async function fetchDocuments() {
    try {
      setLoading(true)

      const response = await axios.get(
        `${API_URL}/cases/${caseId}`
      )

      setDocuments(
        response.data.documents || []
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      <div>

        <h2 className="text-xl font-semibold text-white">
          Documents
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Investigation documents associated with this case.
        </p>

      </div>

      <DocumentUpload
        onUploadComplete={() => {
          fetchDocuments()
          onRefresh()
        }}
      />

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#101413]">

        <div className="border-b border-slate-800 px-5 py-4">

          <h3 className="text-sm font-semibold text-white">
            Uploaded Documents
          </h3>

        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">
            No documents uploaded.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">

            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-900/40"
              >

                <div>

                  <div className="text-sm text-slate-200">
                    {document.filename}
                  </div>

                  <div className="mt-1 text-xs text-slate-600">
                    {document.document_type ||
                      "Investigation Document"}
                  </div>

                </div>

                <span className="rounded-md border border-slate-800 px-2 py-1 text-[10px] uppercase text-slate-600">
                  PDF
                </span>

              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  )
}


/* =====================================================
   AI-ASSISTED RISK INDICATOR
===================================================== */

function RiskIndicator({ caseId }) {
  const [risk, setRisk] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (caseId) {
      calculateRisk()
    }
  }, [caseId])

  async function calculateRisk() {
    try {
      setLoading(true)

      const response = await axios.get(
        `${API_URL}/cases/${caseId}/network-analysis`
      )

      const analysis =
        response.data.network_analysis || {}

      let score = 0

      const relationships =
        analysis.total_relationships || 0

      if (relationships >= 3) score += 20
      if (relationships >= 6) score += 15
      if (relationships >= 10) score += 10

      const chains =
        analysis.transaction_chains?.length || 0

      if (chains >= 1) score += 20
      if (chains >= 2) score += 10

      const indicators =
        analysis.transaction_indicators?.length || 0

      if (indicators >= 1) score += 10
      if (indicators >= 2) score += 10

      score = Math.min(score, 100)

      let level = "Low"

      if (score >= 70) {
        level = "High"
      } else if (score >= 40) {
        level = "Medium"
      }

      setRisk({
        score,
        level,
      })

    } catch (error) {
      console.error(error)

      setRisk({
        score: 0,
        level: "Unavailable",
      })

    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#101413] p-5">

        <div className="text-xs text-slate-600">
          AI-Assisted Risk Indicator
        </div>

        <div className="mt-3 text-sm text-slate-500">
          Analyzing network...
        </div>

      </div>
    )
  }

  const score = risk?.score || 0

  let scoreClass = "text-green-400"
  let barClass = "bg-green-500"

  if (score >= 70) {
    scoreClass = "text-red-400"
    barClass = "bg-red-500"
  } else if (score >= 40) {
    scoreClass = "text-yellow-400"
    barClass = "bg-yellow-500"
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-[#101413] p-5">

      <div className="flex items-start justify-between gap-3">

        <div>

          <div className="text-xs text-slate-600">
            AI-Assisted Risk Indicator
          </div>

          <div className="mt-1 text-[10px] text-slate-700">
            Based on observed network and transaction patterns
          </div>

        </div>

        <div className={`text-2xl font-bold ${scoreClass}`}>
          {score}%
        </div>

      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">

        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass}`}
          style={{
            width: `${score}%`,
          }}
        />

      </div>

      <div className="mt-3 flex items-center justify-between">

        <span className={`text-xs font-medium ${scoreClass}`}>
          {risk?.level} Risk Indicator
        </span>

        <span className="text-[10px] text-slate-600">
          Requires investigator review
        </span>

      </div>

    </div>
  )
}


/* =====================================================
   OVERVIEW
===================================================== */

function Overview({
  caseData,
  setActiveTab,
}) {
  return (
    <div className="space-y-6">

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

        <OverviewCard
          label="Case Status"
          value={
            caseData.status ||
            "Under Investigation"
          }
          accent="green"
        />

        <OverviewCard
          label="Case Number"
          value={caseData.case_number}
          accent="white"
        />

        <OverviewCard
          label="Location"
          value={
            caseData.primary_location ||
            "Not available"
          }
          accent="white"
        />

        <OverviewCard
          label="Case ID"
          value={caseData.id}
          accent="white"
        />

        <RiskIndicator
          caseId={caseData.id}
        />

      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        <div className="rounded-xl border border-slate-800 bg-[#101413] p-6">

          <h3 className="font-semibold text-white">
            Investigation Overview
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Review the entities, financial transactions,
            investigation documents, AI extraction results
            and relationship network associated with this case.
          </p>

        </div>

        <div className="rounded-xl border border-slate-800 bg-[#101413] p-6">

          <h3 className="font-semibold text-white">
            Quick Actions
          </h3>

          <div className="mt-4 grid grid-cols-2 gap-3">

            <QuickAction
              label="View Network"
              onClick={() =>
                setActiveTab("network")
              }
            />

            <QuickAction
              label="AI Extraction"
              onClick={() =>
                setActiveTab("ai")
              }
            />

            <QuickAction
              label="Documents"
              onClick={() =>
                setActiveTab("documents")
              }
            />

            <QuickAction
              label="Transactions"
              onClick={() =>
                setActiveTab("transactions")
              }
            />

          </div>

        </div>

      </div>

    </div>
  )
}


/* =====================================================
   NEW CASE MODAL
===================================================== */

function NewCaseModal({
  onClose,
  onCreated,
}) {
  const [caseNumber, setCaseNumber] = useState("")
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [status, setStatus] = useState(
    "Under Investigation"
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function createCase(event) {
    event.preventDefault()

    if (!caseNumber.trim()) {
      setError("Case number is required.")
      return
    }

    try {
      setSaving(true)
      setError("")

      const response = await axios.post(
        `${API_URL}/cases/`,
        {
          case_number: caseNumber.trim(),
          title:
            title.trim() ||
            "Investigation Case",
          status,
          primary_location:
            location.trim() || null,
        }
      )

      onCreated(
        response.data.case ||
        response.data
      )

    } catch (err) {
      console.error(err)

      setError(
        err.response?.data?.detail ||
          "Unable to create case."
      )

    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">

      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#101413] shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">

          <div>

            <h2 className="text-lg font-semibold text-white">
              Create New Case
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Start a new investigation.
            </p>

          </div>

          <button
            onClick={onClose}
            className="text-slate-600 transition hover:text-white"
          >
            ✕
          </button>

        </div>

        <form
          onSubmit={createCase}
          className="space-y-5 p-6"
        >

          <Input
            label="Case Number"
            value={caseNumber}
            onChange={setCaseNumber}
            placeholder="CASE-2026-0048"
          />

          <Input
            label="Case Title"
            value={title}
            onChange={setTitle}
            placeholder="Cyber Fraud Investigation"
          />

          <Input
            label="Primary Location"
            value={location}
            onChange={setLocation}
            placeholder="Indore, Madhya Pradesh"
          />

          <div>

            <label className="mb-2 block text-xs font-medium text-slate-400">
              Status
            </label>

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="w-full rounded-lg border border-slate-800 bg-[#0c100f] px-3 py-3 text-sm text-white outline-none focus:border-slate-600"
            >

              <option>
                Under Investigation
              </option>

              <option>
                Open
              </option>

              <option>
                Under Review
              </option>

              <option>
                Closed
              </option>

            </select>

          </div>

          {error && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 px-5 py-2.5 text-sm text-slate-400 transition hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
            >
              {saving
                ? "Creating..."
                : "Create Case"}
            </button>

          </div>

        </form>

      </div>

    </div>
  )
}


/* =====================================================
   COMPONENTS
===================================================== */

function NavItem({
  icon,
  label,
  active,
  onClick,
  disabled,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
        active
          ? "bg-green-950/40 text-green-400"
          : disabled
          ? "cursor-default text-slate-700"
          : "text-slate-500 hover:bg-slate-900 hover:text-slate-200"
      }`}
    >

      <span className="w-5 text-center text-base">
        {icon}
      </span>

      <span>{label}</span>

    </button>
  )
}


function StatusBadge({ status }) {
  const normalized =
    status.toLowerCase()

  let className =
    "border-slate-700 bg-slate-900 text-slate-500"

  if (
    normalized.includes("open") ||
    normalized.includes("investigation")
  ) {
    className =
      "border-green-800/60 bg-green-950/30 text-green-400"
  }

  if (normalized.includes("review")) {
    className =
      "border-amber-800/60 bg-amber-950/30 text-amber-400"
  }

  if (normalized.includes("closed")) {
    className =
      "border-slate-700 bg-slate-900 text-slate-500"
  }

  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium ${className}`}
    >
      ● {status}
    </span>
  )
}


function OverviewCard({
  label,
  value,
  accent,
}) {
  const colors = {
    green: "text-green-400",
    white: "text-white",
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-[#101413] p-5">

      <div className="text-xs text-slate-600">
        {label}
      </div>

      <div
        className={`mt-3 truncate text-lg font-semibold ${
          colors[accent] || "text-white"
        }`}
      >
        {value}
      </div>

    </div>
  )
}


function QuickAction({
  label,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-slate-800 bg-[#0c100f] px-4 py-3 text-left text-xs text-slate-400 transition hover:border-slate-600 hover:text-white"
    >
      {label}

      <span className="float-right text-slate-600">
        →
      </span>

    </button>
  )
}


function Input({
  label,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>

      <label className="mb-2 block text-xs font-medium text-slate-400">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-800 bg-[#0c100f] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-slate-600"
      />

    </div>
  )
}

export default App