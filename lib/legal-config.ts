const requiredLegalValues = {
  operatorName: process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME?.trim(),
  operatorAddress: process.env.NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS?.trim(),
  governingLaw: process.env.NEXT_PUBLIC_LEGAL_GOVERNING_LAW?.trim(),
  venue: process.env.NEXT_PUBLIC_LEGAL_VENUE?.trim(),
  liabilityCap: process.env.NEXT_PUBLIC_LEGAL_LIABILITY_CAP?.trim(),
  effectiveDate: process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE?.trim(),
};

export const legalConfig = {
  operatorName: requiredLegalValues.operatorName || "Socialize service operator",
  operatorAddress:
    requiredLegalValues.operatorAddress || "Operator address required for production",
  governingLaw:
    requiredLegalValues.governingLaw || "Governing law required for production",
  venue: requiredLegalValues.venue || "Venue required for production",
  liabilityCap:
    requiredLegalValues.liabilityCap || "Liability cap required for production",
  effectiveDate: requiredLegalValues.effectiveDate || "July 23, 2026",
  isConfigured: Object.values(requiredLegalValues).every(Boolean),
};
