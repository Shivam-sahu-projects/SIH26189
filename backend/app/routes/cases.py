from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.database import supabase
from app.services.network_analysis.neo4j_analysis import Neo4jAnalysis
from app.services.network_analyzer import analyze_network
from app.services.network_model import (
    InvestigationNetwork,
    NetworkEntity,
    NetworkRelationship,
    NetworkTransaction,
)
from app.services.neo4j_service import Neo4jService
from app.services.network_analysis.graph_builder import build_graph
from app.services.network_analysis.neo4j_sync import sync_network_to_neo4j


router = APIRouter(
    prefix="/cases",
    tags=["Cases"]
)


# =========================================================
# Create Case Request Model
# =========================================================

class CreateCaseRequest(BaseModel):
    case_number: str
    title: str
    primary_location: Optional[str] = None
    status: str = "Under Investigation"


# =========================================================
# Network Intelligence
# =========================================================

@router.get("/{case_id}/network-intelligence")
def network_intelligence(case_id: int):

    analyzer = Neo4jAnalysis()

    try:
        degree = analyzer.degree_centrality(case_id)
        bridges = analyzer.bridge_entities(case_id)
        communities = analyzer.communities(case_id)

        return {
            "status": "success",
            "case_id": case_id,
            "analysis": {
                "most_connected": degree,
                "bridge_entities": bridges,
                "communities": communities
            }
        }

    finally:
        analyzer.close()


# =========================================================
# Sync Case To Neo4j
# =========================================================

@router.post("/{case_id}/sync-neo4j")
def sync_case_neo4j(case_id: int):

    case_response = (
        supabase
        .table("cases")
        .select("id")
        .eq("id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail=f"Case with ID {case_id} not found"
        )

    result = sync_network_to_neo4j(case_id)

    return {
        "status": "success",
        "case_id": case_id,
        "neo4j_sync": result
    }


# =========================================================
# Neo4j Graph
# =========================================================

@router.get("/{case_id}/neo4j-graph")
def get_neo4j_graph(case_id: int):

    neo4j = Neo4jService()

    try:
        graph = neo4j.get_graph(case_id)

        return {
            "status": "success",
            "case_id": case_id,
            "graph": graph
        }

    finally:
        neo4j.close()


# =========================================================
# Create New Case
# =========================================================

@router.post("/")
def create_case(case: CreateCaseRequest):

    case_number = case.case_number.strip()
    title = case.title.strip()

    if not case_number:
        raise HTTPException(
            status_code=400,
            detail="Case number is required"
        )

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Case title is required"
        )

    existing = (
        supabase
        .table("cases")
        .select("id")
        .eq("case_number", case_number)
        .execute()
    )

    if existing.data:
        raise HTTPException(
            status_code=409,
            detail="A case with this case number already exists"
        )

    response = (
        supabase
        .table("cases")
        .insert({
            "case_number": case_number,
            "title": title,
            "primary_location": case.primary_location,
            "status": case.status
        })
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=500,
            detail="Failed to create case"
        )

    return {
        "status": "success",
        "message": "Case created successfully",
        "case": response.data[0]
    }


# =========================================================
# Get All Cases
# =========================================================

@router.get("/")
def get_cases():

    response = (
        supabase
        .table("cases")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    return {
        "status": "success",
        "count": len(response.data),
        "cases": response.data
    }


# =========================================================
# Search Cases
# =========================================================

@router.get("/search")
def search_cases(query: str):

    query = query.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty"
        )

    response = (
        supabase
        .table("cases")
        .select("*")
        .or_(
            f"case_number.ilike.%{query}%,"
            f"title.ilike.%{query}%,"
            f"status.ilike.%{query}%,"
            f"primary_location.ilike.%{query}%"
        )
        .order("created_at", desc=True)
        .execute()
    )

    return {
        "status": "success",
        "query": query,
        "count": len(response.data),
        "cases": response.data
    }


# =========================================================
# Entity Type Helper
# =========================================================

