import type { RentalAggregate } from "@/features/rental/aggregate";

export interface BillingEligibility {
  hasConfiguredRate: boolean;
  billingMethod: string | undefined;
  prerequisites: readonly (readonly [boolean, string])[];
  eligibilityMessage: string | undefined;
  canGenerate: boolean;
}

/**
 * Identical to the eligibility computation previously inlined in
 * BillingPanel - extracted verbatim so it can be exercised directly by
 * tests without rendering the component.
 */
export function evaluateBillingEligibility(
  aggregate: RentalAggregate
): BillingEligibility {
  const completedDeur = aggregate.deurs.some(
    (deur) => Boolean(deur.endOfDay) && !deur.billingLocked
  );
  const billingMethod = aggregate.rental.billingMethod ?? aggregate.contract?.billingMethod;
  const hasConfiguredRate = Boolean(
    aggregate.contract && Number.isFinite(aggregate.contract.unitRate)
  );

  const prerequisites = [
    [!["Cancelled", "Closed"].includes(aggregate.rental.status), "Rental is Cancelled or Closed."],
    [Boolean(aggregate.equipment && aggregate.operator), "Equipment and operator relationships are required."],
    [completedDeur, "Complete a billable DEUR before generating billing."],
    [Boolean(billingMethod), "Billing method not specified."],
    [hasConfiguredRate, "Billing rate not configured."],
  ] as const;

  const eligibilityMessage = prerequisites.find(([valid]) => !valid)?.[1];

  return {
    hasConfiguredRate,
    billingMethod,
    prerequisites,
    eligibilityMessage,
    canGenerate: !eligibilityMessage,
  };
}
