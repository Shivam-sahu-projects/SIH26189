// Sample realistic criminal investigation data for instant testing and demonstration

export const SAMPLE_CASE = {
  id: 9901,
  case_number: "CASE-2026-0048",
  title: "Indore-Gurugram Multi-State Cyber Mule & Layering Syndicate",
  status: "Under Investigation",
  primary_location: "Indore, Madhya Pradesh",
  report_date: "2026-02-14",
  created_at: new Date().toISOString(),
  documents: [
    {
      id: 101,
      filename: "FIR_Cyber_Fraud_0048_2026.pdf",
      document_type: "Police First Information Report (FIR)",
      created_at: "2026-02-14T10:30:00Z",
    },
    {
      id: 102,
      filename: "Bank_Audit_Mule_Layering_Statement.pdf",
      document_type: "Bank Fraud Monitoring Trail",
      created_at: "2026-02-15T14:20:00Z",
    },
    {
      id: 103,
      filename: "CDR_Call_Analysis_Report.pdf",
      document_type: "Telecom CDR Summary",
      created_at: "2026-02-16T11:15:00Z",
    }
  ],
  persons: [
    { id: 1, name: "Vikram Malhotra", confidence: 0.94, review_status: "approved" },
    { id: 2, name: "Rohit Verma", confidence: 0.91, review_status: "approved" },
    { id: 3, name: "Karan Singhania", confidence: 0.88, review_status: "approved" },
    { id: 4, name: "Pooja Mehta", confidence: 0.85, review_status: "pending" },
    { id: 5, name: "Suresh Nair", confidence: 0.79, review_status: "pending" },
    { id: 6, name: "Amitabh Sen", confidence: 0.76, review_status: "pending" },
  ],
  phone_numbers: [
    { id: 11, number: "+91 9876543210" },
    { id: 12, number: "+91 9823456789" },
    { id: 13, number: "+91 9123456780" },
    { id: 14, number: "+91 9765432198" },
  ],
  bank_accounts: [
    { id: 21, account_number: "ACC-4921-9876" },
    { id: 22, account_number: "ACC-8392-1049" },
    { id: 23, account_number: "ACC-7721-3940" },
    { id: 24, account_number: "ACC-6102-4412" },
  ],
  locations: [
    { id: 31, name: "Vijay Nagar, Indore" },
    { id: 32, name: "Palasia, Indore" },
    { id: 33, name: "Cyber City, Gurugram" },
    { id: 34, name: "Bhopal, Madhya Pradesh" },
  ],
  organizations: [
    { id: 41, name: "Orion Logistics Pvt. Ltd." },
    { id: 42, name: "Vertex Trading Services LLP" },
    { id: 43, name: "Nexora Technologies Pvt. Ltd." },
  ],
  relationships: [
    { id: 51, source: "Vikram Malhotra", relationship_type: "OPERATES", target: "+91 9876543210", confidence: 0.95 },
    { id: 52, source: "Vikram Malhotra", relationship_type: "BENEFICIARY_OF", target: "ACC-4921-9876", confidence: 0.92 },
    { id: 53, source: "Rohit Verma", relationship_type: "USES", target: "+91 9823456789", confidence: 0.90 },
    { id: 54, source: "Rohit Verma", relationship_type: "ACC_HOLDER", target: "ACC-8392-1049", confidence: 0.96 },
    { id: 55, source: "+91 9876543210", relationship_type: "CONTACTED", target: "+91 9823456789", confidence: 0.98 },
    { id: 56, source: "+91 9823456789", relationship_type: "CONTACTED", target: "+91 9123456780", confidence: 0.89 },
    { id: 57, source: "Karan Singhania", relationship_type: "OWNS", target: "ACC-7721-3940", confidence: 0.91 },
    { id: 58, source: "Karan Singhania", relationship_type: "DIRECTOR", target: "Orion Logistics Pvt. Ltd.", confidence: 0.88 },
    { id: 59, source: "Pooja Mehta", relationship_type: "ACC_HOLDER", target: "ACC-6102-4412", confidence: 0.84 },
    { id: 60, source: "Vikram Malhotra", relationship_type: "ASSOCIATED_WITH", target: "Vijay Nagar, Indore", confidence: 0.87 },
    { id: 61, source: "Suresh Nair", relationship_type: "CONTACTED", target: "+91 9765432198", confidence: 0.81 },
    { id: 62, source: "Amitabh Sen", relationship_type: "EMPLOYED_BY", target: "Nexora Technologies Pvt. Ltd.", confidence: 0.79 },
  ],
  transactions: [
    { id: 71, from_account: "ACC-4921-9876", to_account: "ACC-8392-1049", amount: 450000, date: "2026-02-11", reference: "IMPS-902198210" },
    { id: 72, from_account: "ACC-8392-1049", to_account: "ACC-7721-3940", amount: 420000, date: "2026-02-12", reference: "NEFT-881290314" },
    { id: 73, from_account: "ACC-7721-3940", to_account: "ACC-6102-4412", amount: 390000, date: "2026-02-12", reference: "RTGS-400192831" },
    { id: 74, from_account: "ACC-4921-9876", to_account: "ACC-6102-4412", amount: 180000, date: "2026-02-13", reference: "UPI-771890281" },
    { id: 75, from_account: "ACC-8392-1049", to_account: "ACC-4921-9876", amount: 95000, date: "2026-02-14", reference: "IMPS-119280341" },
  ]
}

export const SAMPLE_FIR_TEXT = `
FIRST INFORMATION REPORT (Under Section 154 Cr.P.C.)
POLICE STATION: Cyber Crime Cell, Indore (M.P.)
FIR No.: 0048/2026 | Date: 14 February 2026

SUBJECT: Organized Cyber Fraud, Money Mule Conduit and Extortion Syndicate

Complainant filed a formal grievance regarding unauthorized debit of ₹15,35,000 via fraudulent banking links.
Investigation revealed that primary suspect Vikram Malhotra (Mobile: +91 9876543210), resident of Vijay Nagar, Indore, was operating a coordinated money laundering syndicate.
Funds were routed into account ACC-4921-9876 held at Central Branch.

Within 45 minutes of receipt, funds amounting to ₹4,50,000 were transferred to accomplice Rohit Verma (Mobile: +91 9823456789), account ACC-8392-1049.
Rohit Verma layered the illicit funds by routing ₹4,20,000 to Karan Singhania (ACC-7721-3940), who operates Orion Logistics Pvt. Ltd. in Palasia, Indore.
Final withdrawal hops occurred through beneficiary Pooja Mehta (ACC-6102-4412) located at Cyber City, Gurugram.

Technical surveillance establishes 18 telephonic contacts between +91 9876543210 and +91 9823456789 during the commission of offense.
Additional contacts identified with Suresh Nair (+91 9765432198) and technical support from Amitabh Sen at Nexora Technologies Pvt. Ltd.
Recommend immediate debit freeze on suspect accounts and Section 91 notices.
`