def get_entity_type(entity):

    entity = str(entity).strip()

    if entity.upper().startswith("ACC-"):
        return "BANK_ACCOUNT"

    if entity.upper().startswith("TXN-"):
        return "TRANSACTION"

    if entity.isdigit() and len(entity) == 10:
        return "PHONE"

    locations = [
        "Vijay Nagar, Indore",
        "Palasia, Indore",
        "Bhopal, Madhya Pradesh",
        "Bhawarkua, Indore",
        "Rau, Indore",
        "Bengali Square, Indore",
        "Scheme No. 54, Indore",
        "MG Road, Indore",
        "Airport Road, Indore",
        "Ujjain, Madhya Pradesh",
        "Dewas, Madhya Pradesh",
        "Pithampur, Madhya Pradesh",
        "Gurugram, Haryana",
        "New Delhi, Delhi",
        "Jaipur, Rajasthan"
    ]

    if entity in locations:
        return "LOCATION"

    organizations = [
        "Orion Logistics Pvt. Ltd.",
        "Vertex Trading Pvt. Ltd.",
        "BlueSky Financial Services LLP",
        "Central Distribution Solutions Pvt. Ltd.",
        "Nexora Technologies Pvt. Ltd.",
        "Apex Commercial Services LLP"
    ]

    if entity in organizations:
        return "ORGANIZATION"

    return "PERSON"


# =========================================================
# Get Case Details
# =========================================================

