import { useEffect, useCallback, useState, useMemo } from "react"
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
import { investigationApi } from "../api"

/* =====================================================
   ENTITY CONFIGURATION & STYLES
===================================================== */

const ENTITY_CONFIG = {
  PERSON: {
    color: "#22c55e",
    bg: "#062812",
    border: "#15803d",
    icon: "👤",
    label: "Person",
  },
  PHONE: {
    color: "#38bdf8",
    bg: "#082f49",
    border: "#0284c7",
    icon: "📞",
    label: "Phone",
  },
  BANK_ACCOUNT: {
    color: "#fbbf24",
    bg: "#2d2006",
    border: "#d97706",
    icon: "💳",
    label: "Bank Account",
  },
  LOCATION: {
    color: "#c084fc",
    bg: "#260e3a",
    border: "#9333ea",
    icon: "📍",
    label: "Location",
  },
  ORGANIZATION: {
    color: "#fb7185",
    bg: "#330814",
    border: "#e11d48",
    icon: "🏢",
    label: "Organization",
  },
  TRANSACTION: {
    color: "#2dd4bf",
    bg: "#042f2c",
    border: "#0d9488",
    icon: "🔄",
    label: "Transaction",
  },
  UNKNOWN: {
    color: "#94a3b8",
    bg: "#1e293b",
    border: "#475569",
    icon: "❓",
    label: "Unknown",
  },
}

function normalizeType(type) {
  if (!type) return "PERSON"
  const val = String(type).trim().toUpperCase()
  if (val === "BANK" || val === "BANKACCOUNT" || val === "BANK ACCOUNT") return "BANK_ACCOUNT"
  if (val === "ORG") return "ORGANIZATION"
  if (val === "LOC") return "LOCATION"
  return ENTITY_CONFIG[val] ? val : "UNKNOWN"
}

/* =====================================================
   SMART CLUSTERED LAYOUT
===================================================== */

