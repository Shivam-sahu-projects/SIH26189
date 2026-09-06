from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from collections import defaultdict, Counter
from datetime import datetime

from app.database import supabase
from app.services.network_analyzer import analyze_network
from app.services.network_model import (
    InvestigationNetwork,
    NetworkEntity,
    NetworkRelationship,
    NetworkTransaction,
)
from app.services.network_analysis.graph_builder import build_graph


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
# Cross-Case Syndicate Intelligence
# =========================================================

@router.get("/intelligence/cross-case-syndicates")
def get_cross_case_syndicates():
    """
    Detect entities (phones, bank accounts, persons) that appear across
    multiple cases, revealing organized criminal rings and money mule networks.
    """
    # Fetch all cases
    cases_resp = supabase.table("cases").select("id, case_number, title, status, primary_location").execute()
    cases_dict = {c["id"]: c for c in (cases_resp.data or [])}

    # Fetch all phones
    phones_resp = supabase.table("phone_numbers").select("number, case_id").execute()
    phones = phones_resp.data or []

    # Fetch all accounts
    accs_resp = supabase.table("bank_accounts").select("account_number, case_id").execute()
    accs = accs_resp.data or []

    # Fetch all persons
    persons_resp = supabase.table("persons").select("name, case_id").execute()
    persons = persons_resp.data or []

    # Fetch transactions to compute shared account flow
    txns_resp = supabase.table("transactions").select("from_account, to_account, amount, case_id").execute()
    txns = txns_resp.data or []

    # Map entity -> set of case_ids
    phone_to_cases = defaultdict(set)
    for p in phones:
        if p.get("number"):
            phone_to_cases[str(p["number"]).strip()].add(p["case_id"])

    account_to_cases = defaultdict(set)
    for a in accs:
        if a.get("account_number"):
            account_to_cases[str(a["account_number"]).strip()].add(a["case_id"])

    person_to_cases = defaultdict(set)
    for p in persons:
        if p.get("name"):
            person_to_cases[str(p["name"]).strip()].add(p["case_id"])

    # Build shared entity lists
    shared_phones = []
    for number, case_ids in phone_to_cases.items():
        if len(case_ids) > 1:
            linked_cases = [cases_dict[cid] for cid in case_ids if cid in cases_dict]
            shared_phones.append({
                "number": number,
                "case_count": len(case_ids),
                "case_ids": list(case_ids),
                "linked_cases": linked_cases,
                "threat_level": "CRITICAL" if len(case_ids) >= 3 else "HIGH",
                "tag": "COMMUNICATION_HUB"
            })
    shared_phones.sort(key=lambda x: x["case_count"], reverse=True)

    shared_accounts = []
    for acc, case_ids in account_to_cases.items():
        if len(case_ids) > 1:
            linked_cases = [cases_dict[cid] for cid in case_ids if cid in cases_dict]
            total_vol = sum(
                float(t.get("amount") or 0)
                for t in txns
                if t.get("case_id") in case_ids and (t.get("from_account") == acc or t.get("to_account") == acc)
            )
            shared_accounts.append({
                "account_number": acc,
                "case_count": len(case_ids),
                "case_ids": list(case_ids),
                "linked_cases": linked_cases,
                "total_flow_inr": total_vol,
                "threat_level": "CRITICAL" if len(case_ids) >= 3 else "HIGH",
                "tag": "MULE_ACCOUNT_RING"
            })
    shared_accounts.sort(key=lambda x: x["case_count"], reverse=True)

    shared_persons = []
    for name, case_ids in person_to_cases.items():
        if len(case_ids) > 1:
            linked_cases = [cases_dict[cid] for cid in case_ids if cid in cases_dict]
            shared_persons.append({
                "name": name,
                "case_count": len(case_ids),
                "case_ids": list(case_ids),
                "linked_cases": linked_cases,
                "threat_level": "CRITICAL" if len(case_ids) >= 3 else "HIGH",
                "tag": "REPEAT_OPERATOR"
            })
    shared_persons.sort(key=lambda x: x["case_count"], reverse=True)

    # Inter-case links
    case_connections = defaultdict(lambda: {"shared_entities": [], "weight": 0})
    for p in shared_phones:
        c_list = sorted(list(p["case_ids"]))
        for i in range(len(c_list)):
            for j in range(i + 1, len(c_list)):
                key = (c_list[i], c_list[j])
                case_connections[key]["shared_entities"].append(f"Phone: {p['number']}")
                case_connections[key]["weight"] += 1

    for a in shared_accounts:
        c_list = sorted(list(a["case_ids"]))
        for i in range(len(c_list)):
            for j in range(i + 1, len(c_list)):
                key = (c_list[i], c_list[j])
                case_connections[key]["shared_entities"].append(f"Account: {a['account_number']}")
                case_connections[key]["weight"] += 2

    syndicate_matrix = []
    for (cid1, cid2), info in case_connections.items():
        if cid1 in cases_dict and cid2 in cases_dict:
            syndicate_matrix.append({
                "case_a": cases_dict[cid1],
                "case_b": cases_dict[cid2],
                "shared_items": info["shared_entities"],
                "strength": info["weight"]
            })
    syndicate_matrix.sort(key=lambda x: x["strength"], reverse=True)

    return {
        "status": "success",
        "summary": {
            "total_cases_analyzed": len(cases_dict),
            "shared_phones_count": len(shared_phones),
            "shared_accounts_count": len(shared_accounts),
            "shared_persons_count": len(shared_persons),
            "inter_case_linkages": len(syndicate_matrix)
        },
        "shared_phones": shared_phones,
        "shared_accounts": shared_accounts,
        "shared_persons": shared_persons,
        "syndicate_matrix": syndicate_matrix
    }


