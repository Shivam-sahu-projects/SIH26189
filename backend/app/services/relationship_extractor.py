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
    # 1. Primary: Find "Suggested Relationships" section (Benchmark format)
    # --------------------------------------------------

    section_match = re.search(
        r"(?:7\.\s*)?Suggested Relationships(?:\s+for\s+Testing)?"
        r"(.*?)(?=Important:|\Z)",
        text,
        flags=re.IGNORECASE | re.DOTALL
    )

    if section_match:
        section = section_match.group(1)

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
                if source.lower() in ["source", "source relationship", "entity"]:
                    continue

                if target.lower() in ["target", "destination", "entity"]:
                    continue

                if len(source) > 1 and len(target) > 1:
                    relationships.append({
                        "source": source,
                        "type": relationship_type,
                        "target": target
                    })

    # --------------------------------------------------
    # 2. Secondary: Natural language investigation narratives
    # --------------------------------------------------
    if len(relationships) == 0:
        # Calls and contacts
        contact_matches = re.findall(
            r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:called|contacted|spoke\s+with|communicated\s+with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|(?:\+91[-\s]?)?[6-9]\d{9})",
            text,
            flags=re.IGNORECASE
        )
        for src, tgt in contact_matches:
            relationships.append({"source": src.strip(), "type": "CONTACTED", "target": tgt.strip()})

        # Device / Phone / Account usage
        usage_matches = re.findall(
            r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:uses|used|operating|holds|owns)\s+(?:account|phone|number)?\s*(ACC-\d+|(?:\+91[-\s]?)?[6-9]\d{9})",
            text,
            flags=re.IGNORECASE
        )
        for src, tgt in usage_matches:
            relationships.append({"source": src.strip(), "type": "USES", "target": tgt.strip()})

        # Fund transfers
        transfer_matches = re.findall(
            r"(ACC-\d+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:transferred(?:\s+funds)?|sent\s+money|paid)\s+(?:to\s+)?(ACC-\d+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
            text,
            flags=re.IGNORECASE
        )
        for src, tgt in transfer_matches:
            relationships.append({"source": src.strip(), "type": "TRANSFERRED_TO", "target": tgt.strip()})

        # Association / Employment
        assoc_matches = re.findall(
            r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is\s+associated\s+with|works\s+for|partner\s+of|connected\s+to)\s+([A-Z][a-zA-Z0-9&.\- ]+)",
            text,
            flags=re.IGNORECASE
        )
        for src, tgt in assoc_matches:
            relationships.append({"source": src.strip(), "type": "ASSOCIATED_WITH", "target": tgt.strip()})

    return unique_relationships(relationships)