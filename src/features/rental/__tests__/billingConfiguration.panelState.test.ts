import { beforeEach, describe, expect, it } from "vitest";

import { evaluateBillingEligibility } from "../workspace/billing/billingEligibility";
import {
  buildNewContractInput,
  buildContractChanges,
} from "../workspace/billing/contractForm";
import { createRentalContract } from "../utils/createRentalContract";
import { updateRentalContract } from "../utils/updateRentalContract";
import { rentalContractRepository } from "../repository/rentalContractRepository";
import { buildRentalAggregate } from "../aggregate/builders/buildRentalAggregate";
import type { RentalRecord } from "../types";
import type { Operator } from "@/features/operators/types";
import type { EquipmentRecord } from "@/features/equipment/types";
import type { DeurRecord } from "../deur/types";

function eligibleRental(): RentalRecord {
  return {
    id: "rental-1",
    equipmentId: "equipment-1",
    customer: "Acme Co.",
    project: "Project X",
    rentedBy: "",
    dateOut: "2026-07-01",
    statusId: "",
    status: "Active",
    rentalType: "Operated Rental",
    billingMethod: "Per Hour",
  };
}

function completedDeur(): DeurRecord {
  return {
    id: "deur-1",
    rentalId: "rental-1",
    equipmentId: "equipment-1",
    operatorId: "operator-1",
    workDate: "2026-07-01",
    logs: [],
    totalOperatingMinutes: 480,
    totalIdleMinutes: 0,
    totalMaintenanceMinutes: 0,
    totalMealBreakMinutes: 0,
    totalMobilizationMinutes: 0,
    totalDemobilizationMinutes: 0,
    status: "Acknowledged",
    endOfDay: "17:00",
    billingLocked: false,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  } as DeurRecord;
}

describe("Generate Billing enabled after a successful Billing Configuration save", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("is disabled beforehand with 'Billing rate not configured.', and enabled immediately after save", () => {
    const rental = eligibleRental();
    const equipment = { id: "equipment-1" } as EquipmentRecord;
    const operator = { id: "operator-1" } as Operator;
    const deurs = [completedDeur()];

    // Before: no contract yet.
    const aggregateBefore = buildRentalAggregate({
      rental,
      equipment,
      operator,
      deurs,
    });

    const before = evaluateBillingEligibility(aggregateBefore);
    expect(before.canGenerate).toBe(false);
    expect(before.eligibilityMessage).toBe("Billing rate not configured.");

    // Simulates BillingConfigurationCard.handleSave() for a rental with no
    // existing contract: buildNewContractInput -> createRentalContract ->
    // (RentalContext.addContract would call) rentalContractRepository.create.
    const input = buildNewContractInput(
      { ...aggregateBefore },
      { unitRate: 750, operatorIncluded: true },
      "Per Hour"
    );
    const created = createRentalContract(input);
    rentalContractRepository.create(created);

    // After: aggregate rebuilt with the newly saved contract attached,
    // exactly as RentalWorkspaceProvider does when `contracts` changes.
    const aggregateAfter = buildRentalAggregate({
      rental,
      equipment,
      operator,
      deurs,
      contract: created,
    });

    const after = evaluateBillingEligibility(aggregateAfter);
    expect(after.hasConfiguredRate).toBe(true);
    expect(after.eligibilityMessage).toBeUndefined();
    expect(after.canGenerate).toBe(true);
  });

  it("stays enabled after editing an existing contract via update", () => {
    const rental = eligibleRental();
    const equipment = { id: "equipment-1" } as EquipmentRecord;
    const operator = { id: "operator-1" } as Operator;
    const deurs = [completedDeur()];

    const input = buildNewContractInput(
      buildRentalAggregate({ rental, equipment, operator, deurs }),
      { unitRate: 750, operatorIncluded: true },
      "Per Hour"
    );
    const existing = createRentalContract(input);
    rentalContractRepository.create(existing);

    // Simulates editing the rate through BillingConfigurationCard again.
    const changes = buildContractChanges({ unitRate: 900, operatorIncluded: true });
    const updated = updateRentalContract(existing, changes);
    rentalContractRepository.update(updated);

    const aggregateAfterUpdate = buildRentalAggregate({
      rental,
      equipment,
      operator,
      deurs,
      contract: updated,
    });

    const after = evaluateBillingEligibility(aggregateAfterUpdate);
    expect(after.canGenerate).toBe(true);
    expect(aggregateAfterUpdate.contract?.unitRate).toBe(900);
  });
});
