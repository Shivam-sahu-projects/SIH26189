import {
  useEffect,
  useCallback,
  useState,
} from "react"

import axios from "axios"

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


const API_URL = "https://sih26189.onrender.com"


/* =====================================================
   GRAPH SIZE
===================================================== */

const NODE_WIDTH = 205
const NODE_HEIGHT = 78

const X_GAP = 85
const Y_GAP = 105


/* =====================================================
   ENTITY STYLES
===================================================== */

function getEntityStyle(type) {
  const styles = {
    PERSON: {
      color: "#22c55e",
      icon: "●",
    },

    PHONE: {
      color: "#3b82f6",
      icon: "☎",
    },

    BANK_ACCOUNT: {
      color: "#fbbf24",
      icon: "▣",
    },

    LOCATION: {
      color: "#a855f7",
      icon: "◆",
    },

    ORGANIZATION: {
      color: "#f43f5e",
      icon: "▦",
    },

    TRANSACTION: {
      color: "#14b8a6",
      icon: "↔",
    },
  }

  return (
    styles[type] || {
      color: "#64748b",
      icon: "●",
    }
  )
}


/* =====================================================
   NORMALIZE ENTITY TYPE
===================================================== */

function normalizeType(type) {
  if (!type) return "PERSON"

  const value = String(type)
    .trim()
    .toUpperCase()

  if (
    value === "BANK" ||
    value === "BANKACCOUNT" ||
    value === "BANK ACCOUNT"
  ) {
    return "BANK_ACCOUNT"
  }

  if (value === "ORG") {
    return "ORGANIZATION"
  }

  return value
}


/* =====================================================
   CUSTOM INVESTIGATION LAYOUT
===================================================== */

function createInvestigationLayout(nodes) {
  const groups = {
    BANK_ACCOUNT: [],
    LOCATION: [],
    ORGANIZATION: [],
    PERSON: [],
    TRANSACTION: [],
    PHONE: [],
  }

  nodes.forEach((node) => {
    const type =
      normalizeType(
        node.data?.entityType
      )

    if (!groups[type]) {
      groups[type] = []
    }

    groups[type].push(node)
  })


  /*
   * Layout designed to look like
   * an investigation/network dashboard.
   *
   * Row 1:
   * Bank Accounts + Locations
   *
   * Row 2:
   * Organizations + Persons + Transactions
   *
   * Row 3:
   * Phones + Accounts
   */

  const positions = {}

  let index = 0


  /* -----------------------------------------------
     BANK ACCOUNTS
  ------------------------------------------------ */

  groups.BANK_ACCOUNT.forEach(
    (node, i) => {
      positions[node.id] = {
        x:
          70 +
          i *
            (NODE_WIDTH + X_GAP),

        y: 90,
      }
    }
  )


  /* -----------------------------------------------
     LOCATIONS
  ------------------------------------------------ */

  groups.LOCATION.forEach(
    (node, i) => {
      positions[node.id] = {
        x:
          350 +
          i *
            (NODE_WIDTH + X_GAP),

        y: 90,
      }
    }
  )


  /* -----------------------------------------------
     ORGANIZATIONS
  ------------------------------------------------ */

  groups.ORGANIZATION.forEach(
    (node, i) => {
      positions[node.id] = {
        x:
          70 +
          i *
            (NODE_WIDTH + X_GAP),

        y: 290,
      }
    }
  )


  /* -----------------------------------------------
     PERSONS
  ------------------------------------------------ */

  groups.PERSON.forEach(
    (node, i) => {
      positions[node.id] = {
        x:
          380 +
          i *
            (NODE_WIDTH + X_GAP),

        y: 290,
      }
    }
  )


  /* -----------------------------------------------
     TRANSACTIONS
  ------------------------------------------------ */

  groups.TRANSACTION.forEach(
    (node, i) => {
      positions[node.id] = {
        x:
          700 +
          i *
            (NODE_WIDTH + X_GAP),

        y: 290,
      }
    }
  )


  /* -----------------------------------------------
     PHONES
  ------------------------------------------------ */

  groups.PHONE.forEach(
    (node, i) => {
      positions[node.id] = {
        x:
          380 +
          i *
            (NODE_WIDTH + X_GAP),

        y: 500,
      }
    }
  )


  /*
   * Fallback for unknown entities
   */

  nodes.forEach((node, i) => {
    if (!positions[node.id]) {
      positions[node.id] = {
        x:
          80 +
          (i % 5) *
            (NODE_WIDTH + X_GAP),

        y:
          700 +
          Math.floor(i / 5) *
            Y_GAP,
      }
    }
  })


  return nodes.map((node) => ({
    ...node,

    position:
      positions[node.id],

    sourcePosition:
      Position.Right,

    targetPosition:
      Position.Left,
  }))
}


