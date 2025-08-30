// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    // Required: earnings for a specific recipient (the referrer/upline user)
    const userId = params.get("user_id") || "";
    if (!userId) {
      return json({ error: "Missing user_id" }, 400);
    }

    // Optional filters
    const startDate = params.get("start_date"); // YYYY-MM-DD
    const endDate = params.get("end_date"); // YYYY-MM-DD
    const typeParam = params.get("commission_type"); // comma-separated list
    const qUsername = params.get("q"); // search by buyer username
    const membershipType = params.get("membership_type"); // e.g., silver, gold, etc. (buyer)
    const format = (params.get("format") || "json").toLowerCase(); // json | csv

    const page = Math.max(1, Number(params.get("page") || 1));
    const pageSize = Math.min(200, Math.max(1, Number(params.get("page_size") || 25)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Base set of commission payment types to include by default
    const defaultTypes = [
      'subscription_referral_commission',
      'subscription_upline_referral_commission',
      'referral_commission',
      'upline_referral_commission',
      'diamond_plus_referral_commission',
      'diamond_plus_upline_referral_commission'
    ];
    const types = (typeParam ? typeParam.split(',').map((s) => s.trim()).filter(Boolean) : defaultTypes);

    // Query payments for this earner
    let query = supabase
      .from('payments')
      .select('id, user_id, amount, currency, payment_type, payment_status, referred_by, paypal_order_id, paypal_payment_id, paypal_transaction_id, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .in('payment_type', types)
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('created_at', startDate + 'T00:00:00');
    if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');

    query = query.range(from, to);

    const { data: payments, error: payErr, count } = await query;
    if (payErr) return json({ error: 'payments_query_failed', details: payErr.message }, 500);

    // Early return if empty
    if (!payments || payments.length === 0) {
      if (format === 'csv') {
        const csv = toCsv([], []);
        return new Response(csv, { headers: { ...corsHeaders, 'Content-Type': 'text/csv' } });
      }
      return json({ items: [], total: count || 0, page, page_size: pageSize });
    }

    // Build enrichment indexes
    const subscriptionIds = payments
      .map((p: any) => p.paypal_order_id)
      .filter((s: string | null): s is string => !!s);
    const paypalPaymentIds = payments
      .map((p: any) => p.paypal_payment_id)
      .filter((s: string | null): s is string => !!s);

    // Map payment_id -> tipped_user_id from tips_transactions as a fallback buyer source
    const paymentIds = payments.map((p: any) => p.id).filter(Boolean);
    const tipsBuyerMap = new Map<string, string>();
    const tipsReferrerMap = new Map<string, string>(); // payment_id -> referrer_username
    if (paymentIds.length > 0) {
      const { data: tipsRows, error: tipsErr } = await supabase
        .from('tips_transactions')
        .select('payment_id, tipped_user_id, referrer_username')
        .in('payment_id', paymentIds);
      if (tipsErr) {
        console.warn('tips_transactions lookup failed', tipsErr.message);
      }
      for (const r of (tipsRows || [])) {
        if (r.payment_id && r.tipped_user_id) tipsBuyerMap.set(r.payment_id, r.tipped_user_id);
        if (r.payment_id && r.referrer_username) tipsReferrerMap.set(r.payment_id, r.referrer_username);
      }
    }

    // Build map of direct referral commission earners for the same transaction
    // We will use these to show the middle referrer on upline rows.
    const directByOrderId = new Map<string, string>(); // paypal_order_id -> direct earner user_id
    const directByPaymentId = new Map<string, string>(); // paypal_payment_id -> direct earner user_id
    const directByTxnId = new Map<string, string>(); // paypal_transaction_id -> direct earner user_id

    // Helper to fetch direct commission payments for a given column and id list
    const fetchDirectFor = async (col: 'paypal_order_id' | 'paypal_payment_id' | 'paypal_transaction_id', ids: string[]) => {
      if (!ids || ids.length === 0) return [] as any[];
      const directTypes = [
        'referral_commission',
        'subscription_referral_commission',
        'diamond_plus_referral_commission',
      ];
      const { data, error } = await supabase
        .from('payments')
        .select(`user_id, ${col}`)
        .in(col, ids)
        .in('payment_type', directTypes);
      if (error) {
        console.warn(`direct lookup failed for ${col}`, error.message);
        return [] as any[];
      }
      return data || [];
    };

    // Fetch and index by each identifier type
    const [directOrderRows, directPaymentRows, directTxnRows] = await Promise.all([
      fetchDirectFor('paypal_order_id', subscriptionIds),
      fetchDirectFor('paypal_payment_id', paypalPaymentIds),
      fetchDirectFor('paypal_transaction_id', payments.map((p:any)=>p.paypal_transaction_id).filter(Boolean)),
    ]);

    for (const r of directOrderRows) if (r.paypal_order_id && r.user_id) directByOrderId.set(r.paypal_order_id, r.user_id);
    for (const r of directPaymentRows) if (r.paypal_payment_id && r.user_id) directByPaymentId.set(r.paypal_payment_id, r.user_id);
    for (const r of directTxnRows) if (r.paypal_transaction_id && r.user_id) directByTxnId.set(r.paypal_transaction_id, r.user_id);

    // Map membership_upgrades by order/payment id to user_id
    const muUserByOrderId = new Map<string, string>();
    const muUserByPaymentId = new Map<string, string>();
    if (subscriptionIds.length > 0 || paypalPaymentIds.length > 0) {
      let muQuery = supabase
        .from('membership_upgrades')
        .select('user_id, paypal_order_id, paypal_payment_id');
      // Build OR filter if both arrays present; otherwise use IN on the single present key
      if (subscriptionIds.length > 0 && paypalPaymentIds.length > 0) {
        // Supabase JS: use .or() with CSV lists
        const orderCsv = subscriptionIds.map((s: any) => `"${s}"`).join(',');
        const payCsv = paypalPaymentIds.map((s: any) => `"${s}"`).join(',');
        // @ts-ignore - deno supabase .or typing
        muQuery = muQuery.or(`paypal_order_id.in.(${orderCsv}),paypal_payment_id.in.(${payCsv})`);
      } else if (subscriptionIds.length > 0) {
        muQuery = muQuery.in('paypal_order_id', subscriptionIds);
      } else if (paypalPaymentIds.length > 0) {
        muQuery = muQuery.in('paypal_payment_id', paypalPaymentIds);
      }
      const { data: muRows, error: muErr } = await muQuery as any;
      if (muErr) {
        console.warn('membership_upgrades lookup failed', muErr.message);
      }
      for (const r of (muRows || [])) {
        if (r.paypal_order_id && r.user_id) muUserByOrderId.set(r.paypal_order_id, r.user_id);
        if (r.paypal_payment_id && r.user_id) muUserByPaymentId.set(r.paypal_payment_id, r.user_id);
      }
    }

    // Fetch buyers (derive from subscriptions.user_id or tips_transactions.tipped_user_id)
    const subBuyerIds: string[] = await (async () => {
      if (subscriptionIds.length === 0) return [] as string[];
      const { data: subsForBuyer } = await supabase
        .from('subscriptions')
        .select('user_id, subscription_id')
        .in('subscription_id', subscriptionIds);
      return (subsForBuyer || []).map((s: any) => s.user_id).filter(Boolean);
    })();

    const tipsBuyerIds: string[] = Array.from(new Set(Array.from(tipsBuyerMap.values())));
    const muBuyerIds: string[] = Array.from(new Set([...
      Array.from(muUserByOrderId.values()),
      ...Array.from(muUserByPaymentId.values()),
    ]));
    const uniqueBuyerIds = Array.from(new Set([...(subBuyerIds || []), ...tipsBuyerIds, ...muBuyerIds]));
    const buyersMap = new Map<string, any>();
    if (uniqueBuyerIds.length > 0) {
      const { data: buyers, error: buyersErr } = await supabase
        .from('users')
        .select('id, username, membership_tier, profile_photo, city, state, created_at, referred_by')
        .in('id', uniqueBuyerIds);
      if (buyersErr) return json({ error: 'buyers_query_failed', details: buyersErr.message }, 500);
      for (const b of (buyers || [])) buyersMap.set(b.id, b);
    }

    // Collect direct referrer user_ids to resolve their usernames
    const directReferrerUserIds = new Set<string>();
    for (const p of payments as any[]) {
      const u = directByOrderId.get(p.paypal_order_id) || directByPaymentId.get(p.paypal_payment_id) || directByTxnId.get(p.paypal_transaction_id);
      if (u) directReferrerUserIds.add(u);
    }
    const directReferrersMap = new Map<string, any>();
    if (directReferrerUserIds.size > 0) {
      const { data: directUsers, error: dirUsersErr } = await supabase
        .from('users')
        .select('id, username')
        .in('id', Array.from(directReferrerUserIds));
      if (!dirUsersErr) for (const u of (directUsers || [])) directReferrersMap.set(u.id, u);
    }

    // Fetch subscriptions by subscription_id = paypal_order_id
    const uniqueSubIds = Array.from(new Set(subscriptionIds));
    const subsMap = new Map<string, any>();
    if (uniqueSubIds.length > 0) {
      const { data: subs, error: subsErr } = await supabase
        .from('subscriptions')
        .select('subscription_id, tier, cadence, billing_option, user_id')
        .in('subscription_id', uniqueSubIds);
      if (subsErr) return json({ error: 'subscriptions_query_failed', details: subsErr.message }, 500);
      for (const s of (subs || [])) subsMap.set(s.subscription_id, s);
    }

    // Enrich and optionally filter by buyer username or membership_type
    let items = payments.map((p: any) => {
      const sub = p.paypal_order_id ? subsMap.get(p.paypal_order_id) : null;
      const tipBuyerId = tipsBuyerMap.get(p.id) || null;
      const muBuyerFromOrder = p.paypal_order_id ? muUserByOrderId.get(p.paypal_order_id) || null : null;
      const muBuyerFromPayment = p.paypal_payment_id ? muUserByPaymentId.get(p.paypal_payment_id) || null : null;
      const buyerUserId = sub?.user_id || tipBuyerId || muBuyerFromOrder || muBuyerFromPayment || null;
      const buyer = buyerUserId ? buyersMap.get(buyerUserId) : null;
      const buyerSource = sub?.user_id
        ? 'subscription'
        : (tipBuyerId
          ? 'tips_transactions'
          : (muBuyerFromOrder
            ? 'membership_upgrades.order_id'
            : (muBuyerFromPayment ? 'membership_upgrades.payment_id' : 'none')));

      const buyerLocation = buyer ? [buyer.city, buyer.state].filter(Boolean).join(', ') : null;
      // Determine referrer for display:
      // For Upline rows: show the direct commission earner for the same transaction (middle referrer)
      // Otherwise (Direct rows): show the buyer's referrer normally.
      let referrerUsername: string | null = null;
      if (isUpline(p.payment_type)) {
        const directUserId = directByOrderId.get(p.paypal_order_id) || directByPaymentId.get(p.paypal_payment_id) || directByTxnId.get(p.paypal_transaction_id) || null;
        const du = directUserId ? directReferrersMap.get(directUserId) : null;
        referrerUsername = du?.username || null;
        // Fallback if we couldn't resolve a direct earner (missing linkage)
        if (!referrerUsername) {
          referrerUsername = tipsReferrerMap.get(p.id) || p.referred_by || buyer?.referred_by || null;
        }
      } else {
        referrerUsername = tipsReferrerMap.get(p.id) || p.referred_by || buyer?.referred_by || null;
      }
      const row = {
        id: p.id,
        created_at: p.created_at,
        amount: Number(p.amount),
        currency: p.currency || 'USD',
        payment_type: p.payment_type,
        payment_status: p.payment_status,
        buyer_id: buyer?.id || null,
        buyer_username: buyer?.username || null,
        buyer_avatar_url: buyer?.profile_photo || null,
        buyer_location: buyerLocation || null,
        buyer_joined_at: buyer?.created_at || null,
        buyer_membership_tier: buyer?.membership_tier || null,
        plan_tier: sub?.tier || null,
        cadence: sub?.cadence || null,
        billing_option: sub?.billing_option || null,
        subscription_id: p.paypal_order_id || null,
        source_label: sourceLabelFor(p.payment_type),
        override_badge: isUpline(p.payment_type),
        referrer_username: referrerUsername,
      };
      return row;
    });

    if (qUsername) {
      const qLower = qUsername.toLowerCase();
      items = items.filter((r) => (r.buyer_username || '').toLowerCase().includes(qLower));
    }

    if (membershipType) {
      const mLower = membershipType.toLowerCase();
      items = items.filter((r) => (r.buyer_membership_tier || '').toLowerCase() === mLower);
    }

    // CSV export
    if (format === 'csv') {
      const headers = [
        'created_at','payment_type','source_label','amount','currency','buyer_username','buyer_membership_tier','plan_tier','cadence','billing_option','override_badge','subscription_id'
      ];
      const csv = toCsv(headers, items.map((r) => [
        r.created_at, r.payment_type, r.source_label, r.amount, r.currency, r.buyer_username, r.buyer_membership_tier, r.plan_tier, r.cadence, r.billing_option, r.override_badge ? 'Yes' : 'No', r.subscription_id
      ]));
      return new Response(csv, { headers: { ...corsHeaders, 'Content-Type': 'text/csv' } });
    }

    return json({ items, total: count || items.length, page, page_size: pageSize });
  } catch (e) {
    console.error('earnings-query error', e);
    return json({ error: 'server_error', message: String(e?.message || e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

function safeUUID(text: string | null | undefined): string | null {
  if (!text) return null;
  const v = String(text).trim();
  // Basic UUID v4 pattern
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(v) ? v : null;
}

function isUpline(paymentType: string): boolean {
  return String(paymentType || '').toLowerCase().includes('upline');
}

function sourceLabelFor(paymentType: string): string {
  const t = String(paymentType || '').toLowerCase();
  if (t.includes('subscription')) return 'subscription';
  if (t.includes('diamond_plus')) return 'diamond_plus';
  if (t.includes('referral_commission')) return 'membership';
  return 'other';
}

function toCsv(headers: string[] | [], rows: any[][]): string {
  const escape = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const headerLine = Array.isArray(headers) && headers.length > 0 ? headers.map(escape).join(',') + '\n' : '';
  const lines = rows.map((r) => r.map(escape).join(',')).join('\n');
  return headerLine + lines;
}
