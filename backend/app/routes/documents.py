from fastapi import APIRouter, UploadFile, File, HTTPException
from pypdf import PdfReader
from io import BytesIO

router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)


@router.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):

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

    file_content = await file.read()

    try:
        reader = PdfReader(BytesIO(file_content))

        pages = []

        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append(text)

        full_text = "\n".join(pages)

        return {
            "filename": file.filename,
            "pages": len(reader.pages),
            "text": full_text
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process PDF: {str(e)}"
        )