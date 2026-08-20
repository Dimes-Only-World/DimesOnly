import React from "react";
import { Input } from "@/components/ui/input";
import { getGeneralAdmissionPrice, getPlusPricing } from "@/lib/eventTickets";

export interface EventTicketingValues {
  free_spots_dimes?: number;
  free_spots_strippers?: number;
  free_spots_exotics?: number;
  free_spots_normals?: number;
  free_spots_males?: number;
  free_spots_females?: number;
  free_spots_silver_plus?: number;
  free_spots_diamond_plus?: number;
  free_spots_elite_plus?: number;
  free_spots_plus?: number;
  general_admission_price?: number;
  males_price?: number;
  females_price?: number;
  plus_ticket_mode?: string;
  plus_discount_percent?: number;
  price?: number;
}

interface Props {
  values: EventTicketingValues;
  onChange: (patch: Partial<EventTicketingValues>) => void;
}

const NumberField: React.FC<{
  label: string;
  hint?: string;
  value: number;
  disabled?: boolean;
  step?: string;
  prefix?: string;
  onChange: (v: number) => void;
}> = ({ label, hint, value, disabled, step, prefix, onChange }) => (
  <div className={disabled ? "opacity-50" : ""}>
    <label className="block text-sm font-medium mb-1">
      {prefix}
      {label}
    </label>
    <Input
      type="number"
      min="0"
      step={step}
      disabled={disabled}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) =>
        onChange(step ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)
      }
    />
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

/**
 * Free-spot allocations + pricing, shared by the Add and Edit event forms.
 * Mutual-exclusion rules:
 *  - Free Dimes > 0 greys out Free Strippers / Free Exotics
 *  - Free Normals > 0 greys out Free Males / Free Females
 *  - Free Plus > 0 greys out Free Silver / Diamond / Elite Plus
 *  - General Admission > 0 greys out Males Price / Females Price
 */
const EventTicketingFields: React.FC<Props> = ({ values, onChange }) => {
  const v = (k: keyof EventTicketingValues) => Number(values[k] ?? 0) || 0;

  const dimesUsed = v("free_spots_dimes") > 0;
  const normalsUsed = v("free_spots_normals") > 0;
  const plusAllUsed = v("free_spots_plus") > 0;
  const generalUsed = v("general_admission_price") > 0;
  const plusMode = (values.plus_ticket_mode || "free").toLowerCase();
  const plusPricing = getPlusPricing(values as any, "male");
  const generalPreview = getGeneralAdmissionPrice(values as any, "male");

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="text-lg font-medium">Free Spots</h3>

      {/* Dimes row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NumberField
          label="Free Dimes"
          hint="Covers strippers + exotics together"
          value={v("free_spots_dimes")}
          onChange={(n) => onChange({ free_spots_dimes: n })}
        />
        <NumberField
          label="Free Strippers"
          value={v("free_spots_strippers")}
          disabled={dimesUsed}
          onChange={(n) => onChange({ free_spots_strippers: n })}
        />
        <NumberField
          label="Free Exotics"
          value={v("free_spots_exotics")}
          disabled={dimesUsed}
          onChange={(n) => onChange({ free_spots_exotics: n })}
        />
      </div>

      {/* Normals row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NumberField
          label="Free Normals"
          hint="Covers males + females together"
          value={v("free_spots_normals")}
          onChange={(n) => onChange({ free_spots_normals: n })}
        />
        <NumberField
          label="Free Males"
          value={v("free_spots_males")}
          disabled={normalsUsed}
          onChange={(n) => onChange({ free_spots_males: n })}
        />
        <NumberField
          label="Free Females"
          value={v("free_spots_females")}
          disabled={normalsUsed}
          onChange={(n) => onChange({ free_spots_females: n })}
        />
      </div>

      {/* Plus row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <NumberField
          label="Free Plus (all Plus members)"
          hint="Overrides the tier fields"
          value={v("free_spots_plus")}
          onChange={(n) => onChange({ free_spots_plus: n })}
        />
        <NumberField
          label="Free Silver Plus"
          value={v("free_spots_silver_plus")}
          disabled={plusAllUsed}
          onChange={(n) => onChange({ free_spots_silver_plus: n })}
        />
        <NumberField
          label="Free Diamond Plus"
          value={v("free_spots_diamond_plus")}
          disabled={plusAllUsed}
          onChange={(n) => onChange({ free_spots_diamond_plus: n })}
        />
        <NumberField
          label="Free Elite Plus"
          value={v("free_spots_elite_plus")}
          disabled={plusAllUsed}
          onChange={(n) => onChange({ free_spots_elite_plus: n })}
        />
      </div>

      <h3 className="text-lg font-medium pt-2">Pricing</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NumberField
          label="General Admission ($)"
          hint="When set, gender prices are ignored"
          step="0.01"
          value={v("general_admission_price")}
          onChange={(n) => onChange({ general_admission_price: n })}
        />
        <NumberField
          label="Males Price ($)"
          step="0.01"
          value={v("males_price")}
          disabled={generalUsed}
          onChange={(n) => onChange({ males_price: n })}
        />
        <NumberField
          label="Females Price ($)"
          step="0.01"
          value={v("females_price")}
          disabled={generalUsed}
          onChange={(n) => onChange({ females_price: n })}
        />
      </div>

      <h3 className="text-lg font-medium pt-2">Plus Member Tickets</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Plus tickets are</label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={plusMode}
            onChange={(e) => onChange({ plus_ticket_mode: e.target.value })}
          >
            <option value="free">Free</option>
            <option value="discount">Discounted</option>
          </select>
        </div>
        {plusMode === "discount" && (
          <>
            <NumberField
              label="Discount (%)"
              step="0.01"
              value={v("plus_discount_percent")}
              onChange={(n) =>
                onChange({ plus_discount_percent: Math.min(100, Math.max(0, n)) })
              }
            />
            <div className="flex flex-col justify-end">
              <p className="text-sm text-muted-foreground">
                Plus members pay{" "}
                <span className="font-semibold text-foreground">
                  ${plusPricing.price.toFixed(2)}
                </span>{" "}
                (from ${generalPreview.toFixed(2)} general admission)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EventTicketingFields;
