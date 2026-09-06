import logging
from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.services.neo4j_service import Neo4jService
from app.services.network_analysis.neo4j_analysis import Neo4jAnalysis
from app.services.network_analyzer import analyze_network
from app.routes.cases import get_case_graph

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/network",
    tags=["Network Analysis"]
)


@router.get("/{case_id}")
def get_network(case_id: int):
    """
    Get network graph. Tries Neo4j if available, otherwise falls back to
    the Supabase-backed network graph builder.
    """
    try:
        neo4j = Neo4jService()
        try:
            return neo4j.get_graph(case_id)
        finally:
            neo4j.close()
    except Exception as err:
        logger.warning("Neo4j unavailable (%s), falling back to Supabase graph", err)
        graph = get_case_graph(case_id)
        return {
            "status": "success",
            "case_id": case_id,
            "source": "supabase_fallback",
            "nodes": graph.get("nodes", []),
            "edges": graph.get("edges", [])
        }


@router.get("/{case_id}/centrality")
def get_centrality(case_id: int):
    """
    Get degree centrality. Tries Neo4j, falls back to Python network analyzer.
    """
    try:
        analysis = Neo4jAnalysis()
        try:
            return analysis.degree_centrality(case_id)
        finally:
            analysis.close()
    except Exception as err:
        logger.warning("Neo4j unavailable (%s), falling back to Python analysis", err)
        relationships = (
            supabase.table("relationships").select("*").eq("case_id", case_id).execute().data or []
        )
        transactions = (
            supabase.table("transactions").select("*").eq("case_id", case_id).execute().data or []
        )
        result = analyze_network(relationships, transactions)
        return {
            "status": "success",
            "case_id": case_id,
            "source": "python_fallback",
            "centrality": result.get("central_entities", [])
        }


@router.get("/{case_id}/bridges")
def get_bridges(case_id: int):
    """
    Get bridge entities. Tries Neo4j, falls back to Python analysis.
    """
    try:
        analysis = Neo4jAnalysis()
        try:
            return analysis.bridge_entities(case_id)
        finally:
            analysis.close()
    except Exception as err:
        logger.warning("Neo4j unavailable (%s), falling back to Python analysis", err)
        relationships = (
            supabase.table("relationships").select("*").eq("case_id", case_id).execute().data or []
        )
        transactions = (
            supabase.table("transactions").select("*").eq("case_id", case_id).execute().data or []
        )
        result = analyze_network(relationships, transactions)
        return {
            "status": "success",
            "case_id": case_id,
            "source": "python_fallback",
            "bridges": result.get("transaction_chains", [])
        }


@router.get("/{case_id}/communities")
def get_communities(case_id: int):
    """
    Get communities. Tries Neo4j, falls back to Python analysis.
    """
    try:
        analysis = Neo4jAnalysis()
        try:
            return analysis.communities(case_id)
        finally:
            analysis.close()
    except Exception as err:
        logger.warning("Neo4j unavailable (%s), falling back to Python analysis", err)
        relationships = (
            supabase.table("relationships").select("*").eq("case_id", case_id).execute().data or []
        )
        transactions = (
            supabase.table("transactions").select("*").eq("case_id", case_id).execute().data or []
        )
        result = analyze_network(relationships, transactions)
        return {
            "status": "success",
            "case_id": case_id,
            "source": "python_fallback",
            "indicators": result.get("investigative_indicators", [])
        }