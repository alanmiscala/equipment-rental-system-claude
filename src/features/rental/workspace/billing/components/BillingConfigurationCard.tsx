import { useEffect, useState } from "react";

import { useRental } from "@/features/rental/context/RentalContext";
import { useRentalWorkspaceAggregate } from "../..";

import { createRentalContract } from "@/features/rental/utils/createRentalContract";
import { updateRentalContract } from "@/features/rental/utils/updateRentalContract";

import {
  buildContractChanges,
  buildNewContractInput,
  getInitialFormValues,
  isContractRepresentableBillingMethod,
  isRentalContractFormValid,
  resolveReadOnlyContractHeader,
  validateRentalContractForm,
  type RentalContractFormValues,
} from "../contractForm";

function toNumberOrUndefined(raw: string): number | undefined {
  if (raw.trim() === "") {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function BillingConfigurationCard() {
  const aggregate = useRentalWorkspaceAggregate();
  const { addContract, updateContract } = useRental();

  const { rentalType, billingMethod } = resolveReadOnlyContractHeader(aggregate);

  const [values, setValues] = useState<RentalContractFormValues>(() =>
    getInitialFormValues(aggregate)
  );
  const [saveError, setSaveError] = useState<string | undefined>();
  const [savedAt, setSavedAt] = useState<number | undefined>();

  useEffect(() => {
    setValues(getInitialFormValues(aggregate));
    // Re-sync whenever the persisted contract changes (including right
    // after this component's own save).
  }, [aggregate.contract]);

  const representable = isContractRepresentableBillingMethod(billingMethod);

  const errors = representable
    ? validateRentalContractForm(values, billingMethod)
    : {};

  function updateField<K extends keyof RentalContractFormValues>(
    key: K,
    value: RentalContractFormValues[K]
  ) {
    setSavedAt(undefined);
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setSaveError(undefined);

    if (!representable) {
      setSaveError(
        `Billing method "${billingMethod ?? "unknown"}" does not yet support contract-based rate configuration.`
      );
      return;
    }

    const validationErrors = validateRentalContractForm(values, billingMethod);
    if (!isRentalContractFormValid(validationErrors)) {
      return;
    }

    try {
      if (aggregate.contract) {
        const updated = updateRentalContract(
          aggregate.contract,
          buildContractChanges(values)
        );
        updateContract(updated);
      } else {
        const created = createRentalContract(
          buildNewContractInput(aggregate, values, billingMethod)
        );
        addContract(created);
      }
      setSavedAt(Date.now());
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save billing configuration."
      );
    }
  }

  return (
    <div className="min-w-0 rounded-xl border bg-white p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Billing Configuration</h2>
        {savedAt && (
          <span className="text-sm text-emerald-600">Billing configuration saved.</span>
        )}
      </div>

      {!representable && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Billing method "{billingMethod ?? "unknown"}" does not yet support contract-based
          rate configuration.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm text-slate-500">Rental Type</label>
          <div className="mt-1 rounded border bg-slate-50 px-3 py-2 text-sm">
            {rentalType ?? "-"}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-500">Billing Method</label>
          <div className="mt-1 rounded border bg-slate-50 px-3 py-2 text-sm">
            {billingMethod ?? "-"}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-500">Unit Rate</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={values.unitRate}
            onChange={(e) => updateField("unitRate", Number(e.target.value) || 0)}
          />
          {errors.unitRate && (
            <div className="mt-1 text-xs text-red-600">{errors.unitRate}</div>
          )}
        </div>

        <div>
          <label className="text-sm text-slate-500">Minimum Billable Hours</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={values.minimumBillableHours ?? ""}
            onChange={(e) =>
              updateField("minimumBillableHours", toNumberOrUndefined(e.target.value))
            }
          />
        </div>

        <div>
          <label className="text-sm text-slate-500">Overtime Rate</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={values.overtimeRate ?? ""}
            onChange={(e) => updateField("overtimeRate", toNumberOrUndefined(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm text-slate-500">Standby Rate</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={values.standbyRate ?? ""}
            onChange={(e) => updateField("standbyRate", toNumberOrUndefined(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm text-slate-500">Mobilization Fee</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={values.mobilizationFee ?? ""}
            onChange={(e) =>
              updateField("mobilizationFee", toNumberOrUndefined(e.target.value))
            }
          />
        </div>

        <div>
          <label className="text-sm text-slate-500">Demobilization Fee</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={values.demobilizationFee ?? ""}
            onChange={(e) =>
              updateField("demobilizationFee", toNumberOrUndefined(e.target.value))
            }
          />
        </div>

        <div>
          <label className="text-sm text-slate-500">Fuel Charge</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={values.fuelCharge ?? ""}
            onChange={(e) => updateField("fuelCharge", toNumberOrUndefined(e.target.value))}
          />
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            id="operatorIncluded"
            type="checkbox"
            checked={values.operatorIncluded}
            onChange={(e) => updateField("operatorIncluded", e.target.checked)}
          />
          <label htmlFor="operatorIncluded" className="text-sm text-slate-600">
            Operator Included
          </label>
        </div>

        <div>
          <label className="text-sm text-slate-500">Operator Rate</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={values.operatorRate ?? ""}
            onChange={(e) => updateField("operatorRate", toNumberOrUndefined(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm text-slate-500">Tax Rate</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={values.taxRate ?? ""}
            onChange={(e) => updateField("taxRate", toNumberOrUndefined(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm text-slate-500">Withholding Tax</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={values.withholdingTax ?? ""}
            onChange={(e) =>
              updateField("withholdingTax", toNumberOrUndefined(e.target.value))
            }
          />
        </div>

        <div>
          <label className="text-sm text-slate-500">Contract Amount</label>
          <input
            type="number"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={values.contractAmount ?? ""}
            onChange={(e) =>
              updateField("contractAmount", toNumberOrUndefined(e.target.value))
            }
          />
          {errors.contractAmount && (
            <div className="mt-1 text-xs text-red-600">{errors.contractAmount}</div>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm text-slate-500">Remarks</label>
          <textarea
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={values.remarks ?? ""}
            onChange={(e) => updateField("remarks", e.target.value)}
          />
        </div>
      </div>

      {saveError && <div className="text-sm text-red-600">{saveError}</div>}

      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!representable}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {aggregate.contract ? "Update Billing Configuration" : "Save Billing Configuration"}
        </button>
      </div>
    </div>
  );
}
