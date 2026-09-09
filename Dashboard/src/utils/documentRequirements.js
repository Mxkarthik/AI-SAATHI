const DOCUMENTS = {
  identity: {
    id: "identity",
    category: "Identity verification document",
    description: "Government-issued identity document",
  },
  pan: {
    id: "pan",
    category: "PAN or tax document",
    description: "PAN or other tax identification document",
  },
  income: {
    id: "income",
    category: "Income-related proof",
    description: "Recent income or cash-flow supporting document",
  },
  land: {
    id: "land",
    category: "Agricultural or land-related document",
    description: "Land ownership, lease, or cultivation document",
  },
  tractorQuotation: {
    id: "tractorQuotation",
    category: "Loan-purpose supporting document",
    description: "Tractor quotation or pro forma invoice",
  },
  cropPlan: {
    id: "cropPlan",
    category: "Agricultural supporting document",
    description: "Crop, cultivation, or seasonal activity details",
  },
  bankStatement: {
    id: "bankStatement",
    category: "Bank-required supporting document",
    description: "Recent bank statement or account activity record",
  },
  bankForm: {
    id: "bankForm",
    category: "Bank-required supporting document",
    description: "Bank application or declaration form",
  },
};

const COMMON_DOCUMENTS = ["identity", "pan", "income"];

export const BANKS = {
  andhraBank: { id: "andhraBank", name: "Andhra Bank" },
  bankOfBaroda: { id: "bankOfBaroda", name: "Bank of Baroda" },
  punjabNationalBank: { id: "punjabNationalBank", name: "Punjab National Bank" },
};

export const LOAN_TYPES = {
  agricultureTractor: { id: "agricultureTractor", name: "Agriculture Tractor Loan" },
  cropLoan: { id: "cropLoan", name: "Crop Loan" },
};

const REQUIREMENTS = {
  andhraBank: {
    agricultureTractor: [...COMMON_DOCUMENTS, "land", "tractorQuotation", "bankStatement"],
    cropLoan: [...COMMON_DOCUMENTS, "land", "cropPlan", "bankStatement"],
  },
  bankOfBaroda: {
    agricultureTractor: [...COMMON_DOCUMENTS, "land", "tractorQuotation", "bankForm"],
    cropLoan: [...COMMON_DOCUMENTS, "land", "cropPlan", "bankForm"],
  },
  punjabNationalBank: {
    agricultureTractor: [...COMMON_DOCUMENTS, "land", "tractorQuotation", "bankStatement", "bankForm"],
    cropLoan: [...COMMON_DOCUMENTS, "land", "cropPlan", "bankStatement", "bankForm"],
  },
};

export function getDocumentRequirements(bankId, loanTypeId) {
  const requirementIds = REQUIREMENTS[bankId]?.[loanTypeId] || [];
  return requirementIds.map((documentId) => DOCUMENTS[documentId]);
}

export const documentRequirementNotice =
  "This is an application document checklist for this workflow, not an official bank requirement.";