/* =====================================================
   DETERMINE EDGE DIRECTION
===================================================== */

function getEdgePositions(
  sourceNode,
  targetNode
) {
  if (
    !sourceNode ||
    !targetNode
  ) {
    return {
      sourcePosition:
        Position.Right,

      targetPosition:
        Position.Left,
    }
  }


  const sourceX =
    sourceNode.position.x

  const sourceY =
    sourceNode.position.y

  const targetX =
    targetNode.position.x

  const targetY =
    targetNode.position.y


  const dx =
    targetX - sourceX

  const dy =
    targetY - sourceY


  /*
   * Mostly horizontal
   */

  if (
    Math.abs(dx) >
    Math.abs(dy)
  ) {
    return {
      sourcePosition:
        dx >= 0
          ? Position.Right
          : Position.Left,

      targetPosition:
        dx >= 0
          ? Position.Left
          : Position.Right,
    }
  }


  /*
   * Mostly vertical
   */

  return {
    sourcePosition:
      dy >= 0
        ? Position.Bottom
        : Position.Top,

    targetPosition:
      dy >= 0
        ? Position.Top
        : Position.Bottom,
  }
}


/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function NetworkGraph({
  caseId,
}) {
  const [
    nodes,
    setNodes,
    onNodesChange,
  ] = useNodesState([])

  const [
    edges,
    setEdges,
    onEdgesChange,
  ] = useEdgesState([])


  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState("")


  /* ===================================================
     LOAD NETWORK
  =================================================== */

  const loadGraph =
    useCallback(
      async () => {
        if (!caseId) {
          setLoading(false)
          return
        }


        try {
          setLoading(true)
          setError("")


          /*
           * Sync Supabase → Neo4j
           */

          await axios.post(
            `${API_URL}/cases/${caseId}/sync-neo4j`
          )


          /*
           * Get graph
           */

          const response =
            await axios.get(
              `${API_URL}/cases/${caseId}/neo4j-graph`
            )


          const graph =
            response.data?.graph || {}


          const rawNodes =
            graph.nodes || []


          const rawEdges =
            graph.edges || []


          /* =========================================
             CREATE NODES
          ========================================= */

          let graphNodes =
            rawNodes.map(
              (node) => {
                const entityType =
                  normalizeType(
                    node.type
                  )

                const entityStyle =
                  getEntityStyle(
                    entityType
                  )


                return {
                  id:
                    String(node.id),

                  type:
                    "default",


                  data: {
                    entityType,

                    label: (
                      <div
                        style={{
                          width:
                            "100%",
                        }}
                      >

                        {/* TOP */}

                        <div
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap:
                              "10px",
                          }}
                        >

                          <span
                            style={{
                              color:
                                entityStyle.color,

                              fontSize:
                                "18px",

                              fontWeight:
                                "700",

                              flexShrink:
                                0,
                            }}
                          >
                            {
                              entityStyle.icon
                            }
                          </span>


                          <span
                            style={{
                              color:
                                "#f8fafc",

                              fontSize:
                                "12px",

                              fontWeight:
                                "600",

                              whiteSpace:
                                "nowrap",

                              overflow:
                                "hidden",

                              textOverflow:
                                "ellipsis",
                            }}
                          >
                            {
                              node.label
                            }
                          </span>

                        </div>


                        {/* TYPE */}

                        <div
                          style={{
                            marginTop:
                              "7px",

                            color:
                              entityStyle.color,

                            fontSize:
                              "9px",

                            fontWeight:
                              "700",

                            letterSpacing:
                              "0.08em",
                          }}
                        >
                          {
                            entityType
                          }
                        </div>

                      </div>
                    ),
                  },


                  style: {
                    width:
                      NODE_WIDTH,

                    minHeight:
                      NODE_HEIGHT,

                    background:
                      "#101513",

                    border:
                      `1.8px solid ${entityStyle.color}`,

                    borderRadius:
                      "10px",

                    boxShadow:
                      `0 0 18px ${entityStyle.color}20`,

                    padding:
                      "13px 15px",

                    color:
                      "#f8fafc",
                  },


                  sourcePosition:
                    Position.Right,

                  targetPosition:
                    Position.Left,
                }
              }
            )


          /*
           * First create custom positions.
           */

          graphNodes =
            createInvestigationLayout(
              graphNodes
            )


          /* =========================================
             NODE MAP
          ========================================= */

          const nodeMap =
            new Map()

          graphNodes.forEach(
            (node) => {
              nodeMap.set(
                node.id,
                node
              )
            }
          )


          /* =========================================
             CREATE EDGES
          ========================================= */

          const graphEdges =
            rawEdges
              .map(
                (
                  edge,
                  index
                ) => {
                  const source =
                    String(
                      edge.source
                    )

                  const target =
                    String(
                      edge.target
                    )


                  const sourceNode =
                    nodeMap.get(
                      source
                    )

                  const targetNode =
                    nodeMap.get(
                      target
                    )


                  if (
                    !sourceNode ||
                    !targetNode
                  ) {
                    return null
                  }


                  const positions =
                    getEdgePositions(
                      sourceNode,
                      targetNode
                    )


                  const relationship =
                    String(
                      edge.type ||
                        "CONNECTED"
                    )
                      .replaceAll(
                        "_",
                        " "
                      )
                      .toUpperCase()


                  return {
                    id:
                      `edge-${index}-${source}-${target}`,


                    source,

                    target,


                    type:
                      "smoothstep",


                    sourcePosition:
                      positions.sourcePosition,

                    targetPosition:
                      positions.targetPosition,


                    animated:
                      false,


                    markerEnd: {
                      type:
                        MarkerType.ArrowClosed,

                      width:
                        16,

                      height:
                        16,

                      color:
                        "#7da9e8",
                    },


                    label:
                      relationship,


                    labelStyle: {
                      fill:
                        "#8eb6ed",

                      fontSize:
                        8,

                      fontWeight:
                        "700",

                      letterSpacing:
                        "0.02em",
                    },


                    labelBgStyle: {
                      fill:
                        "#07101d",

                      fillOpacity:
                        0.96,
                    },


                    labelBgPadding:
                      [
                        5,
                        3,
                      ],


                    style: {
                      stroke:
                        "#7da9e8",

                      strokeWidth:
                        1.5,
                    },


                    interactionWidth:
                      25,
                  }
                }
              )
              .filter(Boolean)


          setNodes(
            graphNodes
          )

          setEdges(
            graphEdges
          )

        } catch (err) {
          console.error(
            "Network graph error:",
            err
          )


          setError(
            err.response?.data
              ?.detail ||
              "Unable to load investigation network."
          )
        } finally {
          setLoading(false)
        }
      },
      [
        caseId,
        setNodes,
        setEdges,
      ]
    )


  /* ===================================================
     LOAD WHEN CASE CHANGES
  =================================================== */

  useEffect(() => {
    loadGraph()
  }, [loadGraph])


  /* ===================================================
     LOADING
  =================================================== */

  if (loading) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          background:
            "#080d16",
        }}
      >

        <div
          style={{
            textAlign:
              "center",
          }}
        >

          <div
            style={{
              width:
                "34px",

              height:
                "34px",

              margin:
                "0 auto 15px",

              border:
                "3px solid #1e293b",

              borderTopColor:
                "#22c55e",

              borderRadius:
                "50%",

              animation:
                "spin 1s linear infinite",
            }}
          />

          <div
            style={{
              color:
                "#cbd5e1",

              fontSize:
                "14px",

              fontWeight:
                "600",
            }}
          >
            Building investigation network...
          </div>


          <div
            style={{
              color:
                "#64748b",

              fontSize:
                "11px",

              marginTop:
                "5px",
            }}
          >
            Connecting entities and relationships
          </div>

        </div>

      </div>
    )
  }


  /* ===================================================
     ERROR
  =================================================== */

  if (error) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          background:
            "#080d16",
        }}
      >

        <div
          style={{
            width:
              "380px",

            padding:
              "25px",

            textAlign:
              "center",

            border:
              "1px solid #7f1d1d",

            borderRadius:
              "12px",

            background:
              "#160d0d",
          }}
        >

          <div
            style={{
              color:
                "#f87171",

              fontSize:
                "17px",

              fontWeight:
                "700",
            }}
          >
            Network unavailable
          </div>


          <div
            style={{
              color:
                "#94a3b8",

              fontSize:
                "12px",

              marginTop:
                "10px",

              lineHeight:
                "1.6",
            }}
          >
            {error}
          </div>


          <button
            onClick={
              loadGraph
            }
            style={{
              marginTop:
                "18px",

              padding:
                "9px 18px",

              border:
                "none",

              borderRadius:
                "7px",

              background:
                "#166534",

              color:
                "white",

              cursor:
                "pointer",

              fontSize:
                "12px",

              fontWeight:
                "600",
            }}
          >
            Retry
          </button>

        </div>

      </div>
    )
  }


  /* ===================================================
     MAIN NETWORK
  =================================================== */

  return (
    <div
      style={{
        position:
          "relative",

        width:
          "100%",

        height:
          "100%",

        background:
          "#080d16",

        overflow:
          "hidden",
      }}
    >

      {/* =================================================
          NETWORK HEADER
      ================================================= */}

      <div
        style={{
          position:
            "absolute",

          top:
            "20px",

          left:
            "20px",

          zIndex:
            20,

          minWidth:
            "300px",

          padding:
            "17px 20px",

          background:
            "rgba(8,15,25,0.94)",

          border:
            "1px solid #173554",

          borderRadius:
            "12px",

          boxShadow:
            "0 8px 25px rgba(0,0,0,0.3)",

          backdropFilter:
            "blur(8px)",
        }}
      >

        <div
          style={{
            color:
              "#f8fafc",

            fontSize:
              "17px",

            fontWeight:
              "700",

            letterSpacing:
              "-0.01em",
          }}
        >
          Investigation Network
        </div>


        <div
          style={{
            display:
              "flex",

            gap:
              "35px",

            marginTop:
              "10px",

            color:
              "#8eb6ed",

            fontSize:
              "12px",
          }}
        >

          <span>
            Nodes:{" "}
            <strong
              style={{
                color:
                  "#f1f5f9",
              }}
            >
              {nodes.length}
            </strong>
          </span>


          <span>
            Connections:{" "}
            <strong
              style={{
                color:
                  "#f1f5f9",
              }}
            >
              {edges.length}
            </strong>
          </span>

        </div>

      </div>


      {/* =================================================
          ENTITY LEGEND
      ================================================= */}

      <div
        style={{
          position:
            "absolute",

          bottom:
            "20px",

          left:
            "20px",

          zIndex:
            20,

          width:
            "185px",

          padding:
            "17px",

          background:
            "rgba(8,15,25,0.95)",

          border:
            "1px solid #173554",

          borderRadius:
            "12px",

          boxShadow:
            "0 8px 25px rgba(0,0,0,0.3)",
        }}
      >

        <div
          style={{
            color:
              "#8eb6ed",

            fontSize:
              "11px",

            fontWeight:
              "700",

            textTransform:
              "uppercase",

            letterSpacing:
              "0.06em",

            marginBottom:
              "14px",
          }}
        >
          Entity Types
        </div>


        <Legend
          color="#22c55e"
          label="Person"
        />

        <Legend
          color="#3b82f6"
          label="Phone"
        />

        <Legend
          color="#fbbf24"
          label="Bank Account"
        />

        <Legend
          color="#a855f7"
          label="Location"
        />

        <Legend
          color="#f43f5e"
          label="Organization"
        />

        <Legend
          color="#14b8a6"
          label="Transaction"
        />

      </div>


      {/* =================================================
          REACT FLOW
      ================================================= */}

      <ReactFlow
        nodes={
          nodes
        }

        edges={
          edges
        }

        onNodesChange={
          onNodesChange
        }

        onEdgesChange={
          onEdgesChange
        }


        fitView


        fitViewOptions={{
          padding:
            0.28,

          minZoom:
            0.35,

          maxZoom:
            1.25,
        }}


        minZoom={
          0.2
        }

        maxZoom={
          2
        }


        nodesDraggable={
          true
        }

        nodesConnectable={
          false
        }


        defaultEdgeOptions={{
          type:
            "smoothstep",

          markerEnd: {
            type:
              MarkerType.ArrowClosed,

            width:
              16,

            height:
              16,

            color:
              "#7da9e8",
          },
        }}
      >

        {/* BACKGROUND */}

        <Background
          variant="dots"
          gap={22}
          size={1}
          color="#243244"
        />


        {/* CONTROLS */}

        <Controls
          showInteractive={
            false
          }

          style={{
            background:
              "#0c1522",

            border:
              "1px solid #173554",
          }}
        />


        {/* MINIMAP */}

        <MiniMap
          pannable
          zoomable

          nodeColor={
            (node) => {
              const type =
                normalizeType(
                  node.data
                    ?.entityType
                )

              return getEntityStyle(
                type
              ).color
            }
          }

          maskColor="rgba(4,9,15,0.78)"

          style={{
            background:
              "#0b1320",

            border:
              "1px solid #173554",

            borderRadius:
              "8px",
          }}
        />

      </ReactFlow>

    </div>
  )
}


/* =====================================================
   LEGEND ITEM
===================================================== */

function Legend({
  color,
  label,
}) {
  return (
    <div
      style={{
        display:
          "flex",

        alignItems:
          "center",

        gap:
          "10px",

        marginBottom:
          "10px",
      }}
    >

      <span
        style={{
          width:
            "13px",

          height:
            "13px",

          borderRadius:
            "50%",

          background:
            color,

          boxShadow:
            `0 0 8px ${color}88`,
        }}
      />


      <span
        style={{
          color:
            "#cbd5e1",

          fontSize:
            "12px",
        }}
      >
        {label}
      </span>

    </div>
  )
}