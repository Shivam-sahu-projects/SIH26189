from app.database import supabase
from app.services.neo4j_service import Neo4jService


def sync_case_to_neo4j(case_id):
    neo4j = Neo4jService()

    try:
        case_id = str(case_id)

        # Clear old graph for this case
        neo4j.clear_case(case_id)

        # -----------------------------------------
        # 1. PERSONS
        # -----------------------------------------

        persons = (
            supabase
            .table("persons")
            .select("*")
            .eq("case_id", case_id)
            .execute()
            .data
        )

        for person in persons:
            neo4j.create_entity(
                case_id=case_id,
                entity_id=f"person_{person['id']}",
                name=person["name"],
                entity_type="PERSON",
                confidence=person.get("confidence")
            )

        # -----------------------------------------
        # 2. PHONE NUMBERS
        # -----------------------------------------

        phones = (
            supabase
            .table("phone_numbers")
            .select("*")
            .eq("case_id", case_id)
            .execute()
            .data
        )

        for phone in phones:
            neo4j.create_entity(
                case_id=case_id,
                entity_id=f"phone_{phone['id']}",
                name=phone["number"],
                entity_type="PHONE"
            )

        # -----------------------------------------
        # 3. BANK ACCOUNTS
        # -----------------------------------------

        accounts = (
            supabase
            .table("bank_accounts")
            .select("*")
            .eq("case_id", case_id)
            .execute()
            .data
        )

        for account in accounts:
            neo4j.create_entity(
                case_id=case_id,
                entity_id=f"account_{account['id']}",
                name=account["account_number"],
                entity_type="BANK_ACCOUNT"
            )

        # -----------------------------------------
        # 4. LOCATIONS
        # -----------------------------------------

        locations = (
            supabase
            .table("locations")
            .select("*")
            .eq("case_id", case_id)
            .execute()
            .data
        )

        for location in locations:
            neo4j.create_entity(
                case_id=case_id,
                entity_id=f"location_{location['id']}",
                name=location["name"],
                entity_type="LOCATION"
            )

        # -----------------------------------------
        # 5. ORGANIZATIONS
        # -----------------------------------------

        organizations = (
            supabase
            .table("organizations")
            .select("*")
            .eq("case_id", case_id)
            .execute()
            .data
        )

        for organization in organizations:
            neo4j.create_entity(
                case_id=case_id,
                entity_id=f"organization_{organization['id']}",
                name=organization["name"],
                entity_type="ORGANIZATION"
            )

        # -----------------------------------------
        # 6. RELATIONSHIPS
        # -----------------------------------------

        relationships = (
            supabase
            .table("relationships")
            .select("*")
            .eq("case_id", case_id)
            .execute()
            .data
        )

        # Build name → Neo4j ID lookup
        entity_lookup = {}

        for person in persons:
            entity_lookup[person["name"].strip().lower()] = (
                f"person_{person['id']}"
            )

        for phone in phones:
            entity_lookup[phone["number"].strip().lower()] = (
                f"phone_{phone['id']}"
            )

        for account in accounts:
            entity_lookup[account["account_number"].strip().lower()] = (
                f"account_{account['id']}"
            )

        for location in locations:
            entity_lookup[location["name"].strip().lower()] = (
                f"location_{location['id']}"
            )

        for organization in organizations:
            entity_lookup[organization["name"].strip().lower()] = (
                f"organization_{organization['id']}"
            )

        relationships_saved = 0

        for relationship in relationships:

            source_name = relationship["source"].strip()
            target_name = relationship["target"].strip()

            source_id = entity_lookup.get(
                source_name.lower()
            )

            target_id = entity_lookup.get(
                target_name.lower()
            )

            if not source_id or not target_id:
                continue

            neo4j.create_relationship(
                case_id=case_id,
                source_id=source_id,
                target_id=target_id,
                relationship_type=relationship[
                    "relationship_type"
                ],
                confidence=relationship.get("confidence"),
                evidence=relationship.get("evidence")
            )

            relationships_saved += 1

        # -----------------------------------------
        # 7. TRANSACTIONS
        # -----------------------------------------

        transactions = (
            supabase
            .table("transactions")
            .select("*")
            .eq("case_id", case_id)
            .execute()
            .data
        )

        transactions_saved = 0

        for transaction in transactions:

            source_name = transaction[
                "from_account"
            ].strip()

            target_name = transaction[
                "to_account"
            ].strip()

            source_id = entity_lookup.get(
                source_name.lower()
            )

            target_id = entity_lookup.get(
                target_name.lower()
            )

            if not source_id or not target_id:
                continue

            neo4j.create_relationship(
                case_id=case_id,
                source_id=source_id,
                target_id=target_id,
                relationship_type="TRANSFERRED_TO",
                evidence=(
                    f"Transaction "
                    f"{transaction.get('reference', '')} "
                    f"amount ₹{transaction.get('amount', 0)} "
                    f"on {transaction.get('date', '')}"
                )
            )

            transactions_saved += 1

        return {
            "status": "success",
            "case_id": case_id,
            "persons": len(persons),
            "phones": len(phones),
            "bank_accounts": len(accounts),
            "locations": len(locations),
            "organizations": len(organizations),
            "relationships": relationships_saved,
            "transactions": transactions_saved
        }

    finally:
        neo4j.close()
        sync_network_to_neo4j = sync_case_to_neo4j
        # Compatibility alias used by cases.py
sync_network_to_neo4j = sync_case_to_neo4j  