from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from pypdf import PdfReader
from io import BytesIO
from datetime import datetime

from app.database import supabase

from app.services.entity_extractor import (
    extract_entities,
    extract_case_info
)

from app.services.relationship_extractor import (
    extract_relationships
)

from app.services.transaction_extractor import (
    extract_transactions
)


router = APIRouter(
    prefix="/extraction",
    tags=["AI Extraction"]
)


# =========================================================
# Extract PDF without saving
# =========================================================

@router.post("/pdf")
async def extract_from_pdf(
    file: UploadFile = File(...)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided"
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    try:

        # -------------------------------------------------
        # Read PDF
        # -------------------------------------------------

        file_content = await file.read()

        reader = PdfReader(
            BytesIO(file_content)
        )

        pages = []

        for page in reader.pages:

            text = page.extract_text() or ""

            pages.append(text)

        full_text = "\n".join(pages)

        if not full_text.strip():

            raise HTTPException(
                status_code=400,
                detail="No readable text found in PDF"
            )

        # -------------------------------------------------
        # AI / extraction pipeline
        # -------------------------------------------------

        entities = extract_entities(
            full_text
        )

        relationships = extract_relationships(
            full_text
        )

        transactions = extract_transactions(
            full_text
        )

        # -------------------------------------------------
        # Return extracted information
        # -------------------------------------------------

        return {

            "status": "success",

            "filename": file.filename,

            "pages": len(reader.pages),

            "entities": entities,

            "relationships": relationships,

            "transactions": transactions

        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"PDF processing failed: {str(e)}"
        )


# =========================================================
# Extract PDF and save to Supabase
# =========================================================

@router.post("/pdf/save")
async def extract_and_save_pdf(
    file: UploadFile = File(...),
    case_id: Optional[int] = Form(None)
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided"
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    try:
        # =================================================
        # READ PDF
        # =================================================
        file_content = await file.read()
        reader = PdfReader(BytesIO(file_content))

        pages = []
        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append(text)

        full_text = "\n".join(pages)

        if not full_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text found in PDF"
            )

        # =================================================
        # EXTRACT INFORMATION
        # =================================================
        case_info = extract_case_info(full_text)
        entities = extract_entities(full_text)
        relationships = extract_relationships(full_text)
        transactions = extract_transactions(full_text)

        # Convert report date
        report_date = None
        if case_info.get("report_date"):
            try:
                report_date = datetime.strptime(
                    case_info["report_date"],
                    "%d %B %Y"
                ).date().isoformat()
            except ValueError:
                report_date = None

        # Resolve or create case
        if case_id:
            # Case explicitly specified
            case_check = supabase.table("cases").select("*").eq("id", case_id).execute()
            if not case_check.data:
                raise HTTPException(
                    status_code=404,
                    detail=f"Target case with ID {case_id} not found"
                )
            target_case = case_check.data[0]
            case_number = target_case["case_number"]
        else:
            # Check if case number extracted
            case_number = case_info.get("case_number")
            if not case_number:
                # Generate fallback case number
                case_number = f"CASE-{datetime.now().year}-{abs(hash(file.filename)) % 9000 + 1000:04d}"

            # Check if case exists
            existing_case = (
                supabase
                .table("cases")
                .select("id, case_number")
                .eq("case_number", case_number)
                .execute()
            )

            if existing_case.data:
                # Attach to existing case instead of throwing 409
                case_id = existing_case.data[0]["id"]
            else:
                # Create new case
                case_response = (
                    supabase
                    .table("cases")
                    .insert({
                        "case_number": case_number,
                        "title": f"Investigation {case_number}",
                        "status": case_info.get("status") or "Under Investigation",
                        "primary_location": case_info.get("primary_location"),
                        "report_date": report_date
                    })
                    .execute()
                )
                case_id = case_response.data[0]["id"]


        # =================================================
        # SAVE DOCUMENT
        # =================================================

        supabase.table(
            "documents"
        ).insert({

            "case_id": case_id,

            "filename": file.filename,

            "document_type": "PDF",

            "extracted_text": full_text

        }).execute()


        # =================================================
        # BATCH SAVE EXTRACTED DATA TO SUPABASE
        # =================================================

        if entities.get("persons"):
            persons_data = [
                {"case_id": case_id, "name": person, "confidence": 0.85, "review_status": "pending"}
                for person in entities["persons"]
            ]
            supabase.table("persons").insert(persons_data).execute()

        if entities.get("phone_numbers"):
            phones_data = [
                {"case_id": case_id, "number": phone}
                for phone in entities["phone_numbers"]
            ]
            supabase.table("phone_numbers").insert(phones_data).execute()

        if entities.get("bank_accounts"):
            accounts_data = [
                {"case_id": case_id, "account_number": account}
                for account in entities["bank_accounts"]
            ]
            supabase.table("bank_accounts").insert(accounts_data).execute()

        if entities.get("locations"):
            locations_data = [
                {"case_id": case_id, "name": location}
                for location in entities["locations"]
            ]
            supabase.table("locations").insert(locations_data).execute()

        if entities.get("organizations"):
            orgs_data = [
                {"case_id": case_id, "name": organization}
                for organization in entities["organizations"]
            ]
            supabase.table("organizations").insert(orgs_data).execute()

        if relationships:
            rels_data = [
                {
                    "case_id": case_id,
                    "source": rel["source"],
                    "relationship_type": rel["type"],
                    "target": rel["target"],
                    "confidence": 0.80,
                    "review_status": "pending"
                }
                for rel in relationships
            ]
            supabase.table("relationships").insert(rels_data).execute()

        if transactions:
            txns_data = [
                {
                    "case_id": case_id,
                    "date": txn.get("date"),
                    "from_account": txn["from_account"],
                    "to_account": txn["to_account"],
                    "amount": txn.get("amount"),
                    "reference": txn.get("reference")
                }
                for txn in transactions
            ]
            supabase.table("transactions").insert(txns_data).execute()


        # =================================================
        # FINAL RESPONSE
        # =================================================

        return {

            "status": "success",

            "message":
                "PDF extracted and saved to Supabase",

            "case_id":
                case_id,

            "case_number":
                case_info["case_number"],

            "case_status":
                case_info["status"],

            "primary_location":
                case_info["primary_location"],

            "report_date":
                report_date,

            "filename":
                file.filename,

            "entities_saved": {

                "persons":
                    len(entities["persons"]),

                "phones":
                    len(entities["phone_numbers"]),

                "bank_accounts":
                    len(entities["bank_accounts"]),

                "locations":
                    len(entities["locations"]),

                "organizations":
                    len(entities["organizations"])

            },

            "relationships_saved":
                len(relationships),

            "transactions_saved":
                len(transactions)

        }


    except HTTPException:

        raise


    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=(
                "Failed to save extracted data: "
                f"{str(e)}"
            )

        )