import re


def extract_transactions(text: str):

    transactions = []

    # 1. Primary: Find Financial Records section (Benchmark format)
    section_match = re.search(
        r"(?:4\.\s*)?Financial Records"
        r"(.*?)(?=(?:5\.\s*)?Locations|\Z)",
        text,
        flags=re.IGNORECASE | re.DOTALL
    )

    search_text = section_match.group(1) if section_match else text

    # Benchmark pattern: Date From To Amount Reference
    pattern = re.compile(
        r"(\d{2}-[A-Za-z]{3}-\d{4})\s+"
        r"(ACC-\d+)\s+"
        r"(ACC-\d+)\s+"
        r"([\d,]+(?:\.\d+)?)\s+"
        r"([A-Za-z0-9_\-]+)",
        flags=re.IGNORECASE
    )

    matches = pattern.findall(search_text)

    for date, from_account, to_account, amount_str, reference in matches:
        try:
            amount = float(amount_str.replace(",", ""))
            transactions.append({
                "date": date,
                "from_account": from_account.upper(),
                "to_account": to_account.upper(),
                "amount": amount,
                "reference": reference.upper()
            })
        except ValueError:
            continue

    # 2. Secondary: Fallback to general narrative transfers if no structured records
    if len(transactions) == 0:
        narrative_pattern = re.compile(
            r"(?:from\s+)?(ACC-\d+)\s+(?:transferred|sent|paid)\s+(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d+)?)\s+to\s+(ACC-\d+)(?:.*?ref(?:erence)?[:\s]+([A-Za-z0-9\-]+))?",
            flags=re.IGNORECASE
        )
        narrative_matches = narrative_pattern.findall(text)
        for idx, (from_acc, amount_str, to_acc, ref) in enumerate(narrative_matches):
            try:
                amt = float(amount_str.replace(",", ""))
                transactions.append({
                    "date": None,
                    "from_account": from_acc.upper(),
                    "to_account": to_acc.upper(),
                    "amount": amt,
                    "reference": ref.upper() if ref else f"TXN-AUTO-{idx+1:04d}"
                })
            except ValueError:
                continue

    return transactions