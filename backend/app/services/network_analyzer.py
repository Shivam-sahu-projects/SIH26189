from collections import Counter, defaultdict
from typing import Any


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_text(value: Any) -> str:
    if value is None:
        return ""

    return " ".join(
        str(value).strip().lower().split()
    )


def normalize_relationship(value: Any) -> str:
    """
    Convert different relationship descriptions
    into a common graph relationship.
    """

    value = normalize_text(value)

    aliases = {
        "called": "CONTACTED",
        "call": "CONTACTED",
        "phone call": "CONTACTED",
        "telephone contact": "CONTACTED",
        "telephonic contact": "CONTACTED",
        "communicated": "CONTACTED",
        "communicated with": "CONTACTED",
        "contacted": "CONTACTED",

        "sent money": "TRANSFERRED_TO",
        "money transfer": "TRANSFERRED_TO",
        "fund transfer": "TRANSFERRED_TO",
        "transferred funds": "TRANSFERRED_TO",
        "made payment": "TRANSFERRED_TO",
        "payment": "TRANSFERRED_TO",
        "transferred to": "TRANSFERRED_TO",

        "uses": "USES",
        "used": "USES",
        "associated with": "ASSOCIATED_WITH",
        "linked to": "ASSOCIATED_WITH",
        "connected to": "ASSOCIATED_WITH",

        "located at": "LOCATED_AT",
        "lives at": "LOCATED_AT",
        "resides at": "LOCATED_AT",
        "address": "LOCATED_AT",

        "owns": "OWNS",
        "owned by": "OWNS",

        "works for": "WORKS_FOR",
        "employed by": "WORKS_FOR",

        "visited": "VISITED",
        "present at": "PRESENT_AT",

        "mentioned": "MENTIONED",
    }

    return aliases.get(
        value,
        value.upper().replace(" ", "_")
    )


# ============================================================
# ENTITY TYPE INFERENCE
# ============================================================

def infer_entity_type(value: Any) -> str:

    value = str(value).strip()

    if not value:
        return "UNKNOWN"

    upper = value.upper()

    # Phone
    digits = "".join(
        character
        for character in value
        if character.isdigit()
    )

    if 10 <= len(digits) <= 15:
        return "PHONE"

    # Email
    if "@" in value and "." in value:
        return "EMAIL"

    # Bank / financial account
    account_keywords = [
        "ACC-",
        "ACCOUNT",
        "A/C",
        "IBAN",
        "BANK"
    ]

    if any(
        keyword in upper
        for keyword in account_keywords
    ):
        return "BANK_ACCOUNT"

    # Transaction
    if (
        upper.startswith("TXN")
        or "TRANSACTION" in upper
    ):
        return "TRANSACTION"

    # IP address
    parts = value.split(".")

    if len(parts) == 4:

        if all(
            part.isdigit()
            for part in parts
        ):
            return "IP_ADDRESS"

    # Vehicle
    vehicle_keywords = [
        "VEHICLE",
        "CAR",
        "BIKE",
        "MOTORCYCLE",
        "REGISTRATION"
    ]

    if any(
        keyword in upper
        for keyword in vehicle_keywords
    ):
        return "VEHICLE"

    return "UNKNOWN"


# ============================================================
# ENTITY RESOLUTION
# ============================================================

def resolve_entity(
    value: Any,
    entities: list
) -> str:

    value_normalized = normalize_text(value)

    for entity in entities:

        if normalize_text(
            getattr(entity, "name", "")
        ) == value_normalized:

            return entity.id

    return str(value).strip()


# ============================================================
# GRAPH BUILDER
# ============================================================

def build_universal_graph(
    entities,
    relationships,
    transactions
):

    nodes = {}
    edges = []

    # --------------------------------------------------------
    # ENTITIES
    # --------------------------------------------------------

    for entity in entities:

        if not entity.name:
            continue

        nodes[entity.id] = {
            "id": entity.id,
            "label": entity.name,
            "type": entity.entity_type,
            "confidence": entity.confidence,
        }

    # --------------------------------------------------------
    # RELATIONSHIPS
    # --------------------------------------------------------

    for relationship in relationships:

        source = resolve_entity(
            relationship.source,
            entities
        )

        target = resolve_entity(
            relationship.target,
            entities
        )

        if not source or not target:
            continue

        if source not in nodes:

            nodes[source] = {
                "id": source,
                "label": relationship.source,
                "type": infer_entity_type(
                    relationship.source
                ),
                "confidence": None,
            }

        if target not in nodes:

            nodes[target] = {
                "id": target,
                "label": relationship.target,
                "type": infer_entity_type(
                    relationship.target
                ),
                "confidence": None,
            }

        edges.append({
            "source": source,
            "target": target,
            "type": normalize_relationship(
                relationship.relationship_type
            ),
            "confidence": relationship.confidence,
            "evidence": relationship.evidence,
            "page": relationship.source_page,
        })

    # --------------------------------------------------------
    # TRANSACTIONS
    # --------------------------------------------------------

    for transaction in transactions:

        source = resolve_entity(
            transaction.source,
            entities
        )

        target = resolve_entity(
            transaction.target,
            entities
        )

        if not source or not target:
            continue

        if source not in nodes:

            nodes[source] = {
                "id": source,
                "label": transaction.source,
                "type": "BANK_ACCOUNT",
                "confidence": transaction.confidence,
            }

        if target not in nodes:

            nodes[target] = {
                "id": target,
                "label": transaction.target,
                "type": "BANK_ACCOUNT",
                "confidence": transaction.confidence,
            }

        edges.append({
            "source": source,
            "target": target,
            "type": "TRANSFERRED_TO",
            "amount": transaction.amount,
            "currency": transaction.currency,
            "date": transaction.date,
            "reference": transaction.reference,
            "confidence": transaction.confidence,
            "evidence": transaction.evidence,
        })

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
    }