function calculateGraphLayout(nodes, edges) {
  const NODE_WIDTH = 190
  const NODE_HEIGHT = 70
  const X_SPACING = 230
  const Y_SPACING = 120

  const typeGroups = {
    BANK_ACCOUNT: [],
    LOCATION: [],
    ORGANIZATION: [],
    PERSON: [],
    PHONE: [],
    TRANSACTION: [],
    UNKNOWN: [],
  }

  nodes.forEach((n) => {
    const t = normalizeType(n.data?.entityType || n.type)
    if (!typeGroups[t]) typeGroups[t] = []
    typeGroups[t].push(n)
  })

  // Group vertically by role
  const positions = {}
  const groupOrder = [
    { key: "ORGANIZATION", y: 60 },
    { key: "PERSON", y: 220 },
    { key: "PHONE", y: 380 },
    { key: "BANK_ACCOUNT", y: 540 },
    { key: "LOCATION", y: 700 },
    { key: "TRANSACTION", y: 860 },
    { key: "UNKNOWN", y: 1020 },
  ]

  groupOrder.forEach(({ key, y }) => {
    const groupNodes = typeGroups[key] || []
    groupNodes.forEach((node, idx) => {
      positions[node.id] = {
        x: 80 + idx * X_SPACING,
        y: y + (idx % 2 === 1 ? 25 : 0),
      }
    })
  })

  return nodes.map((node) => ({
    ...node,
    position: positions[node.id] || { x: 100, y: 100 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }))
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function NetworkGraph({ caseId }) {
  const [rawGraph, setRawGraph] = useState({ nodes: [], edges: [] })
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("ALL")
  const [selectedNode, setSelectedNode] = useState(null)

  /* ===================================================
     FETCH CASE GRAPH
  =================================================== */
  const loadGraph = useCallback(async () => {
    if (!caseId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError("")
      setSelectedNode(null)

      const response = await investigationApi.getCaseGraph(caseId)
      const graph = response.data?.graph || response.data || {}
      const rawNodes = graph.nodes || []
      const rawEdges = graph.edges || []

      setRawGraph({ nodes: rawNodes, edges: rawEdges })

      // Build xyflow nodes
      const formattedNodes = rawNodes.map((n) => {
        const entityType = normalizeType(n.type)
        const cfg = ENTITY_CONFIG[entityType] || ENTITY_CONFIG.UNKNOWN

        return {
          id: String(n.id),
          type: "default",
          data: {
            label: (
              <div className="flex items-center gap-2.5 p-1">
                <span className="text-base">{cfg.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-white">
                    {n.label || n.name || n.id}
                  </div>
                  <div
                    className="text-[9px] font-bold tracking-wider"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label.toUpperCase()}
                  </div>
                </div>
              </div>
            ),
            entityType,
            rawNode: n,
          },
          style: {
            width: 190,
            minHeight: 65,
            background: cfg.bg,
            border: `1.5px solid ${cfg.border}`,
            borderRadius: "10px",
            boxShadow: `0 4px 15px ${cfg.color}15`,
            color: "#f8fafc",
            cursor: "pointer",
          },
        }
      })

      const laidOutNodes = calculateGraphLayout(formattedNodes, rawEdges)

      // Node lookup map
      const nodeMap = new Map(laidOutNodes.map((node) => [node.id, node]))

      // Build edges
      const formattedEdges = rawEdges
        .map((e, idx) => {
          const src = String(e.source)
          const tgt = String(e.target)
          if (!nodeMap.has(src) || !nodeMap.has(tgt)) return null

          const relLabel = String(e.type || "CONNECTED").replace(/_/g, " ")

          return {
            id: `edge-${idx}-${src}-${tgt}`,
            source: src,
            target: tgt,
            type: "smoothstep",
            animated: relLabel.includes("TRANSFER") || relLabel.includes("USES"),
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 14,
              height: 14,
              color: "#38bdf8",
            },
            label: relLabel,
            labelStyle: {
              fill: "#93c5fd",
              fontSize: 8,
              fontWeight: "600",
            },
            labelBgStyle: {
              fill: "#0c1524",
              fillOpacity: 0.95,
            },
            labelBgPadding: [4, 2],
            style: {
              stroke: "#38bdf8",
              strokeWidth: 1.5,
              opacity: 0.75,
            },
            data: { rawEdge: e },
          }
        })
        .filter(Boolean)

      setNodes(laidOutNodes)
      setEdges(formattedEdges)
    } catch (err) {
      console.error("Network graph error:", err)
      setError(
        err.response?.data?.detail || "Unable to load investigation network."
      )
    } finally {
      setLoading(false)
    }
  }, [caseId, setNodes, setEdges])

  useEffect(() => {
    loadGraph()
  }, [loadGraph])

  /* ===================================================
     FILTER & SEARCH HIGHLIGHTING
  =================================================== */
  useEffect(() => {
    if (!rawGraph.nodes.length) return

    const query = searchQuery.trim().toLowerCase()

    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        const type = n.data?.entityType
        const raw = n.data?.rawNode || {}
        const label = String(raw.label || raw.name || n.id).toLowerCase()

        const matchesType =
          activeFilter === "ALL" || type === activeFilter
        const matchesQuery = !query || label.includes(query)
        const isVisible = matchesType && matchesQuery

        const isSelected = selectedNode && selectedNode.id === n.id
        const cfg = ENTITY_CONFIG[type] || ENTITY_CONFIG.UNKNOWN

        return {
          ...n,
          hidden: !isVisible,
          style: {
            ...n.style,
            border: isSelected
              ? `2.5px solid #ffffff`
              : `1.5px solid ${cfg.border}`,
            boxShadow: isSelected
              ? `0 0 25px ${cfg.color}`
              : `0 4px 15px ${cfg.color}15`,
            opacity: query && !matchesQuery ? 0.3 : 1,
          },
        }
      })
    )
  }, [searchQuery, activeFilter, selectedNode, rawGraph, setNodes])

  /* ===================================================
     NODE CLICK HANDLER
  =================================================== */
  const onNodeClick = useCallback(
    (event, node) => {
      const raw = node.data?.rawNode || {}
      const nodeId = String(node.id)

      // Find neighbor connections
      const connectedEdges = rawGraph.edges.filter(
        (e) => String(e.source) === nodeId || String(e.target) === nodeId
      )

      const neighborIds = new Set(
        connectedEdges.flatMap((e) => [String(e.source), String(e.target)])
      )
      neighborIds.delete(nodeId)

      const neighbors = rawGraph.nodes.filter((n) =>
        neighborIds.has(String(n.id))
      )

      setSelectedNode({
        id: nodeId,
        label: raw.label || raw.name || nodeId,
        type: node.data?.entityType || "UNKNOWN",
        confidence: raw.confidence,
        connections: connectedEdges,
        neighbors,
      })
    },
    [rawGraph]
  )

  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(rawGraph, null, 2))
    const downloadAnchor = document.createElement("a")
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `case_${caseId}_network.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#070b10]">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-slate-800 border-t-emerald-500" />
        <div className="mt-4 text-sm font-medium text-slate-300">
          Reconstructing Crime Network...
        </div>
        <div className="mt-1 text-xs text-slate-600">
          Synthesizing entity nodes, transactions & CDR relationships
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#070b10] p-6 text-center">
        <div className="max-w-md rounded-2xl border border-red-900/60 bg-red-950/20 p-6">
          <div className="text-base font-semibold text-red-400">
            Network Graph Unavailable
          </div>
          <p className="mt-2 text-xs text-slate-400">{error}</p>
          <button
            onClick={loadGraph}
            className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-600"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#070b10]">
      {/* Top Floating Action Bar */}
      <div className="absolute left-5 top-5 z-20 flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entity in network..."
            className="w-64 rounded-xl border border-slate-800 bg-[#0c1219]/90 px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-500 backdrop-blur-md outline-none focus:border-slate-600"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#0c1219]/90 p-1 backdrop-blur-md">
          {["ALL", "PERSON", "PHONE", "BANK_ACCOUNT", "ORGANIZATION", "LOCATION"].map(
            (t) => {
              const active = activeFilter === t
              const cfg = ENTITY_CONFIG[t]
              return (
                <button
                  key={t}
                  onClick={() => setActiveFilter(t)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    active
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t === "ALL" ? "All" : cfg?.label || t}
                </button>
              )
            }
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportJson}
          className="rounded-xl border border-slate-800 bg-[#0c1219]/90 px-3 py-2 text-xs font-medium text-slate-300 backdrop-blur-md transition hover:border-slate-600 hover:text-white"
          title="Export Network Graph JSON"
        >
          ⬇ Export JSON
        </button>
      </div>

      {/* Network Stats Legend */}
      <div className="absolute bottom-5 left-5 z-20 rounded-xl border border-slate-800 bg-[#0c1219]/95 p-3.5 shadow-xl backdrop-blur-md">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Network Topology
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500">Entities: </span>
            <span className="font-semibold text-white">{nodes.length}</span>
          </div>
          <div>
            <span className="text-slate-500">Links: </span>
            <span className="font-semibold text-white">{edges.length}</span>
          </div>
        </div>
      </div>

      {/* Node Inspector Drawer */}
      {selectedNode && (
        <div className="absolute right-5 top-5 bottom-5 z-30 w-84 overflow-y-auto rounded-2xl border border-slate-800 bg-[#0c1219]/98 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div>
              <span
                className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background:
                    ENTITY_CONFIG[selectedNode.type]?.bg || "#1e293b",
                  color:
                    ENTITY_CONFIG[selectedNode.type]?.color || "#94a3b8",
                  border: `1px solid ${
                    ENTITY_CONFIG[selectedNode.type]?.border || "#475569"
                  }`,
                }}
              >
                {selectedNode.type}
              </span>
              <h3 className="mt-2 text-base font-bold text-white break-words">
                {selectedNode.label}
              </h3>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-500 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-800 border-t border-slate-800 text-xs">
            <div className="py-2.5">
              <span className="text-slate-500">Universal ID: </span>
              <span className="font-mono text-slate-300 break-all">
                {selectedNode.id}
              </span>
            </div>
            {selectedNode.confidence !== undefined && (
              <div className="py-2.5">
                <span className="text-slate-500">AI Confidence: </span>
                <span className="font-semibold text-emerald-400">
                  {selectedNode.confidence !== null
                    ? `${Math.round(selectedNode.confidence * 100)}%`
                    : "85% (Heuristic)"}
                </span>
              </div>
            )}
            <div className="py-2.5">
              <span className="text-slate-500">Direct Degrees: </span>
              <span className="font-bold text-white">
                {selectedNode.connections.length} links
              </span>
            </div>
          </div>

          {/* Connected Entities */}
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Connected Associates ({selectedNode.neighbors.length})
            </div>
            <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
              {selectedNode.neighbors.map((nbr) => (
                <div
                  key={nbr.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#141b24] p-2 text-xs"
                >
                  <span className="truncate font-medium text-slate-200">
                    {nbr.label || nbr.name || nbr.id}
                  </span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
                    {nbr.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Relationships Trail */}
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Relationships & Calls
            </div>
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {selectedNode.connections.map((c, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-800 bg-[#101720] p-2 text-[11px]"
                >
                  <div className="text-emerald-400 font-medium">
                    {String(c.type).replace(/_/g, " ")}
                  </div>
                  <div className="mt-0.5 text-slate-400 truncate">
                    {c.source} → {c.target}
                  </div>
                  {c.amount && (
                    <div className="mt-0.5 font-semibold text-amber-400">
                      ₹{Number(c.amount).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.35, minZoom: 0.3, maxZoom: 1.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background variant="dots" gap={24} size={1} color="#1e293b" />
        <Controls
          showInteractive={false}
          style={{ background: "#0c1219", border: "1px solid #1e293b" }}
        />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) =>
            ENTITY_CONFIG[normalizeType(n.data?.entityType)]?.color || "#64748b"
          }
          maskColor="rgba(7, 11, 16, 0.85)"
          style={{
            background: "#0c1219",
            border: "1px solid #1e293b",
            borderRadius: "10px",
          }}
        />
      </ReactFlow>
    </div>
  )
}