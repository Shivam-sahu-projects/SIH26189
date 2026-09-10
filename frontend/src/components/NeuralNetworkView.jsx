import { useEffect, useState, useMemo, useCallback } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  Brain,
  ShieldAlert,
  Search,
  Download,
  Filter,
  Sliders,
  AlertTriangle,
  ChevronRight,
  Phone,
  CreditCard,
  Building2,
  MapPin,
  User,
  Zap,
  ArrowRight,
  HelpCircle,
  FileText,
  Activity,
  Layers,
} from "lucide-react"
import { investigationApi } from "../api"
import { SAMPLE_CASE } from "../utils/sampleCaseData"

/* =====================================================
   ENTITY TYPE CONFIGURATION (White Clean Theme)
===================================================== */
const ENTITY_CONFIG = {
  PERSON: {
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#93c5fd",
    icon: User,
    label: "Person",
  },
  PHONE: {
    color: "#0891b2",
    bg: "#ecfeff",
    border: "#a5f3fc",
    icon: Phone,
    label: "Phone",
  },
  BANK_ACCOUNT: {
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    icon: CreditCard,
    label: "Bank Account",
  },
  LOCATION: {
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    icon: MapPin,
    label: "Location",
  },
  ORGANIZATION: {
    color: "#e11d48",
    bg: "#fff1f2",
    border: "#fecdd3",
    icon: Building2,
    label: "Organization",
  },
  UNKNOWN: {
    color: "#64748b",
    bg: "#f8fafc",
    border: "#cbd5e1",
    icon: HelpCircle,
    label: "Entity",
  },
}

function normalizeType(type) {
  if (!type) return "PERSON"
  const val = String(type).trim().toUpperCase()
  if (val === "BANK" || val === "BANKACCOUNT" || val === "BANK_ACCOUNT" || val.includes("ACC-")) return "BANK_ACCOUNT"
  if (val === "ORG" || val === "ORGANIZATION") return "ORGANIZATION"
  if (val === "LOC" || val === "LOCATION") return "LOCATION"
  if (val === "PHONE" || val.includes("PHONE") || val.startsWith("+")) return "PHONE"
  return ENTITY_CONFIG[val] ? val : "PERSON"
}

