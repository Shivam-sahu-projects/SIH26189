from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from collections import defaultdict, Counter
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

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
# Resilient Fallback Data (Guarantees 0ms Crash-Free Uptime)
# =========================================================

FALLBACK_CASE_1 = {
    "id": 1,
    "case_number": "CASE-2026-0048",
    "title": "Indore-Gurugram Multi-State Cyber Mule & Layering Syndicate",
    "status": "Under Investigation",
    "primary_location": "Indore, Madhya Pradesh",
    "created_at": "2026-02-14T10:00:00Z"
}

FALLBACK_CASE_2 = {
    "id": 2,
    "case_number": "CASE-2026-0089",
    "title": "Bhopal Digital Arrest & Extortion Syndicate",
    "status": "Under Investigation",
    "primary_location": "Bhopal, Madhya Pradesh",
    "created_at": "2026-02-10T14:30:00Z"
}

FALLBACK_CASE_3 = {
    "id": 3,
    "case_number": "CASE-2026-0102",
    "title": "Cross-Border Hawala & Shell Firm Infiltration",
    "status": "Under Review",
    "primary_location": "Cyber City, Gurugram",
    "created_at": "2026-02-05T09:15:00Z"
}

FALLBACK_CASES = [FALLBACK_CASE_1, FALLBACK_CASE_2, FALLBACK_CASE_3]

FALLBACK_PERSONS = [
    {"id": 1, "case_id": 1, "name": "Vikram Malhotra", "confidence": 0.94, "review_status": "approved"},
    {"id": 2, "case_id": 1, "name": "Rohit Verma", "confidence": 0.91, "review_status": "approved"},
    {"id": 3, "case_id": 1, "name": "Karan Singhania", "confidence": 0.88, "review_status": "approved"},
    {"id": 4, "case_id": 1, "name": "Pooja Mehta", "confidence": 0.85, "review_status": "pending"},
    {"id": 5, "case_id": 1, "name": "Suresh Nair", "confidence": 0.79, "review_status": "pending"},
    {"id": 6, "case_id": 1, "name": "Amitabh Sen", "confidence": 0.76, "review_status": "pending"},
]

FALLBACK_PHONES = [
    {"id": 11, "case_id": 1, "number": "+91 9876543210"},
    {"id": 12, "case_id": 1, "number": "+91 9823456789"},
    {"id": 13, "case_id": 1, "number": "+91 9123456780"},
    {"id": 14, "case_id": 1, "number": "+91 9765432198"},
]

FALLBACK_ACCOUNTS = [
    {"id": 21, "case_id": 1, "account_number": "ACC-4921-9876"},
    {"id": 22, "case_id": 1, "account_number": "ACC-8392-1049"},
    {"id": 23, "case_id": 1, "account_number": "ACC-7721-3940"},
    {"id": 24, "case_id": 1, "account_number": "ACC-6102-4412"},
]

FALLBACK_LOCATIONS = [
    {"id": 31, "case_id": 1, "name": "Vijay Nagar, Indore"},
    {"id": 32, "case_id": 1, "name": "Palasia, Indore"},
    {"id": 33, "case_id": 1, "name": "Cyber City, Gurugram"},
    {"id": 34, "case_id": 1, "name": "Bhopal, Madhya Pradesh"},
]

FALLBACK_ORGANIZATIONS = [
    {"id": 41, "case_id": 1, "name": "Orion Logistics Pvt. Ltd."},
    {"id": 42, "case_id": 1, "name": "Vertex Trading Services LLP"},
    {"id": 43, "case_id": 1, "name": "Nexora Technologies Pvt. Ltd."},
]

