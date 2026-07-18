import type {
  BillingMethod,
  RentalContractRecord,
} from "@/features/rental/types/RentalContract";

import type { RentalAggregate } from "@/features/rental/aggregate";

/**
 * Billing methods that require Unit Rate > 0 on the rental contract.
 */
const UNIT_RATE_REQUIRED_METHODS: BillingMethod[] = [
  "Per Hour",
  "Per Day",
  "Per Week",
  "Per Month",
];

/**
 * Billing methods that require Contract Amount > 0 on the rental contract.
 */
const CONTRACT_AMOUNT_REQUIRED_METHODS: BillingMethod[] = [
  "One Lot",
];

/**
 * Editable fields on the Billing Configuration form. Rental Type and
 * Billing Method are read-only and are not part of this shape - they are
 * displayed directly from the resolved contract/rental values.
 */
export interface RentalContractFormValues {
  unitRate: number;
  minimumBillableHours?: number;
  overtimeRate?: number;
  standbyRate?: number;
  mobilizationFee?: number;
  demobilizationFee?: number;
  fuelCharge?: number;
  operatorIncluded: boolean;
  operatorRate?: number;
  taxRate?: number;
  withholdingTax?: number;
  contractAmount?: number;
  remarks?: string;
}

export interface RentalContractFormErrors {
  unitRate?: string;
  contractAmount?: string;
}

/**
 * Resolves the read-only Rental Type / Billing Method shown on the card.
 * Prefers the persisted contract snapshot once one exists; falls back to
 * the values captured on the rental itself before any contract exists.
 */
export function resolveReadOnlyContractHeader(aggregate: RentalAggregate): {
  rentalType?: string;
  billingMethod?: string;
} {
  return {
    rentalType: aggregate.contract?.rentalType ?? aggregate.rental.rentalType,
    billingMethod: aggregate.contract?.billingMethod ?? aggregate.rental.billingMethod,
  };
}

/**
 * True only when the rental's billing method is one the rental contract
 * model actually supports. Some rentals were created with a billing method
 * ("Per Trip", "Per Kilometer") that predates the contract model and has
 * no equivalent there yet - the form should not silently miscompute rates
 * for those, it should say so.
 */
export function isContractRepresentableBillingMethod(
  value: string | undefined
): value is BillingMethod {
  return (
    value === "Per Hour" ||
    value === "Per Day" ||
    value === "Per Week" ||
    value === "Per Month" ||
    value === "Per Cubic Meter" ||
    value === "One Lot"
  );
}

export function getInitialFormValues(
  aggregate: RentalAggregate
): RentalContractFormValues {
  const contract = aggregate.contract;

  return {
    unitRate: contract?.unitRate ?? 0,
    minimumBillableHours: contract?.minimumBillableHours,
    overtimeRate: contract?.overtimeRate,
    standbyRate: contract?.standbyRate,
    mobilizationFee: contract?.mobilizationFee,
    demobilizationFee: contract?.demobilizationFee,
    fuelCharge: contract?.fuelCharge,
    operatorIncluded: contract?.operatorIncluded ?? false,
    operatorRate: contract?.operatorRate,
    taxRate: contract?.taxRate,
    withholdingTax: contract?.withholdingTax,
    contractAmount: contract?.contractAmount,
    remarks: contract?.remarks,
  };
}

export function validateRentalContractForm(
  values: RentalContractFormValues,
  billingMethod: BillingMethod
): RentalContractFormErrors {
  const errors: RentalContractFormErrors = {};

  if (
    UNIT_RATE_REQUIRED_METHODS.includes(billingMethod) &&
    !(values.unitRate > 0)
  ) {
    errors.unitRate = "Unit Rate must be greater than 0 for this billing method.";
  }

  if (
    CONTRACT_AMOUNT_REQUIRED_METHODS.includes(billingMethod) &&
    !((values.contractAmount ?? 0) > 0)
  ) {
    errors.contractAmount = "Contract Amount must be greater than 0 for One Lot billing.";
  }

  return errors;
}

export function isRentalContractFormValid(
  errors: RentalContractFormErrors
): boolean {
  return !errors.unitRate && !errors.contractAmount;
}

/**
 * Changes to merge into an existing contract via updateRentalContract().
 * rentalId, id, timestamps, and identity fields are left untouched by
 * updateRentalContract() itself.
 */
export function buildContractChanges(
  values: RentalContractFormValues
): Partial<RentalContractRecord> {
  return { ...values };
}

/**
 * Full payload for creating a brand new contract via createRentalContract().
 * Rental Type, Billing Method, and identity/linking fields that are not
 * part of the Billing Configuration field list are derived from the
 * aggregate rather than asked of the user.
 */
export function buildNewContractInput(
  aggregate: RentalAggregate,
  values: RentalContractFormValues,
  billingMethod: BillingMethod
): Omit<RentalContractRecord, "id" | "createdAt" | "updatedAt"> {
  const { rental } = aggregate;

  return {
    rentalId: rental.id,
    contractNo: rental.rentalNumber ?? rental.id,
    customerId: rental.customerId ?? "",
    equipmentId: rental.equipmentId,
    projectId: rental.projectId ?? "",
    rentalType: rental.rentalType === "Bare Rental" ? "Bare Rental" : "Operated Rental",
    billingMethod,
    currency: "PHP",
    startDate: rental.dateOut,
    expectedEndDate: rental.expectedReturn ?? rental.dateOut,
    status: "Active",
    ...values,
  };
}
