export function calculateLoanProgress(loan, installments) {
  const paid = installments.filter((i) => i.status === "paid");
  const unpaid = installments.filter((i) => i.status === "unpaid");
  const paidAmount = paid.reduce((total, i) => total + (Number(i.amount) || 0), 0);
  const remainingAmount = unpaid.reduce((total, i) => total + (Number(i.amount) || 0), 0);
  const totalTerms = installments.length || loan.numberOfTerms || 0;
  const percentage = totalTerms > 0 ? Math.round((paid.length / totalTerms) * 100) : 0;

  return {
    totalTerms,
    paidTerms: paid.length,
    remainingTerms: unpaid.length,
    paidAmount,
    remainingAmount,
    percentage
  };
}
