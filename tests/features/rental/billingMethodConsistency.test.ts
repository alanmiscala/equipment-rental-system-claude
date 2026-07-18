import { describe, expect, it } from "vitest";

import { rentalBillingMethods, isRentalBillingMethod } from "@/features/rental/types";
import { BillingRateEngine } from "@/features/rental/billing/engine/BillingRateEngine";
import type { BillingCalculationTerms } from "@/features/rental/billing/engine/BillingCalculationTerms";
import type { DeurRecord } from "@/features/rental/deur/types";

/**
 * Regression coverage for the "Per Lot" (rental-side) vs "One Lot"
 * (contract/engine-side) naming split. Before this fix, a rental created
 * with the lot-billing option would never match the engine's "One Lot"
 * case, DEUR eligibility's supported-methods set, or the statement-line
 * calculator's lot check.
 */
describe("billing method literal consistency", () => {
  it("no longer exposes the legacy 'Per Lot' literal on the rental side", () => {
    expect(rentalBillingMethods).not.toContain("Per Lot");
  });

  it("uses the canonical 'One Lot' literal on the rental side", () => {
    expect(rentalBillingMethods).toContain("One Lot");
    expect(isRentalBillingMethod("One Lot")).toBe(true);
  });

  it("BillingRateEngine recognizes the canonical 'One Lot' method and does not fall through to a zero charge", () => {
    const deur: DeurRecord = {
      id: "deur-1",
      rentalId: "rental-1",
      equipmentId: "equipment-1",
      operatorId: "operator-1",
      workDate: "2026-07-01",
      logs: [],
      totalOperatingMinutes: 0,
      totalIdleMinutes: 0,
      totalMaintenanceMinutes: 0,
      totalMealBreakMinutes: 0,
      totalMobilizationMinutes: 0,
      totalDemobilizationMinutes: 0,
      status: "Acknowledged",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    };

    const terms: BillingCalculationTerms = {
      billingMethod: "One Lot",
      unitRate: 1000,
      contractAmount: 50000,
      operatorIncluded: true,
    };

    const result = BillingRateEngine.calculate(deur, terms);

    // Before the fix, an inconsistent literal here would silently fall
    // through the switch and leave operatingCharge at 0.
    expect(result.operatingCharge).toBe(50000);
  });
});
