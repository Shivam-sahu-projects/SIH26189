from fastapi import APIRouter, UploadFile, File, HTTPException
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

        # =================================================
        # READ PDF
        # =================================================

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


        # =================================================
        # EXTRACT INFORMATION
        # =================================================

        case_info = extract_case_info(
            full_text
        )

        entities = extract_entities(
            full_text
        )

        relationships = extract_relationships(
            full_text
        )

        transactions = extract_transactions(
            full_text
        )


        # =================================================
        # CONVERT REPORT DATE
        # =================================================

        report_date = None

        if case_info["report_date"]:

            try:

                report_date = datetime.strptime(
                    case_info["report_date"],
                    "%d %B %Y"
                ).date().isoformat()

            except ValueError:

                report_date = None


        # =================================================
        # VALIDATE CASE NUMBER
        # =================================================

        if not case_info["case_number"]:

            raise HTTPException(
                status_code=400,
                detail="Case ID could not be extracted from PDF"
            )


        # =================================================
        # CHECK DUPLICATE CASE
        # =================================================

        existing_case = (

            supabase

            .table("cases")

            .select(
                "id, case_number"
            )

            .eq(
                "case_number",
                case_info["case_number"]
            )

            .execute()

        )

        if existing_case.data:

            raise HTTPException(
                status_code=409,
                detail=(
                    f"Case "
                    f"{case_info['case_number']} "
                    f"already exists"
                )
            )


        # =================================================
        # CREATE CASE
        # =================================================

        case_response = (

            supabase

            .table("cases")

            .insert({

                "case_number":
                    case_info["case_number"],

                "title":
                    f"Investigation "
                    f"{case_info['case_number']}",

                "status":
                    case_info["status"],

                "primary_location":
                    case_info["primary_location"],

                "report_date":
                    report_date

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
        # SAVE PERSONS
        # =================================================

        for person in entities["persons"]:

            supabase.table(
                "persons"
            ).insert({

                "case_id": case_id,

                "name": person,

                "confidence": 0.85,

                "review_status": "pending"

            }).execute()


        # =================================================
        # SAVE PHONE NUMBERS
        # =================================================

        for phone in entities["phone_numbers"]:

            supabase.table(
                "phone_numbers"
            ).insert({

                "case_id": case_id,

                "number": phone

            }).execute()


        # =================================================
        # SAVE BANK ACCOUNTS
        # =================================================

        for account in entities["bank_accounts"]:

            supabase.table(
                "bank_accounts"
            ).insert({

                "case_id": case_id,

                "account_number": account

            }).execute()


        # =================================================
        # SAVE LOCATIONS
        # =================================================

        for location in entities["locations"]:

            supabase.table(
                "locations"
            ).insert({

                "case_id": case_id,

                "name": location

            }).execute()


        # =================================================
        # SAVE ORGANIZATIONS
        # =================================================

        for organization in entities["organizations"]:

            supabase.table(
                "organizations"
            ).insert({

                "case_id": case_id,

                "name": organization

            }).execute()


        # =================================================
        # SAVE RELATIONSHIPS
        # =================================================

        for relationship in relationships:

            supabase.table(
                "relationships"
            ).insert({

                "case_id": case_id,

                "source":
                    relationship["source"],

                "relationship_type":
                    relationship["type"],

                "target":
                    relationship["target"],

                "confidence": 0.80,

                "review_status": "pending"

            }).execute()


        # =================================================
        # SAVE TRANSACTIONS
        # =================================================

        for transaction in transactions:

            supabase.table(
                "transactions"
            ).insert({

                "case_id": case_id,

                "date":
                    transaction["date"],

                "from_account":
                    transaction["from_account"],

                "to_account":
                    transaction["to_account"],

                "amount":
                    transaction["amount"],

                "reference":
                    transaction["reference"]

            }).execute()


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