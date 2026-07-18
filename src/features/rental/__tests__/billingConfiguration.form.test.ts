import { describe, expect, it } from "vitest";

import {
  buildContractChanges,
  buildNewContractInput,
  getInitialFormValues,
  isContractRepresentableBillingMethod,
  isRentalContractFormValid,
  resolveReadOnlyContractHeader,
  validateRentalContractForm,
  type RentalContractFormValues,
} from "../workspace/billing/contractForm";
import type { RentalAggregate } from "../aggregate";
import type { RentalRecord } from "../types";
import type { RentalContractRecord } from "../types/RentalContract";

function baseRental(overrides: Partial<RentalRecord> = {}): RentalRecord {
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
    ...overrides,
  };
}

function baseContract(overrides: Partial<RentalContractRecord> = {}): RentalContractRecord {
  return {
    id: "contract-1",
    rentalId: "rental-1",
    contractNo: "CN-0001",
    customerId: "customer-1",
    equipmentId: "equipment-1",
    projectId: "project-1",
    rentalType: "Operated Rental",
    billingMethod: "Per Hour",
    currency: "PHP",
    unitRate: 1500,
    operatorIncluded: false,
    startDate: "2026-07-01",
    expectedEndDate: "2026-08-01",
    status: "Active",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseAggregate(overrides: Partial<RentalAggregate> = {}): RentalAggregate {
  return {
    rental: baseRental(),
    contract: undefined,
    equipmentItems: [],
    deurs: [],
    billing: {
      totalOperatingCharge: 0,
      totalIdleCharge: 0,
      totalMobilizationCharge: 0,
      totalDemobilizationCharge: 0,
      totalAdjustment: 0,
      subtotal: 0,
      invoiced: 0,
      collected: 0,
      outstanding: 0,
    },
    ...overrides,
  };
}

describe("resolveReadOnlyContractHeader", () => {
  it("falls back to the rental's own values when no contract exists yet", () => {
    const aggregate = baseAggregate();
    expect(resolveReadOnlyContractHeader(aggregate)).toEqual({
      rentalType: "Operated Rental",
      billingMethod: "Per Hour",
    });
  });

  it("prefers the persisted contract snapshot once one exists", () => {
    const aggregate = baseAggregate({
      contract: baseContract({ billingMethod: "One Lot" }),
    });
    expect(resolveReadOnlyContractHeader(aggregate).billingMethod).toBe("One Lot");
  });
});

describe("getInitialFormValues", () => {
  it("returns an empty/default form when no contract exists", () => {
    const values = getInitialFormValues(baseAggregate());
    expect(values.unitRate).toBe(0);
    expect(values.operatorIncluded).toBe(false);
    expect(values.contractAmount).toBeUndefined();
  });

  it("prefills every editable field from an existing contract", () => {
    const contract = baseContract({
      unitRate: 2500,
      standbyRate: 300,
      operatorIncluded: true,
      contractAmount: 100000,
      remarks: "VIP customer",
    });
    const values = getInitialFormValues(baseAggregate({ contract }));
    expect(values.unitRate).toBe(2500);
    expect(values.standbyRate).toBe(300);
    expect(values.operatorIncluded).toBe(true);
    expect(values.contractAmount).toBe(100000);
    expect(values.remarks).toBe("VIP customer");
  });
});

describe("validateRentalContractForm", () => {
  const editableDefaults: RentalContractFormValues = {
    unitRate: 0,
    operatorIncluded: false,
  };

  it.each(["Per Hour", "Per Day", "Per Week", "Per Month"] as const)(
    "requires Unit Rate > 0 for %s",
    (method) => {
      const errors = validateRentalContractForm(editableDefaults, method);
      expect(errors.unitRate).toBeDefined();

      const valid = validateRentalContractForm({ ...editableDefaults, unitRate: 100 }, method);
      expect(valid.unitRate).toBeUndefined();
    }
  );

  it("requires Contract Amount > 0 for One Lot", () => {
    const errors = validateRentalContractForm(editableDefaults, "One Lot");
    expect(errors.contractAmount).toBeDefined();

    const valid = validateRentalContractForm(
      { ...editableDefaults, contractAmount: 50000 },
      "One Lot"
    );
    expect(valid.contractAmount).toBeUndefined();
  });

  it("does not require Unit Rate for One Lot, and does not require Contract Amount for Per Hour", () => {
    const oneLot = validateRentalContractForm(
      { ...editableDefaults, contractAmount: 50000 },
      "One Lot"
    );
    expect(oneLot.unitRate).toBeUndefined();

    const perHour = validateRentalContractForm(
      { ...editableDefaults, unitRate: 500 },
      "Per Hour"
    );
    expect(perHour.contractAmount).toBeUndefined();
  });

  it("allows other optional fields to be zero", () => {
    const values: RentalContractFormValues = {
      ...editableDefaults,
      unitRate: 500,
      standbyRate: 0,
      fuelCharge: 0,
      mobilizationFee: 0,
    };
    const errors = validateRentalContractForm(values, "Per Hour");
    expect(isRentalContractFormValid(errors)).toBe(true);
  });

  it("Per Cubic Meter has no additional required field beyond the base type", () => {
    const errors = validateRentalContractForm(editableDefaults, "Per Cubic Meter");
    expect(isRentalContractFormValid(errors)).toBe(true);
  });
});

describe("isContractRepresentableBillingMethod", () => {
  it("accepts every contract-side billing method", () => {
    for (const method of ["Per Hour", "Per Day", "Per Week", "Per Month", "Per Cubic Meter", "One Lot"]) {
      expect(isContractRepresentableBillingMethod(method)).toBe(true);
    }
  });

  it("rejects rental-only billing methods that have no contract equivalent", () => {
    expect(isContractRepresentableBillingMethod("Per Trip")).toBe(false);
    expect(isContractRepresentableBillingMethod("Per Kilometer")).toBe(false);
    expect(isContractRepresentableBillingMethod(undefined)).toBe(false);
  });
});

describe("create contract payload", () => {
  it("builds a full contract input from the aggregate and form values", () => {
    const aggregate = baseAggregate({
      rental: baseRental({ id: "rental-9", customerId: "customer-9", projectId: "project-9" }),
    });
    const values: RentalContractFormValues = {
      unitRate: 800,
      operatorIncluded: true,
      contractAmount: 0,
    };

    const input = buildNewContractInput(aggregate, values, "Per Hour");

    expect(input.rentalId).toBe("rental-9");
    expect(input.customerId).toBe("customer-9");
    expect(input.projectId).toBe("project-9");
    expect(input.billingMethod).toBe("Per Hour");
    expect(input.unitRate).toBe(800);
    expect(input.operatorIncluded).toBe(true);
    expect(input.status).toBe("Active");
  });
});

describe("update contract payload", () => {
  it("only carries the editable fields as changes", () => {
    const values: RentalContractFormValues = {
      unitRate: 900,
      standbyRate: 50,
      operatorIncluded: true,
    };
    const changes = buildContractChanges(values);
    expect(changes).toEqual(values);
    expect(changes).not.toHaveProperty("rentalId");
    expect(changes).not.toHaveProperty("id");
  });
});