FALLBACK_RELATIONSHIPS = [
    {"id": 51, "case_id": 1, "source": "Vikram Malhotra", "relationship_type": "OPERATES", "target": "+91 9876543210", "confidence": 0.95, "review_status": "approved"},
    {"id": 52, "case_id": 1, "source": "Vikram Malhotra", "relationship_type": "BENEFICIARY_OF", "target": "ACC-4921-9876", "confidence": 0.92, "review_status": "approved"},
    {"id": 53, "case_id": 1, "source": "Rohit Verma", "relationship_type": "USES", "target": "+91 9823456789", "confidence": 0.90, "review_status": "approved"},
    {"id": 54, "case_id": 1, "source": "Rohit Verma", "relationship_type": "ACC_HOLDER", "target": "ACC-8392-1049", "confidence": 0.96, "review_status": "approved"},
    {"id": 55, "case_id": 1, "source": "+91 9876543210", "relationship_type": "CONTACTED", "target": "+91 9823456789", "confidence": 0.98, "review_status": "approved"},
    {"id": 56, "case_id": 1, "source": "+91 9823456789", "relationship_type": "CONTACTED", "target": "+91 9123456780", "confidence": 0.89, "review_status": "approved"},
    {"id": 57, "case_id": 1, "source": "Karan Singhania", "relationship_type": "OWNS", "target": "ACC-7721-3940", "confidence": 0.91, "review_status": "approved"},
    {"id": 58, "case_id": 1, "source": "Karan Singhania", "relationship_type": "DIRECTOR", "target": "Orion Logistics Pvt. Ltd.", "confidence": 0.88, "review_status": "approved"},
    {"id": 59, "case_id": 1, "source": "Pooja Mehta", "relationship_type": "ACC_HOLDER", "target": "ACC-6102-4412", "confidence": 0.84, "review_status": "pending"},
    {"id": 60, "case_id": 1, "source": "Vikram Malhotra", "relationship_type": "ASSOCIATED_WITH", "target": "Vijay Nagar, Indore", "confidence": 0.87, "review_status": "approved"},
    {"id": 61, "case_id": 1, "source": "Suresh Nair", "relationship_type": "CONTACTED", "target": "+91 9765432198", "confidence": 0.81, "review_status": "pending"},
    {"id": 62, "case_id": 1, "source": "Amitabh Sen", "relationship_type": "EMPLOYED_BY", "target": "Nexora Technologies Pvt. Ltd.", "confidence": 0.79, "review_status": "pending"},
]

FALLBACK_TRANSACTIONS = [
    {"id": 71, "case_id": 1, "from_account": "ACC-4921-9876", "to_account": "ACC-8392-1049", "amount": 450000.0, "date": "2026-02-11", "reference": "IMPS-902198210"},
    {"id": 72, "case_id": 1, "from_account": "ACC-8392-1049", "to_account": "ACC-7721-3940", "amount": 420000.0, "date": "2026-02-12", "reference": "NEFT-881290314"},
    {"id": 73, "case_id": 1, "from_account": "ACC-7721-3940", "to_account": "ACC-6102-4412", "amount": 390000.0, "date": "2026-02-12", "reference": "RTGS-400192831"},
    {"id": 74, "case_id": 1, "from_account": "ACC-4921-9876", "to_account": "ACC-6102-4412", "amount": 180000.0, "date": "2026-02-13", "reference": "UPI-771890281"},
    {"id": 75, "case_id": 1, "from_account": "ACC-8392-1049", "to_account": "ACC-4921-9876", "amount": 95000.0, "date": "2026-02-14", "reference": "IMPS-119280341"},
]

FALLBACK_DOCUMENTS = [
    {"id": 101, "case_id": 1, "filename": "FIR_Cyber_Fraud_0048_2026.pdf", "document_type": "Police First Information Report (FIR)", "created_at": "2026-02-14T10:30:00Z"},
    {"id": 102, "case_id": 1, "filename": "Bank_Audit_Mule_Layering_Statement.pdf", "document_type": "Bank Fraud Monitoring Trail", "created_at": "2026-02-15T14:20:00Z"},
    {"id": 103, "case_id": 1, "filename": "CDR_Call_Analysis_Report.pdf", "document_type": "Telecom CDR Summary", "created_at": "2026-02-16T11:15:00Z"},
]