/* =====================================================
   AUTOMATED CRIMINAL NEURAL RISK & DOUBT ENGINE
===================================================== */
export function computeNeuralRisks(nodes, edges, transactions = []) {
  const nodeDegrees = {}
  const nodeIncoming = {}
  const nodeOutgoing = {}
  const nodeFinancialVolume = {}

  nodes.forEach((n) => {
    nodeDegrees[n.id] = 0
    nodeIncoming[n.id] = 0
    nodeOutgoing[n.id] = 0
    nodeFinancialVolume[n.id] = 0
  })

  // Compute graph degrees
  edges.forEach((e) => {
    const s = String(e.source)
    const t = String(e.target)
    if (nodeDegrees[s] !== undefined) {
      nodeDegrees[s]++
      nodeOutgoing[s]++
    }
    if (nodeDegrees[t] !== undefined) {
      nodeDegrees[t]++
      nodeIncoming[t]++
    }

    if (e.data?.amount) {
      const amt = Number(e.data.amount) || 0
      if (nodeFinancialVolume[s] !== undefined) nodeFinancialVolume[s] += amt
      if (nodeFinancialVolume[t] !== undefined) nodeFinancialVolume[t] += amt
    }
  })

  // Detect multi-hop transaction chains
  const chains = []
  edges.forEach((e1) => {
    if (e1.type === "TRANSFERRED_TO" || e1.label?.includes("TRANSFER")) {
      edges.forEach((e2) => {
        if (e1.target === e2.source && (e2.type === "TRANSFERRED_TO" || e2.label?.includes("TRANSFER"))) {
          chains.push({ from: e1.source, via: e1.target, to: e2.target })
        }
      })
    }
  })

  // Neural Evaluation for each node
  const riskMap = {}

  nodes.forEach((n) => {
    const id = n.id
    const type = normalizeType(n.data?.entityType || n.type)
    const deg = nodeDegrees[id] || 0
    const inCount = nodeIncoming[id] || 0
    const outCount = nodeOutgoing[id] || 0
    const finVol = nodeFinancialVolume[id] || 0

    let score = 15 // Base baseline
    const reasons = []

    // Factor 1: Synaptic Connectivity (Degree Centrality)
    if (deg >= 5) {
      score += 35
      reasons.push(`Neural Hub: Directly connected to ${deg} associates & conduits`)
    } else if (deg >= 3) {
      score += 25
      reasons.push(`High Synaptic Nexus: ${deg} direct links in criminal network`)
    } else if (deg >= 1) {
      score += 10
      reasons.push(`Direct network associate with ${deg} active link`)
    }

    // Factor 2: Financial Layering & Illicit Volume
    if (finVol >= 400000) {
      score += 35
      reasons.push(`Primary Financial Conduit: Handled ₹${finVol.toLocaleString("en-IN")} in tracked transactions`)
    } else if (finVol >= 150000) {
      score += 25
      reasons.push(`Significant Fund Movement: ₹${finVol.toLocaleString("en-IN")} routed through account`)
    } else if (finVol > 0) {
      score += 15
      reasons.push(`Recorded banking transfer participant: ₹${finVol.toLocaleString("en-IN")}`)
    }

    // Factor 3: Multi-hop Layering / Mule Behavior
    const inChain = chains.find((c) => c.via === id || c.from === id || c.to === id)
    if (inChain) {
      score += 20
      reasons.push("Mule Layering Indicator: Participant in rapid multi-hop funds diversion chain")
    }

    // Factor 4: Telephonic Coordination
    const hasCallNexus = edges.some(
      (e) => (e.source === id || e.target === id) && (e.label?.includes("CONTACT") || e.label?.includes("CALL"))
    )
    if (hasCallNexus) {
      score += 10
      reasons.push("Intercepted communication channel with key syndicate nodes")
    }

    // Cap score at 98%
    score = Math.min(Math.max(score, 12), 98)

    // Categorization
    let doubtLevel = "Low Risk"
    let doubtTag = "INCIDENTAL"
    let haloColor = "#10b981" // Emerald
    let action = "Routine case observation"

    if (score >= 75) {
      doubtLevel = "Critical Suspicion"
      doubtTag = "PRIME SUSPECT"
      haloColor = "#ef4444" // Crimson
      action = "Immediate Section 91 CrPC notice, phone CDR extraction & custodial interrogation"
    } else if (score >= 50) {
      doubtLevel = "High Doubt"
      doubtTag = "KEY CONDUIT"
      haloColor = "#f97316" // Orange
      action = "Freeze related bank accounts and place phone numbers on technical surveillance"
    } else if (score >= 30) {
      doubtLevel = "Moderate Doubt"
      doubtTag = "ASSOCIATE"
      haloColor = "#eab308" // Amber
      action = "Obtain bank KYC verification and establish direct corroborating evidence"
    }

    riskMap[id] = {
      score,
      doubtLevel,
      doubtTag,
      haloColor,
      reasons,
      action,
      connections: deg,
      inCount,
      outCount,
      finVol,
    }
  })

  return riskMap
}

