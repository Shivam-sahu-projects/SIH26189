from dataclasses import dataclass, field
from typing import Optional


# =========================================================
# UNIVERSAL ENTITY
# =========================================================

@dataclass
class NetworkEntity:
    id: str
    name: str
    entity_type: str

    confidence: Optional[float] = None

    source_document: Optional[str] = None
    source_page: Optional[int] = None

    metadata: dict = field(default_factory=dict)


# =========================================================
# UNIVERSAL RELATIONSHIP
# =========================================================

@dataclass
class NetworkRelationship:
    source: str
    target: str
    relationship_type: str

    confidence: Optional[float] = None

    source_document: Optional[str] = None
    source_page: Optional[int] = None

    evidence: Optional[str] = None

    metadata: dict = field(default_factory=dict)


# =========================================================
# UNIVERSAL TRANSACTION
# =========================================================

@dataclass
class NetworkTransaction:
    source: str
    target: str

    amount: Optional[float] = None
    currency: str = "INR"

    date: Optional[str] = None
    reference: Optional[str] = None

    confidence: Optional[float] = None

    source_document: Optional[str] = None
    source_page: Optional[int] = None

    evidence: Optional[str] = None

    metadata: dict = field(default_factory=dict)


# =========================================================
# COMPLETE NETWORK
# =========================================================

@dataclass
class InvestigationNetwork:

    entities: list[NetworkEntity] = field(
        default_factory=list
    )

    relationships: list[NetworkRelationship] = field(
        default_factory=list
    )

    transactions: list[NetworkTransaction] = field(
        default_factory=list
    )

    metadata: dict = field(
        default_factory=dict
    )