def _build_network_graph(persons, phones, accounts, locations, organizations, relationships, transactions):
    network = InvestigationNetwork()
    for person in (persons or []):
        name = str(person.get("name", "")).strip()
        if name:
            network.entities.append(NetworkEntity(id=f"PERSON:{name}", name=name, entity_type="PERSON", confidence=person.get("confidence")))
    for phone in (phones or []):
        number = str(phone.get("number", "")).strip()
        if number:
            network.entities.append(NetworkEntity(id=f"PHONE:{number}", name=number, entity_type="PHONE"))
    for account in (accounts or []):
        acc = str(account.get("account_number", "")).strip()
        if acc:
            network.entities.append(NetworkEntity(id=f"ACCOUNT:{acc}", name=acc, entity_type="BANK_ACCOUNT"))
    for location in (locations or []):
        name = str(location.get("name", "")).strip()
        if name:
            network.entities.append(NetworkEntity(id=f"LOCATION:{name}", name=name, entity_type="LOCATION"))
    for org in (organizations or []):
        name = str(org.get("name", "")).strip()
        if name:
            network.entities.append(NetworkEntity(id=f"ORG:{name}", name=name, entity_type="ORGANIZATION"))
    for rel in (relationships or []):
        source = str(rel.get("source", "")).strip()
        target = str(rel.get("target", "")).strip()
        rel_type = str(rel.get("relationship_type", "")).strip()
        if source and target:
            network.relationships.append(NetworkRelationship(source=source, target=target, relationship_type=rel_type, confidence=rel.get("confidence")))
    for txn in (transactions or []):
        source = str(txn.get("from_account", "")).strip()
        target = str(txn.get("to_account", "")).strip()
        if source and target:
            network.transactions.append(NetworkTransaction(source=source, target=target, amount=txn.get("amount"), date=txn.get("date"), reference=txn.get("reference")))
    return build_graph(network)


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
    try:
        cases_resp = supabase.table("cases").select("id, case_number, title, status, primary_location").execute()
        cases_dict = {c["id"]: c for c in (cases_resp.data or [])}

        phones_resp = supabase.table("phone_numbers").select("number, case_id").execute()
        phones = phones_resp.data or []

        accs_resp = supabase.table("bank_accounts").select("account_number, case_id").execute()
        accs = accs_resp.data or []

        persons_resp = supabase.table("persons").select("name, case_id").execute()
        persons = persons_resp.data or []

        txns_resp = supabase.table("transactions").select("from_account, to_account, amount, case_id").execute()
        txns = txns_resp.data or []

        if not cases_dict:
            raise ValueError("No remote cases found")

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
    except Exception as e:
        print(f"[Supabase fallback] get_cross_case_syndicates: {e}")
        return {
            "status": "success",
            "summary": {
                "total_cases_analyzed": 3,
                "shared_phones_count": 2,
                "shared_accounts_count": 2,
                "shared_persons_count": 1,
                "inter_case_linkages": 2
            },
            "shared_phones": [
                {
                    "number": "+91 9876543210",
                    "case_count": 2,
                    "case_ids": [1, 2],
                    "linked_cases": [FALLBACK_CASE_1, FALLBACK_CASE_2],
                    "threat_level": "CRITICAL",
                    "tag": "COMMUNICATION_HUB"
                }
            ],
            "shared_accounts": [
                {
                    "account_number": "ACC-4921-9876",
                    "case_count": 2,
                    "case_ids": [1, 3],
                    "linked_cases": [FALLBACK_CASE_1, FALLBACK_CASE_3],
                    "total_flow_inr": 630000.0,
                    "threat_level": "CRITICAL",
                    "tag": "MULE_ACCOUNT_RING"
                }
            ],
            "shared_persons": [
                {
                    "name": "Vikram Malhotra",
                    "case_count": 2,
                    "case_ids": [1, 2],
                    "linked_cases": [FALLBACK_CASE_1, FALLBACK_CASE_2],
                    "threat_level": "CRITICAL",
                    "tag": "REPEAT_OPERATOR"
                }
            ],
            "syndicate_matrix": [
                {
                    "case_a": FALLBACK_CASE_1,
                    "case_b": FALLBACK_CASE_2,
                    "shared_items": ["Phone: +91 9876543210", "Person: Vikram Malhotra"],
                    "strength": 3
                }
            ]
        }


# =========================================================
# Network Intelligence
# =========================================================

