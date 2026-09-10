from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.network import router as network_router
from app.database import supabase
from app.routes.documents import router as documents_router
from app.routes.extraction import router as extraction_router
from app.routes.cases import router as cases_router

app = FastAPI(
    title="SIH26189 Criminal Network Analysis API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://sih-26189.vercel.app",
        "https://sih26189.vercel.app",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(documents_router)
app.include_router(network_router)
app.include_router(extraction_router)
app.include_router(cases_router)

@app.get("/")
def root():
    return {
        "message": "SIH26189 Criminal Network Analysis API is running",
        "version": "1.0.0",
        "status": "active"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

@app.get("/test-db")
def test_database():
    response = supabase.table("cases").select("*").limit(1).execute()

    return {
        "status": "success",
        "database": "connected",
        "data": response.data
    }

@app.get("/debug-supabase")
def debug_supabase():

    response = supabase.auth.get_user()

    return {
        "supabase_connection": "working",
        "authenticated_user": response.user.id if response.user else None
    }