import re


def unique_relationships(relationships):
    """Remove duplicate relationships while preserving order."""

    seen = set()
    result = []

    for relationship in relationships:

        key = (
            relationship["source"],
            relationship["type"],
            relationship["target"]
        )

        if key not in seen:
            seen.add(key)
            result.append(relationship)

    return result


def extract_relationships(text: str):

    relationships = []

    # --------------------------------------------------
    # Find the "Suggested Relationships" section
    # --------------------------------------------------

    section_match = re.search(
        r"7\.\s*Suggested Relationships for Testing"
        r"(.*?)(?=Important:)",
        text,
        flags=re.IGNORECASE | re.DOTALL
    )

    if not section_match:
        return []

    section = section_match.group(1)

    # --------------------------------------------------
    # Relationship rows
    #
    # Format:
    #
    # Source Relationship Target
    #
    # Example:
    # Rahul Sharma CONTACTED Amit Kumar
    # --------------------------------------------------

    known_relationships = [
        "CONTACTED",
        "USES",
        "ASSOCIATED_WITH",
        "TRANSFERRED_TO",
        "MENTIONED_LOCATION"
    ]

    for relationship_type in known_relationships:

        pattern = (
            r"(.+?)\s+"
            + re.escape(relationship_type)
            + r"\s+"
            r"(.+?)(?=\n|$)"
        )

        matches = re.findall(
            pattern,
            section,
            flags=re.IGNORECASE
        )

        for source, target in matches:

            source = re.sub(r"\s+", " ", source).strip()
            target = re.sub(r"\s+", " ", target).strip()

            # Remove table headers
            if source.lower() in ["source", "source relationship"]:
                continue

            if target.lower() == "target":
                continue

            relationships.append({
                "source": source,
                "type": relationship_type,
                "target": target
            })

    return unique_relationships(relationships)