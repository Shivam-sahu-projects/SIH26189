from fastapi import APIRouter, HTTPException
from app.services.neo4j_service import Neo4jService
from app.services.network_analysis.neo4j_analysis import Neo4jAnalysis

router = APIRouter(
    prefix="/network",
    tags=["Network Analysis"]
)


@router.get("/{case_id}")
def get_network(case_id: int):
    neo4j = Neo4jService()
    try:
        return neo4j.get_graph(case_id)
    finally:
        neo4j.close()


@router.get("/{case_id}/centrality")
def get_centrality(case_id: int):
    analysis = Neo4jAnalysis()
    try:
        return analysis.degree_centrality(case_id)
    finally:
        analysis.close()


@router.get("/{case_id}/bridges")
def get_bridges(case_id: int):
    analysis = Neo4jAnalysis()
    try:
        return analysis.bridge_entities(case_id)
    finally:
        analysis.close()


@router.get("/{case_id}/communities")
def get_communities(case_id: int):
    analysis = Neo4jAnalysis()
    try:
        return analysis.communities(case_id)
    finally:
        analysis.close()