@router.get("/{case_id}")
def get_case_details(case_id: int):

    case_response = (
        supabase
        .table("cases")
        .select("*")
        .eq("id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail=f"Case with ID {case_id} not found"
        )

    case = case_response.data[0]

    documents = (
        supabase
        .table("documents")
        .select("*")
        .eq("case_id", case_id)
        .execute()
    ).data

    persons = (
        supabase
        .table("persons")
        .select("*")
        .eq("case_id", case_id)
        .execute()
    ).data

    phone_numbers = (
        supabase
        .table("phone_numbers")
        .select("*")
        .eq("case_id", case_id)
        .execute()
    ).data

    bank_accounts = (
        supabase
        .table("bank_accounts")
        .select("*")
        .eq("case_id", case_id)
        .execute()
    ).data

    locations = (
        supabase
        .table("locations")
        .select("*")
        .eq("case_id", case_id)
        .execute()
    ).data

    organizations = (
        supabase
        .table("organizations")
        .select("*")
        .eq("case_id", case_id)
        .execute()
    ).data

    relationships = (
        supabase
        .table("relationships")
        .select("*")
        .eq("case_id", case_id)
        .execute()
    ).data

    transactions = (
        supabase
        .table("transactions")
        .select("*")
        .eq("case_id", case_id)
        .execute()
    ).data

    return {
        "status": "success",
        "case": case,
        "documents": documents,
        "persons": persons,
        "phone_numbers": phone_numbers,
        "bank_accounts": bank_accounts,
        "locations": locations,
        "organizations": organizations,
        "relationships": relationships,
        "transactions": transactions
    }


# =========================================================
# Pending Review Items
# =========================================================

@router.get("/{case_id}/review")
def get_review_items(case_id: int):

    case_response = (
        supabase
        .table("cases")
        .select("id, case_number")
        .eq("id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail=f"Case with ID {case_id} not found"
        )

    persons = (
        supabase
        .table("persons")
        .select("*")
        .eq("case_id", case_id)
        .eq("review_status", "pending")
        .execute()
    ).data

    relationships = (
        supabase
        .table("relationships")
        .select("*")
        .eq("case_id", case_id)
        .eq("review_status", "pending")
        .execute()
    ).data

    return {
        "status": "success",
        "case_id": case_id,
        "pending_persons": persons,
        "pending_relationships": relationships,
        "total_pending": len(persons) + len(relationships)
    }


# =========================================================
# Review Person
# =========================================================

@router.patch("/{case_id}/persons/{person_id}/review")
def review_person(
    case_id: int,
    person_id: int,
    status: str
):

    status = status.lower().strip()

    if status not in ["approved", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be 'approved' or 'rejected'"
        )

    person_response = (
        supabase
        .table("persons")
        .select("*")
        .eq("id", person_id)
        .eq("case_id", case_id)
        .execute()
    )

    if not person_response.data:
        raise HTTPException(
            status_code=404,
            detail="Person not found"
        )

    response = (
        supabase
        .table("persons")
        .update({
            "review_status": status
        })
        .eq("id", person_id)
        .eq("case_id", case_id)
        .execute()
    )

    return {
        "status": "success",
        "message": f"Person marked as {status}",
        "person": response.data[0]
    }


# =========================================================
# Review Relationship
# =========================================================

@router.patch("/{case_id}/relationships/{relationship_id}/review")
def review_relationship(
    case_id: int,
    relationship_id: int,
    status: str
):

    status = status.lower().strip()

    if status not in ["approved", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be 'approved' or 'rejected'"
        )

    relationship_response = (
        supabase
        .table("relationships")
        .select("*")
        .eq("id", relationship_id)
        .eq("case_id", case_id)
        .execute()
    )

    if not relationship_response.data:
        raise HTTPException(
            status_code=404,
            detail="Relationship not found"
        )

    response = (
        supabase
        .table("relationships")
        .update({
            "review_status": status
        })
        .eq("id", relationship_id)
        .eq("case_id", case_id)
        .execute()
    )

    return {
        "status": "success",
        "message": f"Relationship marked as {status}",
        "relationship": response.data[0]
    }


# =========================================================
# Network Analysis
# =========================================================

@router.get("/{case_id}/network-analysis")
def get_network_analysis(case_id: int):

    case_response = (
        supabase
        .table("cases")
        .select("id")
        .eq("id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail=f"Case with ID {case_id} not found"
        )

    relationships = (
        supabase
        .table("relationships")
        .select("*")
        .eq("case_id", case_id)
        .execute()
        .data
    )

    transactions = (
        supabase
        .table("transactions")
        .select("*")
        .eq("case_id", case_id)
        .execute()
        .data
    )

    analysis = analyze_network(
        relationships,
        transactions
    )

    return {
        "status": "success",
        "case_id": case_id,
        "network_analysis": analysis
    }


# =========================================================
# Network Graph
# =========================================================

@router.get("/{case_id}/graph")
def get_case_graph(case_id: int):

    case_response = (
        supabase
        .table("cases")
        .select("id")
        .eq("id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail=f"Case with ID {case_id} not found"
        )

    persons = (
        supabase
        .table("persons")
        .select("*")
        .eq("case_id", case_id)
        .execute()
        .data
    )

    phones = (
        supabase
        .table("phone_numbers")
        .select("*")
        .eq("case_id", case_id)
        .execute()
        .data
    )

    accounts = (
        supabase
        .table("bank_accounts")
        .select("*")
        .eq("case_id", case_id)
        .execute()
        .data
    )

    locations = (
        supabase
        .table("locations")
        .select("*")
        .eq("case_id", case_id)
        .execute()
        .data
    )

    organizations = (
        supabase
        .table("organizations")
        .select("*")
        .eq("case_id", case_id)
        .execute()
        .data
    )

    relationships = (
        supabase
        .table("relationships")
        .select("*")
        .eq("case_id", case_id)
        .execute()
        .data
    )

    transactions = (
        supabase
        .table("transactions")
        .select("*")
        .eq("case_id", case_id)
        .execute()
        .data
    )

    network = InvestigationNetwork()

    for person in persons:
        network.entities.append(
            NetworkEntity(
                id=f"PERSON:{person['name']}",
                name=person["name"],
                entity_type="PERSON",
                confidence=person.get("confidence")
            )
        )

    for phone in phones:
        number = str(phone["number"]).strip()

        network.entities.append(
            NetworkEntity(
                id=f"PHONE:{number}",
                name=number,
                entity_type="PHONE"
            )
        )

    for account in accounts:
        account_number = str(
            account["account_number"]
        ).strip()

        network.entities.append(
            NetworkEntity(
                id=f"ACCOUNT:{account_number}",
                name=account_number,
                entity_type="BANK_ACCOUNT"
            )
        )

    for location in locations:
        name = str(location["name"]).strip()

        network.entities.append(
            NetworkEntity(
                id=f"LOCATION:{name}",
                name=name,
                entity_type="LOCATION"
            )
        )

    for organization in organizations:
        name = str(organization["name"]).strip()

        network.entities.append(
            NetworkEntity(
                id=f"ORG:{name}",
                name=name,
                entity_type="ORGANIZATION"
            )
        )

    for relationship in relationships:

        network.relationships.append(
            NetworkRelationship(
                source=str(
                    relationship["source"]
                ).strip(),
                target=str(
                    relationship["target"]
                ).strip(),
                relationship_type=relationship[
                    "relationship_type"
                ],
                confidence=relationship.get(
                    "confidence"
                )
            )
        )

    for transaction in transactions:

        network.transactions.append(
            NetworkTransaction(
                source=str(
                    transaction["from_account"]
                ).strip(),
                target=str(
                    transaction["to_account"]
                ).strip(),
                amount=transaction.get("amount"),
                date=transaction.get("date"),
                reference=transaction.get("reference")
            )
        )

    graph = build_graph(network)

    return {
        "status": "success",
        "case_id": case_id,
        **graph
    }