#!/usr/bin/env bash
#
# Create PayPal SANDBOX billing plans for Dimes Only Network.
#
# Usage:
#   export PAYPAL_CLIENT_ID=<sandbox client id>
#   export PAYPAL_CLIENT_SECRET=<sandbox client secret>
#   bash scripts/create-paypal-sandbox-plans.sh
#
# Optional:
#   export PRODUCT_ID=PROD-XXXX   # reuse an existing product instead of creating one
#   export PAYPAL_BASE=https://api-m.paypal.com   # to target LIVE instead of sandbox
#
# Requirements: curl, jq
#
set -euo pipefail

PAYPAL_BASE="${PAYPAL_BASE:-https://api-m.sandbox.paypal.com}"

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required. Install with: brew install jq   (or: sudo apt-get install jq)" >&2
  exit 1
fi

if [[ -z "${PAYPAL_CLIENT_ID:-}" || -z "${PAYPAL_CLIENT_SECRET:-}" ]]; then
  echo "ERROR: export PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET first (Sandbox REST app credentials)." >&2
  exit 1
fi

echo ">> Using PayPal API: $PAYPAL_BASE"
echo ">> Requesting access token..."

TOKEN_RESPONSE=$(curl -sS -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  -H "Accept: application/json" \
  -H "Accept-Language: en_US" \
  -d "grant_type=client_credentials" \
  "$PAYPAL_BASE/v1/oauth2/token")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "ERROR: Failed to obtain access token. PayPal responded:" >&2
  echo "$TOKEN_RESPONSE" >&2
  echo "" >&2
  echo "Most common cause: the CLIENT_ID / SECRET are Live credentials but PAYPAL_BASE is sandbox (or vice versa)." >&2
  exit 1
fi
echo ">> Got access token."

# --- Product ---------------------------------------------------------------
if [[ -n "${PRODUCT_ID:-}" ]]; then
  echo ">> Reusing existing PRODUCT_ID=$PRODUCT_ID"
else
  echo ">> Creating product..."
  PRODUCT_RESPONSE=$(curl -sS -X POST "$PAYPAL_BASE/v1/catalogs/products" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -H "PayPal-Request-Id: dimesonly-product-$(date +%s)" \
    -d '{
      "name": "Dimes Only Memberships",
      "description": "Dimes Only Network membership tiers",
      "type": "SERVICE",
      "category": "SOFTWARE"
    }')
  PRODUCT_ID=$(echo "$PRODUCT_RESPONSE" | jq -r '.id // empty')
  if [[ -z "$PRODUCT_ID" ]]; then
    echo "ERROR: Failed to create product. Response:" >&2
    echo "$PRODUCT_RESPONSE" >&2
    exit 1
  fi
  echo ">> Created PRODUCT_ID=$PRODUCT_ID"
fi

# --- Helpers ---------------------------------------------------------------
# create_plan <label> <name> <interval_unit> <interval_count> <total_cycles> <price> [setup_fee]
#   total_cycles=0 means infinite
create_plan() {
  local label="$1" name="$2" unit="$3" count="$4" cycles="$5" price="$6" setup_fee="${7:-0}"
  local body
  body=$(jq -n \
    --arg product_id "$PRODUCT_ID" \
    --arg name "$name" \
    --arg unit "$unit" \
    --argjson count "$count" \
    --argjson cycles "$cycles" \
    --arg price "$price" \
    --arg setup_fee "$setup_fee" \
    '{
      product_id: $product_id,
      name: $name,
      description: $name,
      status: "ACTIVE",
      billing_cycles: [{
        frequency: { interval_unit: $unit, interval_count: $count },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: $cycles,
        pricing_scheme: { fixed_price: { value: $price, currency_code: "USD" } }
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: $setup_fee, currency_code: "USD" },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3
      }
    }')

  local resp
  resp=$(curl -sS -X POST "$PAYPAL_BASE/v1/billing/plans" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -H "PayPal-Request-Id: dimesonly-$label-$(date +%s%N)" \
    -d "$body")

  local plan_id
  plan_id=$(echo "$resp" | jq -r '.id // empty')
  if [[ -z "$plan_id" ]]; then
    echo "ERROR: Failed to create plan '$label'. Response:" >&2
    echo "$resp" >&2
    exit 1
  fi

  # Activate (idempotent; plans created with status=ACTIVE are already active, but this
  # is safe for accounts where the default state is CREATED)
  curl -sS -X POST "$PAYPAL_BASE/v1/billing/plans/$plan_id/activate" \
    -H "Authorization: Bearer $ACCESS_TOKEN" >/dev/null || true

  echo "$plan_id"
}

# --- Plans -----------------------------------------------------------------
echo ""
echo ">> Creating billing plans..."

SILVER_MONTHLY=$(create_plan "silver-monthly"        "Silver Monthly"               MONTH 1 0  "11.99")
echo "   Silver Monthly            = $SILVER_MONTHLY"

SILVER_YEARLY=$(create_plan "silver-yearly"          "Silver Yearly"                YEAR  1 0  "119.00")
echo "   Silver Yearly             = $SILVER_YEARLY"

GOLD_MONTHLY=$(create_plan "gold-monthly"            "Gold Monthly"                 MONTH 1 0  "24.99")
echo "   Gold Monthly              = $GOLD_MONTHLY"

GOLD_YEARLY=$(create_plan "gold-yearly"              "Gold Yearly"                  YEAR  1 0  "249.00")
echo "   Gold Yearly               = $GOLD_YEARLY"

DIAMOND_MONTHLY=$(create_plan "diamond-monthly"      "Diamond Monthly"              MONTH 1 0  "49.99")
echo "   Diamond Monthly           = $DIAMOND_MONTHLY"

DIAMOND_YEARLY_FULL=$(create_plan "diamond-yearly-full" "Diamond Yearly (Full)"     YEAR  1 0  "499.00")
echo "   Diamond Yearly Full       = $DIAMOND_YEARLY_FULL"

DIAMOND_YEARLY_SPLIT=$(create_plan "diamond-yearly-split" "Diamond Yearly (12-Month Split)" MONTH 1 12 "49.99")
echo "   Diamond Yearly Split      = $DIAMOND_YEARLY_SPLIT"

ELITE_MONTHLY=$(create_plan "elite-monthly"          "Elite Business Owner"         MONTH 1 12 "1250.00" "250.00")
echo "   Elite Monthly             = $ELITE_MONTHLY"

# --- Output ----------------------------------------------------------------
cat <<EOF

============================================================
DONE. Paste these into Supabase → Project Settings → Secrets
(overwrite the existing Live values):
============================================================
PAYPAL_SILVER_MONTHLY_PLAN_ID=$SILVER_MONTHLY
PAYPAL_SILVER_YEARLY_PLAN_ID=$SILVER_YEARLY
PAYPAL_GOLD_MONTHLY_PLAN_ID=$GOLD_MONTHLY
PAYPAL_GOLD_YEARLY_PLAN_ID=$GOLD_YEARLY
PAYPAL_DIAMOND_MONTHLY_PLAN_ID=$DIAMOND_MONTHLY
PAYPAL_DIAMOND_YEARLY_FULL_PLAN_ID=$DIAMOND_YEARLY_FULL
PAYPAL_DIAMOND_YEARLY_SPLIT_PLAN_ID=$DIAMOND_YEARLY_SPLIT
PAYPAL_ELITE_MONTHLY_PLAN_ID=$ELITE_MONTHLY

(Product: $PRODUCT_ID — save this if you want to re-run and reuse it via PRODUCT_ID=... )
============================================================
EOF
