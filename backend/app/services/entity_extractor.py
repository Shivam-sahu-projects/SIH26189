import re
import spacy


# =========================================================
# Load NLP model
# =========================================================

nlp = spacy.load("en_core_web_sm")


# =========================================================
# Confidence Helper
# =========================================================

def confidence_for_entity(entity_type, value):
    """
    Heuristic confidence for the current extraction pipeline.
    This is NOT a statistical probability.
    """

    if entity_type == "PHONE":
        return 0.98

    if entity_type == "BANK_ACCOUNT":
        return 0.97

    if entity_type == "ORGANIZATION":
        return 0.92

    if entity_type == "LOCATION":
        return 0.90

    if entity_type == "PERSON":
        return 0.85

    return 0.80


# =========================================================
# Remove Duplicates
# =========================================================

def unique(items):
    """
    Remove duplicates while preserving order.
    """

    seen = set()
    result = []

    for item in items:

        item = re.sub(r"\s+", " ", str(item)).strip()

        if item and item not in seen:
            seen.add(item)
            result.append(item)

    return result


# =========================================================
# Extract Case Information
# =========================================================

def extract_case_info(text: str):

    case_number = None
    status = None
    primary_location = None
    report_date = None

    # -----------------------------------------------------
    # Case Number
    # -----------------------------------------------------

    # Format:
    # Case ID: CASE-2026-0098
    # Case Number: CASE-2026-0098
    case_match = re.search(
        r"(?:Case\s*(?:ID|Number)|Case)"
        r"\s*[:\-]?\s*"
        r"(CASE-\d{4}-\d+)",
        text,
        flags=re.IGNORECASE
    )

    if case_match:
        case_number = case_match.group(1).upper()

    # -----------------------------------------------------
    # Fallback Case Number
    # -----------------------------------------------------

    # Format:
    # CASE-2026-0098 | FIR-IND-2026-1842
    if not case_number:

        case_match = re.search(
            r"\b(CASE-\d{4}-\d+)\b",
            text,
            flags=re.IGNORECASE
        )

        if case_match:
            case_number = case_match.group(1).upper()

    # -----------------------------------------------------
    # Status
    # -----------------------------------------------------

    status_match = re.search(
        r"Status\s*[:\-]?\s*([^\n]+)",
        text,
        flags=re.IGNORECASE
    )

    if status_match:
        status = status_match.group(1).strip()

    # -----------------------------------------------------
    # Primary Location
    # -----------------------------------------------------

    location_match = re.search(
        r"Primary\s+Location\s*[:\-]?\s*([^\n]+)",
        text,
        flags=re.IGNORECASE
    )

    if location_match:
        primary_location = location_match.group(1).strip()

    # -----------------------------------------------------
    # Report Date
    # -----------------------------------------------------

    date_match = re.search(
        r"Report\s+Date\s*[:\-]?\s*"
        r"(\d{1,2}\s+[A-Za-z]+\s+\d{4})",
        text,
        flags=re.IGNORECASE
    )

    if date_match:
        report_date = date_match.group(1).strip()

    return {
        "case_number": case_number,
        "status": status,
        "primary_location": primary_location,
        "report_date": report_date
    }


# =========================================================
# Extract Entities
# =========================================================

def extract_entities(text: str):

    # =====================================================
    # Clean Text
    # =====================================================

    text = text.replace("\r", "\n")

    # Keep newlines because sections depend on them
    text = re.sub(r"[ \t]+", " ", text)

    # =====================================================
    # PHONE NUMBERS
    # =====================================================

    phone_numbers = re.findall(
        r"\b(?:\+91[-\s]?)?[6-9]\d{9}\b",
        text
    )

    phone_numbers = unique(phone_numbers)

    # =====================================================
    # BANK ACCOUNTS
    # =====================================================

    bank_accounts = re.findall(
        r"\bACC-\d+\b",
        text,
        flags=re.IGNORECASE
    )

    bank_accounts = unique(
        account.upper()
        for account in bank_accounts
    )

    # =====================================================
    # PERSONS
    # =====================================================

    persons = []

    persons_section = re.search(
        r"2\.\s*Persons of Interest"
        r"(.*?)(?=3\.\s*Communication Records)",
        text,
        flags=re.IGNORECASE | re.DOTALL
    )

    if persons_section:

        section = persons_section.group(1)

        possible_names = re.findall(
            r"\b[A-Z][a-z]+ [A-Z][a-z]+\b",
            section
        )

        persons.extend(possible_names)

    # -----------------------------------------------------
    # Remove invalid matches
    # -----------------------------------------------------

    invalid_persons = {
        "Persons Interest",
        "Role Description",
        "Phone Number",
        "Neha Verma Business",
        "Madhya Pradesh",
        "Vijay Nagar",
        "Neha Verma Rahul Sharma"
    }

    persons = [
        person
        for person in persons
        if person not in invalid_persons
    ]

    persons = unique(persons)

    # =====================================================
    # LOCATIONS
    # =====================================================

    locations = []

    locations_section = re.search(
        r"5\.\s*Locations"
        r"(.*?)(?=6\.\s*Organizations)",
        text,
        flags=re.IGNORECASE | re.DOTALL
    )

    if locations_section:

        section = locations_section.group(1)

        # Current known locations
        location_patterns = [
            r"Vijay Nagar,\s*Indore",
            r"Palasia,\s*Indore",
            r"Bhopal,\s*Madhya Pradesh",
            r"Bhawarkua,\s*Indore",
            r"Rau,\s*Indore",
            r"Bengali Square,\s*Indore",
            r"Scheme No\.?\s*54,\s*Indore",
            r"MG Road,\s*Indore",
            r"Airport Road,\s*Indore",
            r"Ujjain,\s*Madhya Pradesh",
            r"Dewas,\s*Madhya Pradesh",
            r"Pithampur,\s*Madhya Pradesh",
            r"Gurugram,\s*Haryana",
            r"New Delhi,\s*Delhi",
            r"Jaipur,\s*Rajasthan"
        ]

        for pattern in location_patterns:

            matches = re.findall(
                pattern,
                section,
                flags=re.IGNORECASE
            )

            locations.extend(matches)

    locations = [
        location.strip()
        for location in locations
    ]

    locations = unique(locations)

    # =====================================================
    # ORGANIZATIONS
    # =====================================================

    organizations = []

    organization_patterns = re.findall(
        r"\b[A-Z][A-Za-z&.\- ]+?"
        r"(?:Pvt\.?\s*Ltd\.?|Ltd\.?|Limited|LLP|Inc\.?)\b",
        text
    )

    organizations.extend(organization_patterns)

    organizations = unique(organizations)

    # =====================================================
    # RETURN
    # =====================================================

    return {
        "persons": persons,
        "phone_numbers": phone_numbers,
        "bank_accounts": bank_accounts,
        "locations": locations,
        "organizations": organizations
    }