# ============================================================
# NETWORK ANALYSIS
# ============================================================

def analyze_network(
    relationships,
    transactions
):

    connection_count = Counter()
    incoming = Counter()
    outgoing = Counter()

    relationship_types = Counter()

    adjacency = defaultdict(set)

    # --------------------------------------------------------
    # RELATIONSHIPS
    # --------------------------------------------------------

    for relationship in relationships:

        source = relationship.get("source")
        target = relationship.get("target")

        if not source or not target:
            continue

        relationship_type = normalize_relationship(
            relationship.get(
                "relationship_type"
            )
        )

        connection_count[source] += 1
        connection_count[target] += 1

        outgoing[source] += 1
        incoming[target] += 1

        relationship_types[
            relationship_type
        ] += 1

        adjacency[source].add(target)
        adjacency[target].add(source)

    # --------------------------------------------------------
    # TRANSACTIONS
    # --------------------------------------------------------

    total_amount = 0

    transaction_accounts = Counter()

    transfer_graph = defaultdict(set)

    for transaction in transactions:

        source = transaction.get(
            "from_account"
        )

        target = transaction.get(
            "to_account"
        )

        amount = transaction.get(
            "amount"
        ) or 0

        try:
            total_amount += float(amount)
        except (ValueError, TypeError):
            pass

        if source:
            transaction_accounts[source] += 1

        if target:
            transaction_accounts[target] += 1

        if source and target:

            transfer_graph[source].add(
                target
            )

    # --------------------------------------------------------
    # TRANSACTION CHAINS
    # --------------------------------------------------------

    transaction_chains = []

    for first, second_nodes in transfer_graph.items():

        for second in second_nodes:

            if second not in transfer_graph:
                continue

            for third in transfer_graph[second]:

                transaction_chains.append({
                    "from": first,
                    "via": second,
                    "to": third
                })

    # Remove duplicate chains
    unique_chains = []

    seen_chains = set()

    for chain in transaction_chains:

        key = (
            chain["from"],
            chain["via"],
            chain["to"]
        )

        if key in seen_chains:
            continue

        seen_chains.add(key)
        unique_chains.append(chain)

    # --------------------------------------------------------
    # CENTRAL ENTITIES
    # --------------------------------------------------------

    central_entities = []

    for entity, count in connection_count.most_common(
        15
    ):

        central_entities.append({
            "entity": entity,
            "connections": count,
            "incoming": incoming[entity],
            "outgoing": outgoing[entity],
        })

    # --------------------------------------------------------
    # REPEATED TRANSACTION ACCOUNTS
    # --------------------------------------------------------

    repeated_accounts = []

    for account, count in transaction_accounts.items():

        if count > 1:

            repeated_accounts.append({
                "account": account,
                "transaction_count": count,
            })

    # --------------------------------------------------------
    # INVESTIGATIVE INDICATORS
    # --------------------------------------------------------

    indicators = []

    if len(relationships) >= 3:

        indicators.append({
            "type": "NETWORK_CONNECTIVITY",
            "severity": "INFO",
            "description": (
                "Multiple entities are connected "
                "within the case network."
            )
        })

    if unique_chains:

        indicators.append({
            "type": "MULTI_HOP_TRANSACTION",
            "severity": "REVIEW",
            "description": (
                "A multi-step transaction path "
                "was identified."
            ),
            "chains": unique_chains,
        })

    if repeated_accounts:

        indicators.append({
            "type": "REPEATED_ACCOUNT_ACTIVITY",
            "severity": "REVIEW",
            "description": (
                "Accounts participate in multiple "
                "recorded transactions."
            ),
            "accounts": repeated_accounts,
        })

    # --------------------------------------------------------
    # INDICATIVE SCORE
    # --------------------------------------------------------

    score = 0

    if len(relationships) >= 3:
        score += 20

    if len(relationships) >= 6:
        score += 15

    if len(relationships) >= 10:
        score += 10

    if len(unique_chains) >= 1:
        score += 20

    if len(unique_chains) >= 2:
        score += 10

    if len(repeated_accounts) >= 1:
        score += 10

    if len(repeated_accounts) >= 2:
        score += 10

    score = min(score, 100)

    if score >= 70:
        level = "High"
    elif score >= 40:
        level = "Medium"
    else:
        level = "Low"

    return {

        "total_relationships":
            len(relationships),

        "total_transactions":
            len(transactions),

        "total_transaction_amount":
            total_amount,

        "relationship_types":
            dict(relationship_types),

        "central_entities":
            central_entities,

        "transaction_chains":
            unique_chains,

        "repeated_accounts":
            repeated_accounts,

        "investigative_indicators":
            indicators,

        "investigative_risk_indicator": {
            "score": score,
            "level": level,
            "note": (
                "This is an AI-assisted investigative "
                "indicator, not a determination of guilt "
                "or criminality. Human investigator "
                "review is required."
            )
        }
    }