# =========================================================
# Network Intelligence
# =========================================================

@router.get("/{case_id}/network-intelligence")
def network_intelligence(case_id: int):

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
        "analysis": analysis
    }


# =========================================================
# Sync Case To Neo4j
# =========================================================
# Production version:
# Neo4j is local on the development machine, so Render
# cannot access it. The live graph therefore uses Supabase.
# This endpoint is kept so the existing frontend continues
# to work without modification.
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

    return {
        "status": "success",
        "case_id": case_id,
        "message": "Network data is ready from Supabase"
    }


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

    # Supports normal 10-digit Indian phone numbers
    # as well as numbers containing +91.
    phone_candidate = (
        entity
        .replace("+91", "")
        .replace(" ", "")
        .replace("-", "")
    )

    if phone_candidate.isdigit() and len(phone_candidate) == 10:
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
# Case Cross-Case Links
# =========================================================

@router.get("/{case_id}/cross-case-links")
def get_case_cross_case_links(case_id: int):
    this_phones = [p["number"] for p in (supabase.table("phone_numbers").select("number").eq("case_id", case_id).execute().data or []) if p.get("number")]
    this_accounts = [a["account_number"] for a in (supabase.table("bank_accounts").select("account_number").eq("case_id", case_id).execute().data or []) if a.get("account_number")]
    this_persons = [p["name"] for p in (supabase.table("persons").select("name").eq("case_id", case_id).execute().data or []) if p.get("name")]

    all_cases = {c["id"]: c for c in (supabase.table("cases").select("id, case_number, title, status").execute().data or []) if c["id"] != case_id}

    links = []

    if this_phones:
        other_phones = supabase.table("phone_numbers").select("number, case_id").neq("case_id", case_id).in_("number", this_phones).execute().data or []
        for op in other_phones:
            cid = op["case_id"]
            if cid in all_cases:
                links.append({
                    "entity_type": "PHONE",
                    "value": op["number"],
                    "linked_case": all_cases[cid],
                    "indicator": "Shared suspect communication endpoint"
                })

    if this_accounts:
        other_accs = supabase.table("bank_accounts").select("account_number, case_id").neq("case_id", case_id).in_("account_number", this_accounts).execute().data or []
        for oa in other_accs:
            cid = oa["case_id"]
            if cid in all_cases:
                links.append({
                    "entity_type": "BANK_ACCOUNT",
                    "value": oa["account_number"],
                    "linked_case": all_cases[cid],
                    "indicator": "Shared mule or transaction account"
                })

    if this_persons:
        other_persons = supabase.table("persons").select("name, case_id").neq("case_id", case_id).in_("name", this_persons).execute().data or []
        for op in other_persons:
            cid = op["case_id"]
            if cid in all_cases:
                links.append({
                    "entity_type": "PERSON",
                    "value": op["name"],
                    "linked_case": all_cases[cid],
                    "indicator": "Common suspect / person of interest"
                })

    return {
        "status": "success",
        "case_id": case_id,
        "total_cross_links": len(links),
        "links": links
    }


# =========================================================
# Case Investigation Dossier
# =========================================================

