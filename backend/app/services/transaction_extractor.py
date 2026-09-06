import re


def extract_transactions(text: str):

    transactions = []

    # Find the Financial Records section
    section_match = re.search(
        r"4\.\s*Financial Records"
        r"(.*?)(?=5\.\s*Locations)",
        text,
        flags=re.IGNORECASE | re.DOTALL
    )

    if not section_match:
        return []

    section = section_match.group(1)

    # Date
    # From Account
    # To Account
    # Amount
    # Reference

    pattern = re.compile(
        r"(\d{2}-[A-Za-z]{3}-\d{4})\s+"
        r"(ACC-\d+)\s+"
        r"(ACC-\d+)\s+"
        r"(\d+(?:\.\d+)?)\s+"
        r"(TXN-\d+)",
        flags=re.IGNORECASE
    )

    matches = pattern.findall(section)

    for date, from_account, to_account, amount, reference in matches:

        transactions.append({
            "date": date,
            "from_account": from_account.upper(),
            "to_account": to_account.upper(),
            "amount": float(amount),
            "reference": reference.upper()
        })

    return transactions