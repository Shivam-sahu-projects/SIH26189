from app.services.network_model import InvestigationNetwork


def normalize(value):
    if value is None:
        return ""

    return " ".join(str(value).strip().lower().split())


def resolve_entity(value, entities):
    """
    Find the correct universal entity ID
    using its name.
    """

    value_normalized = normalize(value)

    for entity in entities:

        if normalize(entity.name) == value_normalized:
            return entity.id

    return value


def build_graph(network: InvestigationNetwork):

    nodes = {}
    edges = []

    # ---------------------------------------------
    # ENTITY NODES
    # ---------------------------------------------

    for entity in network.entities:

        nodes[entity.id] = {
            "id": entity.id,
            "label": entity.name,
            "type": entity.entity_type,
            "confidence": entity.confidence,
        }

    # ---------------------------------------------
    # RELATIONSHIPS
    # ---------------------------------------------

    for relationship in network.relationships:

        source = resolve_entity(
            relationship.source,
            network.entities
        )

        target = resolve_entity(
            relationship.target,
            network.entities
        )

        # Create unknown entities if necessary
        if source not in nodes:

            nodes[source] = {
                "id": source,
                "label": relationship.source,
                "type": "UNKNOWN",
                "confidence": None,
            }

        if target not in nodes:

            nodes[target] = {
                "id": target,
                "label": relationship.target,
                "type": "UNKNOWN",
                "confidence": None,
            }

        edges.append({
            "source": source,
            "target": target,
            "type": relationship.relationship_type,
            "confidence": relationship.confidence,
            "evidence": relationship.evidence,
        })

    # ---------------------------------------------
    # TRANSACTIONS
    # ---------------------------------------------

    for transaction in network.transactions:

        source = resolve_entity(
            transaction.source,
            network.entities
        )

        target = resolve_entity(
            transaction.target,
            network.entities
        )

        if source not in nodes:

            nodes[source] = {
                "id": source,
                "label": transaction.source,
                "type": "BANK_ACCOUNT",
                "confidence": None,
            }

        if target not in nodes:

            nodes[target] = {
                "id": target,
                "label": transaction.target,
                "type": "BANK_ACCOUNT",
                "confidence": None,
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
        })

    # ---------------------------------------------
    # REMOVE DUPLICATES
    # ---------------------------------------------

    unique_edges = []
    seen = set()

    for edge in edges:

        key = (
            edge["source"],
            edge["target"],
            edge["type"],
            edge.get("reference"),
        )

        if key in seen:
            continue

        seen.add(key)
        unique_edges.append(edge)

    return {
        "nodes": list(nodes.values()),
        "edges": unique_edges,
    }