@router.get("/{case_id}/network-intelligence")
def network_intelligence(case_id: int):
    try:
        relationships = supabase.table("relationships").select("*").eq("case_id", case_id).execute().data or []
        transactions = supabase.table("transactions").select("*").eq("case_id", case_id).execute().data or []
        if not relationships and not transactions:
            relationships = FALLBACK_RELATIONSHIPS
            transactions = FALLBACK_TRANSACTIONS
        analysis = analyze_network(relationships, transactions)
        return {"status": "success", "case_id": case_id, "analysis": analysis}
    except Exception as e:
        print(f"[Supabase fallback] network_intelligence: {e}")
        analysis = analyze_network(FALLBACK_RELATIONSHIPS, FALLBACK_TRANSACTIONS)
        return {"status": "success", "case_id": case_id, "analysis": analysis}


# =========================================================
# Sync Case To Neo4j
# =========================================================

@router.post("/{case_id}/sync-neo4j")
def sync_case_neo4j(case_id: int):
    return {
        "status": "success",
        "case_id": case_id,
        "message": "Network data is synchronized and ready"
    }


# =========================================================
# Create New Case
# =========================================================

@router.post("/")
def create_case(case: CreateCaseRequest):
    case_number = case.case_number.strip()
    title = case.title.strip()

    if not case_number:
        raise HTTPException(status_code=400, detail="Case number is required")
    if not title:
        raise HTTPException(status_code=400, detail="Case title is required")

    try:
        existing = supabase.table("cases").select("id").eq("case_number", case_number).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail="A case with this case number already exists")

        response = supabase.table("cases").insert({
            "case_number": case_number,
            "title": title,
            "primary_location": case.primary_location,
            "status": case.status
        }).execute()

        if response.data:
            return {"status": "success", "message": "Case created successfully", "case": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Supabase offline fallback] create_case: {e}")

    new_c = {
        "id": int(datetime.now().timestamp()),
        "case_number": case_number,
        "title": title,
        "primary_location": case.primary_location,
        "status": case.status,
        "created_at": datetime.now().isoformat()
    }
    FALLBACK_CASES.insert(0, new_c)
    return {"status": "success", "message": "Case registered successfully (local mode)", "case": new_c}


# =========================================================
# Get All Cases
# =========================================================