@router.get("/{case_id}/dossier")
def get_case_dossier(case_id: int):
    case_resp = supabase.table("cases").select("*").eq("id", case_id).execute()
    if not case_resp.data:
        raise HTTPException(status_code=404, detail="Case not found")
    case = case_resp.data[0]

    documents = supabase.table("documents").select("id, filename, document_type, created_at").eq("case_id", case_id).execute().data or []
    persons = supabase.table("persons").select("*").eq("case_id", case_id).execute().data or []
    phones = supabase.table("phone_numbers").select("*").eq("case_id", case_id).execute().data or []
    accounts = supabase.table("bank_accounts").select("*").eq("case_id", case_id).execute().data or []
    locations = supabase.table("locations").select("*").eq("case_id", case_id).execute().data or []
    organizations = supabase.table("organizations").select("*").eq("case_id", case_id).execute().data or []
    relationships = supabase.table("relationships").select("*").eq("case_id", case_id).execute().data or []
    transactions = supabase.table("transactions").select("*").eq("case_id", case_id).execute().data or []

    analysis = analyze_network(relationships, transactions)
    cross_links = get_case_cross_case_links(case_id)

    total_amount = sum(float(t.get("amount") or 0) for t in transactions)
    risk = analysis.get("investigative_risk_indicator", {"score": 50, "level": "Medium"})

    recommendations = []
    if cross_links["total_cross_links"] > 0:
        recommendations.append(f"HIGH PRIORITY: Cross-case linkage detected with {len(set(l['linked_case']['case_number'] for l in cross_links['links']))} other investigation(s). Request unified case coordination.")
    if analysis.get("transaction_chains"):
        recommendations.append("FINANCIAL CRIME: Multi-hop transaction layering observed. Serve Section 91 CrPC notice to beneficiary banks.")
    if len(analysis.get("repeated_accounts", [])) > 0:
        recommendations.append("MULE ACTIVITY: Repeated transacting accounts flagged. Initiate immediate lien / debit freeze on suspect accounts.")
    if not recommendations:
        recommendations.append("Continue routine surveillance and obtain call detail records (CDR) for all identified phone numbers.")

    return {
        "status": "success",
        "case_id": case_id,
        "dossier": {
            "case": case,
            "executive_summary": {
                "risk_score": risk.get("score"),
                "risk_level": risk.get("level"),
                "total_documents": len(documents),
                "total_persons": len(persons),
                "total_phones": len(phones),
                "total_accounts": len(accounts),
                "total_organizations": len(organizations),
                "total_transactions": len(transactions),
                "total_transaction_value": total_amount,
                "cross_case_link_count": cross_links["total_cross_links"]
            },
            "central_entities": analysis.get("central_entities", [])[:5],
            "transaction_chains": analysis.get("transaction_chains", []),
            "repeated_accounts": analysis.get("repeated_accounts", []),
            "investigative_indicators": analysis.get("investigative_indicators", []),
            "cross_case_links": cross_links.get("links", []),
            "recommendations": recommendations,
            "generated_at": datetime.now().isoformat()
        }
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

    # ---------------------------------------------------------
    # Persons
    # ---------------------------------------------------------

    for person in persons:

        network.entities.append(
            NetworkEntity(
                id=f"PERSON:{person['name'].strip()}",
                name=person["name"].strip(),
                entity_type="PERSON",
                confidence=person.get("confidence")
            )
        )

    # ---------------------------------------------------------
    # Phones
    # ---------------------------------------------------------

    for phone in phones:

        number = str(
            phone["number"]
        ).strip()

        network.entities.append(
            NetworkEntity(
                id=f"PHONE:{number}",
                name=number,
                entity_type="PHONE"
            )
        )

    # ---------------------------------------------------------
    # Bank Accounts
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # Locations
    # ---------------------------------------------------------

    for location in locations:

        name = str(
            location["name"]
        ).strip()

        network.entities.append(
            NetworkEntity(
                id=f"LOCATION:{name}",
                name=name,
                entity_type="LOCATION"
            )
        )

    # ---------------------------------------------------------
    # Organizations
    # ---------------------------------------------------------

    for organization in organizations:

        name = str(
            organization["name"]
        ).strip()

        network.entities.append(
            NetworkEntity(
                id=f"ORG:{name}",
                name=name,
                entity_type="ORGANIZATION"
            )
        )

    # ---------------------------------------------------------
    # Relationships
    # ---------------------------------------------------------

    for relationship in relationships:

        source = str(
            relationship["source"]
        ).strip()

        target = str(
            relationship["target"]
        ).strip()

        relationship_type = str(
            relationship["relationship_type"]
        ).strip()

        network.relationships.append(
            NetworkRelationship(
                source=source,
                target=target,
                relationship_type=relationship_type,
                confidence=relationship.get("confidence")
            )
        )

    # ---------------------------------------------------------
    # Transactions
    # ---------------------------------------------------------

    for transaction in transactions:

        source = str(
            transaction["from_account"]
        ).strip()

        target = str(
            transaction["to_account"]
        ).strip()

        network.transactions.append(
            NetworkTransaction(
                source=source,
                target=target,
                amount=transaction.get("amount"),
                date=transaction.get("date"),
                reference=transaction.get("reference")
            )
        )

    # ---------------------------------------------------------
    # Build Graph
    # ---------------------------------------------------------

    graph = build_graph(network)

    return {
        "status": "success",
        "case_id": case_id,
        **graph
    }


# =========================================================
# Production Network Graph Compatibility Endpoint
# =========================================================
# The existing frontend requests:
#
# GET /cases/{case_id}/neo4j-graph
#
# We return the Supabase graph here so the frontend does
# not need to be changed.
# =========================================================

@router.get("/{case_id}/neo4j-graph")
def get_neo4j_graph(case_id: int):

    graph_response = get_case_graph(case_id)

    return {
        "status": "success",
        "case_id": case_id,
        "graph": {
            "nodes": graph_response.get("nodes", []),
            "edges": graph_response.get("edges", [])
        }
    }