/* =====================================================
   SMART NEURAL / FLOWCHART LAYOUT ALGORITHM
===================================================== */
function calculateNeuralLayout(nodes, edges, mode = "neural") {
  const positions = {}

  if (mode === "neural") {
    // Neural Force & Radial Synaptic Clustered Layout
    const centerX = 480
    const centerY = 340
    const radiusStep = 180

    // Group nodes by type
    const persons = nodes.filter((n) => normalizeType(n.data?.entityType) === "PERSON")
    const phones = nodes.filter((n) => normalizeType(n.data?.entityType) === "PHONE")
    const accounts = nodes.filter((n) => normalizeType(n.data?.entityType) === "BANK_ACCOUNT")
    const others = nodes.filter(
      (n) => !["PERSON", "PHONE", "BANK_ACCOUNT"].includes(normalizeType(n.data?.entityType))
    )

    // Inner Core: Primary Persons (Suspects as Neurons)
    persons.forEach((n, idx) => {
      const angle = (idx / Math.max(persons.length, 1)) * 2 * Math.PI - Math.PI / 2
      const r = persons.length === 1 ? 0 : 130
      positions[n.id] = {
        x: centerX + r * Math.cos(angle) - 100,
        y: centerY + r * Math.sin(angle) - 35,
      }
    })

    // Second Orbit: Phones & Direct Comms
    phones.forEach((n, idx) => {
      const angle = (idx / Math.max(phones.length, 1)) * 2 * Math.PI
      const r = 290
      positions[n.id] = {
        x: centerX + r * Math.cos(angle) - 95,
        y: centerY + r * Math.sin(angle) - 35,
      }
    })

    // Third Orbit: Bank Accounts & Mules
    accounts.forEach((n, idx) => {
      const angle = (idx / Math.max(accounts.length, 1)) * 2 * Math.PI + Math.PI / 4
      const r = 440
      positions[n.id] = {
        x: centerX + r * Math.cos(angle) - 95,
        y: centerY + r * Math.sin(angle) - 35,
      }
    })

    // Outer Periphery: Locations & Orgs
    others.forEach((n, idx) => {
      const angle = (idx / Math.max(others.length, 1)) * 2 * Math.PI + Math.PI / 6
      const r = 580
      positions[n.id] = {
        x: centerX + r * Math.cos(angle) - 95,
        y: centerY + r * Math.sin(angle) - 35,
      }
    })
  } else {
    // Hierarchical Crime Flowchart Mode
    const typeGroups = {
      ORGANIZATION: [],
      PERSON: [],
      PHONE: [],
      BANK_ACCOUNT: [],
      LOCATION: [],
      UNKNOWN: [],
    }

    nodes.forEach((n) => {
      const t = normalizeType(n.data?.entityType)
      if (typeGroups[t]) typeGroups[t].push(n)
      else typeGroups.UNKNOWN.push(n)
    })

    const groupLayers = [
      { key: "ORGANIZATION", y: 60 },
      { key: "PERSON", y: 220 },
      { key: "PHONE", y: 380 },
      { key: "BANK_ACCOUNT", y: 540 },
      { key: "LOCATION", y: 700 },
      { key: "UNKNOWN", y: 860 },
    ]

    groupLayers.forEach(({ key, y }) => {
      const items = typeGroups[key] || []
      const spacing = 240
      const startX = 60
      items.forEach((n, i) => {
        positions[n.id] = {
          x: startX + i * spacing,
          y: y + (i % 2 === 1 ? 25 : 0),
        }
      })
    })
  }

  return nodes.map((n) => ({
    ...n,
    position: positions[n.id] || { x: 200, y: 200 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }))
}

/* =====================================================
   MAIN NEURAL NETWORK VIEW COMPONENT
===================================================== */
export default function NeuralNetworkView({ caseId, caseData, onSelectCase }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [rawNodes, setRawNodes] = useState([])
  const [rawEdges, setRawEdges] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Controls
  const [viewMode, setViewMode] = useState("neural") // "neural" | "flowchart"
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("ALL")
  const [minRiskThreshold, setMinRiskThreshold] = useState(0) // 0 to 100
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  // Risk map computed by neural engine
  const [riskMap, setRiskMap] = useState({})

  /* ===================================================
     FETCH / COMPOSE GRAPH DATA
  =================================================== */
  const loadNetworkData = useCallback(async () => {
    setLoading(true)
    setError("")
    setSelectedNodeId(null)

    try {
      let parsedNodes = []
      let parsedEdges = []

      // If a caseId is provided, try fetching from API
      if (caseId) {
        try {
          const res = await investigationApi.getCaseGraph(caseId)
          const g = res.data?.graph || res.data || {}
          parsedNodes = g.nodes || []
          parsedEdges = g.edges || []
        } catch (apiErr) {
          console.warn("API graph fetch error, using provided caseData or sample fallback:", apiErr)
        }
      }

      // If no nodes from API, construct automatically from caseData or sample
      if (!parsedNodes.length) {
        const sourceData = caseData || SAMPLE_CASE

        // Synthesize nodes
        const nodeMap = new Map()

        ;(sourceData.persons || []).forEach((p) => {
          nodeMap.set(p.name, {
            id: p.name,
            label: p.name,
            type: "PERSON",
            confidence: p.confidence,
          })
        })

        ;(sourceData.phone_numbers || []).forEach((ph) => {
          nodeMap.set(ph.number, {
            id: ph.number,
            label: ph.number,
            type: "PHONE",
          })
        })

        ;(sourceData.bank_accounts || []).forEach((b) => {
          nodeMap.set(b.account_number, {
            id: b.account_number,
            label: b.account_number,
            type: "BANK_ACCOUNT",
          })
        })

        ;(sourceData.locations || []).forEach((l) => {
          nodeMap.set(l.name, {
            id: l.name,
            label: l.name,
            type: "LOCATION",
          })
        })

        ;(sourceData.organizations || []).forEach((o) => {
          nodeMap.set(o.name, {
            id: o.name,
            label: o.name,
            type: "ORGANIZATION",
          })
        })

        // Relationships as Edges
        ;(sourceData.relationships || []).forEach((r, idx) => {
          if (!nodeMap.has(r.source)) {
            nodeMap.set(r.source, { id: r.source, label: r.source, type: "PERSON" })
          }
          if (!nodeMap.has(r.target)) {
            nodeMap.set(r.target, { id: r.target, label: r.target, type: "UNKNOWN" })
          }

          parsedEdges.push({
            id: `edge-rel-${idx}-${r.source}-${r.target}`,
            source: r.source,
            target: r.target,
            type: r.relationship_type || "CONNECTED",
            label: String(r.relationship_type || "CONNECTED").replace(/_/g, " "),
            confidence: r.confidence,
          })
        })

        // Financial Transactions as Animated Conduit Edges
        ;(sourceData.transactions || []).forEach((t, idx) => {
          if (!nodeMap.has(t.from_account)) {
            nodeMap.set(t.from_account, { id: t.from_account, label: t.from_account, type: "BANK_ACCOUNT" })
          }
          if (!nodeMap.has(t.to_account)) {
            nodeMap.set(t.to_account, { id: t.to_account, label: t.to_account, type: "BANK_ACCOUNT" })
          }

          parsedEdges.push({
            id: `edge-txn-${idx}-${t.from_account}-${t.to_account}`,
            source: t.from_account,
            target: t.to_account,
            type: "TRANSFERRED_TO",
            label: `₹${Number(t.amount || 0).toLocaleString("en-IN")}`,
            amount: t.amount,
            date: t.date,
          })
        })

        parsedNodes = Array.from(nodeMap.values())
      }

      setRawNodes(parsedNodes)
      setRawEdges(parsedEdges)

      // Compute neural risk metrics for each node
      const risks = computeNeuralRisks(parsedNodes, parsedEdges)
      setRiskMap(risks)
    } catch (err) {
      console.error("Neural Network load failed:", err)
      setError("Failed to construct criminal neural graph.")
    } finally {
      setLoading(false)
    }
  }, [caseId, caseData])

  useEffect(() => {
    loadNetworkData()
  }, [loadNetworkData])

  /* ===================================================
     BUILD XYFLOW NODES & EDGES ON STATE/LAYOUT CHANGE
  =================================================== */
  useEffect(() => {
    if (!rawNodes.length) return

    // Transform raw nodes to xyflow format with clean white styling & risk glow
    const flowNodes = rawNodes.map((n) => {
      const entityType = normalizeType(n.type)
      const cfg = ENTITY_CONFIG[entityType] || ENTITY_CONFIG.UNKNOWN
      const IconComponent = cfg.icon
      const risk = riskMap[n.id] || { score: 20, doubtLevel: "Low Risk", doubtTag: "INCIDENTAL", haloColor: "#10b981" }

      const isSelected = selectedNodeId === n.id

      return {
        id: String(n.id),
        type: "default",
        data: {
          label: (
            <div className="flex items-center gap-3 p-2">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition"
                style={{
                  backgroundColor: cfg.bg,
                  border: `1.5px solid ${cfg.border}`,
                  color: cfg.color,
                }}
              >
                <IconComponent className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="truncate text-[10px] font-bold tracking-wider"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label.toUpperCase()}
                  </span>
                  <span
                    className="rounded-full px-1.5 py-0.2 text-[9px] font-extrabold"
                    style={{
                      backgroundColor: `${risk.haloColor}15`,
                      color: risk.haloColor,
                    }}
                  >
                    {risk.score}%
                  </span>
                </div>

                <div className="truncate text-xs font-bold text-slate-800">
                  {n.label || n.name || n.id}
                </div>

                <div className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-slate-500">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: risk.haloColor }}
                  />
                  <span>{risk.doubtTag}</span>
                </div>
              </div>
            </div>
          ),
          entityType,
          rawNode: n,
          risk,
        },
        style: {
          width: 215,
          minHeight: 70,
          backgroundColor: "#ffffff",
          border: isSelected ? `2.5px solid #2563eb` : `1.5px solid ${cfg.border}`,
          borderRadius: "14px",
          boxShadow: isSelected
            ? `0 0 0 4px #2563eb25, 0 10px 25px -5px ${risk.haloColor}40`
            : `0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 0 14px -3px ${risk.haloColor}30`,
          cursor: "pointer",
          transition: "all 0.2s ease",
        },
      }
    })

    const laidOutNodes = calculateNeuralLayout(flowNodes, rawEdges, viewMode)
    const nodeMap = new Map(laidOutNodes.map((item) => [item.id, item]))

    // Build flow edges with animated synaptic signals
    const flowEdges = rawEdges
      .map((e, idx) => {
        const src = String(e.source)
        const tgt = String(e.target)
        if (!nodeMap.has(src) || !nodeMap.has(tgt)) return null

        const isTxn = e.type === "TRANSFERRED_TO" || String(e.label).includes("₹")
        const strokeColor = isTxn ? "#f59e0b" : "#3b82f6"

        return {
          id: e.id || `edge-${idx}`,
          source: src,
          target: tgt,
          type: "smoothstep",
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: strokeColor,
          },
          label: e.label || e.type,
          labelStyle: {
            fill: isTxn ? "#b45309" : "#1d4ed8",
            fontSize: 9,
            fontWeight: "700",
          },
          labelBgStyle: {
            fill: "#ffffff",
            fillOpacity: 0.95,
            stroke: strokeColor,
            strokeWidth: 0.5,
          },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
          style: {
            stroke: strokeColor,
            strokeWidth: isTxn ? 2 : 1.5,
            strokeDasharray: isTxn ? "6, 4" : "4, 4",
          },
          data: { rawEdge: e },
        }
      })
      .filter(Boolean)

    setNodes(laidOutNodes)
    setEdges(flowEdges)
  }, [rawNodes, rawEdges, riskMap, viewMode, selectedNodeId, setNodes, setEdges])

  /* ===================================================
     FILTERING & SEARCH HIGHLIGHTING
  =================================================== */
  useEffect(() => {
    if (!nodes.length) return

    const query = searchQuery.trim().toLowerCase()

    setNodes((prev) =>
      prev.map((node) => {
        const type = node.data?.entityType
        const label = String(node.data?.rawNode?.label || node.id).toLowerCase()
        const risk = node.data?.risk || {}
        const score = risk.score || 0

        const matchesType = activeFilter === "ALL" || type === activeFilter
        const matchesQuery = !query || label.includes(query)
        const matchesRisk = score >= minRiskThreshold
        const isVisible = matchesType && matchesQuery && matchesRisk

        const isSelected = selectedNodeId === node.id

        return {
          ...node,
          hidden: !isVisible,
          style: {
            ...node.style,
            opacity: query && !matchesQuery ? 0.25 : 1,
            border: isSelected ? `2.5px solid #2563eb` : node.style.border,
          },
        }
      })
    )
  }, [searchQuery, activeFilter, minRiskThreshold, selectedNodeId, setNodes])

  /* ===================================================
     SELECTION & DETAILS
  =================================================== */
  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id)
  }, [])

  const selectedNodeInfo = useMemo(() => {
    if (!selectedNodeId) return null
    const found = rawNodes.find((n) => String(n.id) === String(selectedNodeId))
    if (!found) return null

    const type = normalizeType(found.type)
    const risk = riskMap[found.id] || {
      score: 20,
      doubtLevel: "Low Risk",
      doubtTag: "INCIDENTAL",
      reasons: ["Peripheral mention"],
      action: "Routine monitoring",
    }

    // Connected neighbors
    const connectedEdges = rawEdges.filter(
      (e) => String(e.source) === String(found.id) || String(e.target) === String(found.id)
    )
    const neighborIds = new Set(connectedEdges.flatMap((e) => [String(e.source), String(e.target)]))
    neighborIds.delete(String(found.id))
    const neighbors = rawNodes.filter((n) => neighborIds.has(String(n.id)))

    return {
      ...found,
      type,
      risk,
      connectedEdges,
      neighbors,
    }
  }, [selectedNodeId, rawNodes, rawEdges, riskMap])

  // Highest Risk Suspects list
  const rankedSuspects = useMemo(() => {
    return rawNodes
      .filter((n) => normalizeType(n.type) === "PERSON" || normalizeType(n.type) === "BANK_ACCOUNT")
      .map((n) => ({
        ...n,
        risk: riskMap[n.id] || { score: 15, doubtLevel: "Low Risk", doubtTag: "INCIDENTAL" },
      }))
      .sort((a, b) => b.risk.score - a.risk.score)
  }, [rawNodes, riskMap])

  const exportNetworkJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify({ nodes: rawNodes, edges: rawEdges, riskAnalysis: riskMap }, null, 2))
    const a = document.createElement("a")
    a.setAttribute("href", dataStr)
    a.setAttribute("download", `INVESTIQ_Neural_Network_${caseId || "Analysis"}.json`)
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-12 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute h-full w-full animate-ping rounded-full bg-blue-400/20" />
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-slate-200 border-t-blue-600" />
          <Brain className="absolute h-5 w-5 text-blue-600" />
        </div>
        <div className="mt-5 text-base font-bold text-slate-900">
          Synthesizing Criminal Neural Network...
        </div>
        <p className="mt-1 text-xs text-slate-500 max-w-sm">
          Auto-reading case entities, evaluating synaptic layering paths, and computing individual suspect risk/doubt indexes.
        </p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50">
      {/* Top Professional Control Bar */}
      <div className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-6 py-3.5 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-inner">
            <button
              onClick={() => setViewMode("neural")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "neural"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Brain className="h-3.5 w-3.5 text-blue-600" />
              <span>Neural Synaptic View</span>
            </button>
            <button
              onClick={() => setViewMode("flowchart")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "flowchart"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-blue-600" />
              <span>Crime Flowchart</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suspect, phone, account..."
              className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {["ALL", "PERSON", "PHONE", "BANK_ACCOUNT", "ORGANIZATION", "LOCATION"].map((t) => {
              const active = activeFilter === t
              const cfg = ENTITY_CONFIG[t]
              return (
                <button
                  key={t}
                  onClick={() => setActiveFilter(t)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {t === "ALL" ? "All" : cfg?.label || t}
                </button>
              )
            })}
          </div>
        </div>

        {/* Risk Threshold & Actions */}
        <div className="flex items-center gap-3">
          {/* Risk Threshold Slider */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
            <Sliders className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[11px] font-medium text-slate-500">Min Risk:</span>
            <input
              type="range"
              min="0"
              max="75"
              step="5"
              value={minRiskThreshold}
              onChange={(e) => setMinRiskThreshold(Number(e.target.value))}
              className="h-1.5 w-20 cursor-pointer accent-blue-600"
            />
            <span className="font-bold text-blue-600">{minRiskThreshold}%</span>
          </div>

          {/* Export JSON */}
          <button
            onClick={exportNetworkJson}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            title="Export full neural network topology with risk calculations"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export Graph</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1">
        {/* Floating Suspect Risk Leaderboard (Left Side) */}
        <div className="absolute left-5 top-5 z-10 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <span className="text-xs font-bold text-slate-900">Neural Risk & Doubt Ranking</span>
            </div>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
              {rankedSuspects.filter((s) => s.risk.score >= 50).length} Flagged
            </span>
          </div>

          <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
            {rankedSuspects.map((s) => {
              const isSelected = selectedNodeId === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedNodeId(s.id)}
                  className={`flex w-full items-center justify-between p-3 text-left transition ${
                    isSelected ? "bg-blue-50/80" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-bold text-slate-900">{s.label || s.id}</span>
                      <span
                        className="rounded px-1.5 py-0.2 text-[9px] font-extrabold uppercase"
                        style={{
                          backgroundColor: `${s.risk.haloColor}15`,
                          color: s.risk.haloColor,
                        }}
                      >
                        {s.risk.doubtTag}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-slate-500">
                      {s.risk.reasons[0] || "Identified in case records"}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className="text-sm font-extrabold"
                      style={{ color: s.risk.haloColor }}
                    >
                      {s.risk.score}%
                    </div>
                    <div className="text-[9px] font-semibold text-slate-400">Risk Score</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Suspect Neural Dossier Drawer (Right Side) */}
        {selectedNodeInfo && (
          <div className="absolute right-5 top-5 bottom-5 z-20 w-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${selectedNodeInfo.risk.haloColor}15`,
                    color: selectedNodeInfo.risk.haloColor,
                    border: `1px solid ${selectedNodeInfo.risk.haloColor}40`,
                  }}
                >
                  {selectedNodeInfo.risk.doubtLevel} • {selectedNodeInfo.risk.doubtTag}
                </span>
                <h3 className="mt-2 text-lg font-extrabold text-slate-900 break-words">
                  {selectedNodeInfo.label || selectedNodeInfo.id}
                </h3>
                <p className="text-xs text-slate-500">Entity Type: {selectedNodeInfo.type}</p>
              </div>

              <button
                onClick={() => setSelectedNodeId(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Neural Suspicion Gauge Card */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-600">Calculated Suspicion / Doubt</div>
                  <div className="mt-1 text-2xl font-black" style={{ color: selectedNodeInfo.risk.haloColor }}>
                    {selectedNodeInfo.risk.score}%
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Synaptic Hub</div>
                  <div className="mt-1 text-sm font-bold text-slate-800">
                    {selectedNodeInfo.connectedEdges.length} Links
                  </div>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${selectedNodeInfo.risk.score}%`,
                    backgroundColor: selectedNodeInfo.risk.haloColor,
                  }}
                />
              </div>
            </div>

            {/* Automated Diagnostic Reasons */}
            <div className="mt-5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Investigative Doubt Evidentiary Reasons</span>
              </div>

              <div className="mt-2.5 space-y-2">
                {selectedNodeInfo.risk.reasons.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-xs text-slate-700"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Action */}
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900">
              <div className="font-bold flex items-center gap-1.5 text-blue-700">
                <Activity className="h-4 w-4 text-blue-600" />
                <span>Recommended Investigative Action:</span>
              </div>
              <p className="mt-1.5 text-slate-700 leading-relaxed font-medium">
                {selectedNodeInfo.risk.action}
              </p>
            </div>

            {/* Connected Associates / Conduits */}
            <div className="mt-5">
              <div className="text-xs font-bold text-slate-900">
                Connected Nodes & Conduits ({selectedNodeInfo.neighbors.length})
              </div>
              <div className="mt-2 space-y-2 max-h-44 overflow-y-auto">
                {selectedNodeInfo.neighbors.map((nbr) => (
                  <div
                    key={nbr.id}
                    onClick={() => setSelectedNodeId(nbr.id)}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition"
                  >
                    <span className="font-semibold text-slate-800 truncate">{nbr.label || nbr.id}</span>
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {nbr.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ReactFlow Interactive Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.25, minZoom: 0.3, maxZoom: 1.5 }}
          minZoom={0.2}
          maxZoom={2.5}
          nodesDraggable={true}
          nodesConnectable={false}
        >
          <Background variant="dots" gap={20} size={1.2} color="#cbd5e1" />
          <Controls
            showInteractive={false}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => {
              const r = riskMap[n.id]
              return r?.haloColor || "#94a3b8"
            }}
            maskColor="rgba(241, 245, 249, 0.7)"
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          />
        </ReactFlow>
      </div>
    </div>
  )
}