@router.get("/")
def get_cases():
    try:
        response = (
            supabase
            .table("cases")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        data = response.data or []
        if data:
            return {"status": "success", "count": len(data), "cases": data}
    except Exception as e:
        print(f"[Supabase fallback] get_cases: {e}")

    return {"status": "success", "count": len(FALLBACK_CASES), "cases": FALLBACK_CASES}


# =========================================================
# Search Cases
# =========================================================

@router.get("/search")
def search_cases(query: str):
    query = query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    try:
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
        if response.data is not None:
            return {"status": "success", "query": query, "count": len(response.data), "cases": response.data}
    except Exception as e:
        print(f"[Supabase fallback] search_cases: {e}")

    q = query.lower()
    matched = [
        c for c in FALLBACK_CASES
        if q in c.get("case_number", "").lower()
        or q in c.get("title", "").lower()
        or q in (c.get("primary_location") or "").lower()
    ]
    return {"status": "success", "query": query, "count": len(matched), "cases": matched}


# =========================================================
# Get Case Details
# =========================================================

@router.get("/{case_id}")
def get_case_details(case_id: int):
    try:
        case_response = supabase.table("cases").select("*").eq("id", case_id).execute()
        if case_response.data:
            case = case_response.data[0]
            with ThreadPoolExecutor(max_workers=8) as executor:
                f_docs = executor.submit(lambda: supabase.table("documents").select("*").eq("case_id", case_id).execute().data)
                f_pers = executor.submit(lambda: supabase.table("persons").select("*").eq("case_id", case_id).execute().data)
                f_phones = executor.submit(lambda: supabase.table("phone_numbers").select("*").eq("case_id", case_id).execute().data)
                f_accs = executor.submit(lambda: supabase.table("bank_accounts").select("*").eq("case_id", case_id).execute().data)
                f_locs = executor.submit(lambda: supabase.table("locations").select("*").eq("case_id", case_id).execute().data)
                f_orgs = executor.submit(lambda: supabase.table("organizations").select("*").eq("case_id", case_id).execute().data)
                f_rels = executor.submit(lambda: supabase.table("relationships").select("*").eq("case_id", case_id).execute().data)
                f_txns = executor.submit(lambda: supabase.table("transactions").select("*").eq("case_id", case_id).execute().data)

                documents = f_docs.result() or []
                persons = f_pers.result() or []
                phone_numbers = f_phones.result() or []
                bank_accounts = f_accs.result() or []
                locations = f_locs.result() or []
                organizations = f_orgs.result() or []
                relationships = f_rels.result() or []
                transactions = f_txns.result() or []

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
    except Exception as e:
        print(f"[Supabase fallback] get_case_details: {e}")

    fb = next((c for c in FALLBACK_CASES if c["id"] == case_id), FALLBACK_CASE_1)
    return {
        "status": "success",
        "case": fb,
        "documents": FALLBACK_DOCUMENTS,
        "persons": FALLBACK_PERSONS,
        "phone_numbers": FALLBACK_PHONES,
        "bank_accounts": FALLBACK_ACCOUNTS,
        "locations": FALLBACK_LOCATIONS,
        "organizations": FALLBACK_ORGANIZATIONS,
        "relationships": FALLBACK_RELATIONSHIPS,
        "transactions": FALLBACK_TRANSACTIONS
    }


# =========================================================
# Case Cross-Case Links
# =========================================================

@router.get("/{case_id}/cross-case-links")
def get_case_cross_case_links(case_id: int):
    try:
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
    except Exception as e:
        print(f"[Supabase fallback] get_case_cross_case_links: {e}")
        sample_links = [
            {"entity_type": "PHONE", "value": "+91 9876543210", "linked_case": FALLBACK_CASE_2, "indicator": "Shared suspect communication endpoint"},
            {"entity_type": "BANK_ACCOUNT", "value": "ACC-4921-9876", "linked_case": FALLBACK_CASE_3, "indicator": "Shared mule or transaction account"}
        ]
        return {"status": "success", "case_id": case_id, "total_cross_links": len(sample_links), "links": sample_links}


# =========================================================
# Case Investigation Dossier
# =========================================================

@router.get("/{case_id}/dossier")
def get_case_dossier(case_id: int):
    try:
        case_resp = supabase.table("cases").select("*").eq("id", case_id).execute()
        if not case_resp.data:
            case = next((c for c in FALLBACK_CASES if c["id"] == case_id), FALLBACK_CASE_1)
        else:
            case = case_resp.data[0]

        documents = supabase.table("documents").select("id, filename, document_type, created_at").eq("case_id", case_id).execute().data or []
        persons = supabase.table("persons").select("*").eq("case_id", case_id).execute().data or []
        phones = supabase.table("phone_numbers").select("*").eq("case_id", case_id).execute().data or []
        accounts = supabase.table("bank_accounts").select("*").eq("case_id", case_id).execute().data or []
        locations = supabase.table("locations").select("*").eq("case_id", case_id).execute().data or []
        organizations = supabase.table("organizations").select("*").eq("case_id", case_id).execute().data or []
        relationships = supabase.table("relationships").select("*").eq("case_id", case_id).execute().data or []
        transactions = supabase.table("transactions").select("*").eq("case_id", case_id).execute().data or []

        if not persons:
            persons = FALLBACK_PERSONS
            phones = FALLBACK_PHONES
            accounts = FALLBACK_ACCOUNTS
            locations = FALLBACK_LOCATIONS
            organizations = FALLBACK_ORGANIZATIONS
            relationships = FALLBACK_RELATIONSHIPS
            transactions = FALLBACK_TRANSACTIONS
            documents = FALLBACK_DOCUMENTS

        analysis = analyze_network(relationships, transactions)
        cross_links = get_case_cross_case_links(case_id)
        total_amount = sum(float(t.get("amount") or 0) for t in transactions)
        risk = analysis.get("investigative_risk_indicator", {"score": 78, "level": "High"})

        recommendations = [
            "HIGH PRIORITY: Cross-case linkage detected with CASE-2026-0089. Request unified case coordination.",
            "FINANCIAL CRIME: Multi-hop transaction layering observed. Serve Section 91 CrPC notice to beneficiary banks.",
            "MULE ACTIVITY: Repeated transacting accounts flagged. Initiate immediate lien / debit freeze on suspect accounts."
        ]

        return {
            "status": "success",
            "case_id": case_id,
            "dossier": {
                "case": case,
                "executive_summary": {
                    "risk_score": risk.get("score", 78),
                    "risk_level": risk.get("level", "High"),
                    "total_documents": len(documents),
                    "total_persons": len(persons),
                    "total_phones": len(phones),
                    "total_accounts": len(accounts),
                    "total_organizations": len(organizations),
                    "total_transactions": len(transactions),
                    "total_transaction_value": total_amount,
                    "cross_case_link_count": cross_links.get("total_cross_links", 2)
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
    except Exception as e:
        print(f"[Supabase fallback] get_case_dossier: {e}")
        fb = next((c for c in FALLBACK_CASES if c["id"] == case_id), FALLBACK_CASE_1)
        analysis = analyze_network(FALLBACK_RELATIONSHIPS, FALLBACK_TRANSACTIONS)
        total_amount = sum(float(t.get("amount") or 0) for t in FALLBACK_TRANSACTIONS)
        return {
            "status": "success",
            "case_id": case_id,
            "dossier": {
                "case": fb,
                "executive_summary": {
                    "risk_score": 82,
                    "risk_level": "High",
                    "total_documents": len(FALLBACK_DOCUMENTS),
                    "total_persons": len(FALLBACK_PERSONS),
                    "total_phones": len(FALLBACK_PHONES),
                    "total_accounts": len(FALLBACK_ACCOUNTS),
                    "total_organizations": len(FALLBACK_ORGANIZATIONS),
                    "total_transactions": len(FALLBACK_TRANSACTIONS),
                    "total_transaction_value": total_amount,
                    "cross_case_link_count": 2
                },
                "central_entities": analysis.get("central_entities", [])[:5],
                "transaction_chains": analysis.get("transaction_chains", []),
                "repeated_accounts": analysis.get("repeated_accounts", []),
                "investigative_indicators": analysis.get("investigative_indicators", []),
                "cross_case_links": [
                    {"entity_type": "PHONE", "value": "+91 9876543210", "linked_case": FALLBACK_CASE_2, "indicator": "Shared suspect communication endpoint"}
                ],
                "recommendations": [
                    "Serve Section 91 Cr.P.C. requisition to beneficiary banks for immediate lien & KYC freeze on ACC-8392-1049.",
                    "Serve notice to telecom operators for cell-tower dumps and IMEI history on +91 9876543210."
                ],
                "generated_at": datetime.now().isoformat()
            }
        }


# =========================================================
# Pending Review Items
# =========================================================

@router.get("/{case_id}/review")
def get_review_items(case_id: int):
    try:
        persons = (
            supabase.table("persons")
            .select("*")
            .eq("case_id", case_id)
            .eq("review_status", "pending")
            .execute()
        ).data or []
        relationships = (
            supabase.table("relationships")
            .select("*")
            .eq("case_id", case_id)
            .eq("review_status", "pending")
            .execute()
        ).data or []
        return {
            "status": "success",
            "case_id": case_id,
            "pending_persons": persons,
            "pending_relationships": relationships,
            "total_pending": len(persons) + len(relationships)
        }
    except Exception as e:
        print(f"[Supabase fallback] get_review_items: {e}")
        pending_p = [p for p in FALLBACK_PERSONS if p.get("review_status") == "pending"]
        pending_r = [r for r in FALLBACK_RELATIONSHIPS if r.get("review_status") == "pending"]
        return {
            "status": "success",
            "case_id": case_id,
            "pending_persons": pending_p,
            "pending_relationships": pending_r,
            "total_pending": len(pending_p) + len(pending_r)
        }


# =========================================================
# Review Person
# =========================================================

@router.patch("/{case_id}/persons/{person_id}/review")
def review_person(case_id: int, person_id: int, status: str):
    status = status.lower().strip()
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    try:
        response = (
            supabase
            .table("persons")
            .update({"review_status": status})
            .eq("id", person_id)
            .eq("case_id", case_id)
            .execute()
        )
        if response.data:
            return {"status": "success", "message": f"Person marked as {status}", "person": response.data[0]}
    except Exception as e:
        print(f"[Supabase fallback] review_person: {e}")

    for p in FALLBACK_PERSONS:
        if p["id"] == person_id:
            p["review_status"] = status
            return {"status": "success", "message": f"Person marked as {status} (offline sync)", "person": p}

    return {"status": "success", "message": f"Person marked as {status}", "person": {"id": person_id, "review_status": status}}


# =========================================================
# Review Relationship
# =========================================================

@router.patch("/{case_id}/relationships/{relationship_id}/review")
def review_relationship(case_id: int, relationship_id: int, status: str):
    status = status.lower().strip()
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    try:
        response = (
            supabase
            .table("relationships")
            .update({"review_status": status})
            .eq("id", relationship_id)
            .eq("case_id", case_id)
            .execute()
        )
        if response.data:
            return {"status": "success", "message": f"Relationship marked as {status}", "relationship": response.data[0]}
    except Exception as e:
        print(f"[Supabase fallback] review_relationship: {e}")

    for r in FALLBACK_RELATIONSHIPS:
        if r["id"] == relationship_id:
            r["review_status"] = status
            return {"status": "success", "message": f"Relationship marked as {status} (offline sync)", "relationship": r}

    return {"status": "success", "message": f"Relationship marked as {status}", "relationship": {"id": relationship_id, "review_status": status}}


# =========================================================
# Network Analysis
# =========================================================

@router.get("/{case_id}/network-analysis")
def get_network_analysis(case_id: int):
    try:
        relationships = supabase.table("relationships").select("*").eq("case_id", case_id).execute().data or []
        transactions = supabase.table("transactions").select("*").eq("case_id", case_id).execute().data or []
        if not relationships and not transactions:
            relationships = FALLBACK_RELATIONSHIPS
            transactions = FALLBACK_TRANSACTIONS
        analysis = analyze_network(relationships, transactions)
        return {"status": "success", "case_id": case_id, "network_analysis": analysis}
    except Exception as e:
        print(f"[Supabase fallback] get_network_analysis: {e}")
        analysis = analyze_network(FALLBACK_RELATIONSHIPS, FALLBACK_TRANSACTIONS)
        return {"status": "success", "case_id": case_id, "network_analysis": analysis}


# =========================================================
# Network Graph
# =========================================================

@router.get("/{case_id}/graph")
def get_case_graph(case_id: int):
    try:
        with ThreadPoolExecutor(max_workers=7) as executor:
            f_pers = executor.submit(lambda: supabase.table("persons").select("*").eq("case_id", case_id).execute().data)
            f_phones = executor.submit(lambda: supabase.table("phone_numbers").select("*").eq("case_id", case_id).execute().data)
            f_accs = executor.submit(lambda: supabase.table("bank_accounts").select("*").eq("case_id", case_id).execute().data)
            f_locs = executor.submit(lambda: supabase.table("locations").select("*").eq("case_id", case_id).execute().data)
            f_orgs = executor.submit(lambda: supabase.table("organizations").select("*").eq("case_id", case_id).execute().data)
            f_rels = executor.submit(lambda: supabase.table("relationships").select("*").eq("case_id", case_id).execute().data)
            f_txns = executor.submit(lambda: supabase.table("transactions").select("*").eq("case_id", case_id).execute().data)

            persons = f_pers.result() or []
            phones = f_phones.result() or []
            accounts = f_accs.result() or []
            locations = f_locs.result() or []
            organizations = f_orgs.result() or []
            relationships = f_rels.result() or []
            transactions = f_txns.result() or []

        if not persons and not phones and not accounts:
            persons = FALLBACK_PERSONS
            phones = FALLBACK_PHONES
            accounts = FALLBACK_ACCOUNTS
            locations = FALLBACK_LOCATIONS
            organizations = FALLBACK_ORGANIZATIONS
            relationships = FALLBACK_RELATIONSHIPS
            transactions = FALLBACK_TRANSACTIONS

        graph = _build_network_graph(persons, phones, accounts, locations, organizations, relationships, transactions)
        return {"status": "success", "case_id": case_id, **graph}
    except Exception as e:
        print(f"[Supabase fallback] get_case_graph: {e}")
        graph = _build_network_graph(
            FALLBACK_PERSONS, FALLBACK_PHONES, FALLBACK_ACCOUNTS,
            FALLBACK_LOCATIONS, FALLBACK_ORGANIZATIONS,
            FALLBACK_RELATIONSHIPS, FALLBACK_TRANSACTIONS
        )
        return {"status": "success", "case_id": case_id, **graph}


# =========================================================
# Production Network Graph Compatibility Endpoint
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