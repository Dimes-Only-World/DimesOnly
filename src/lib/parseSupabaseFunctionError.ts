export type ParsedSupabaseFunctionError = {
  message: string;
  debugId?: string;
  paypalError?: string;
  details?: string[];
  rawBody?: string;
};

const truncate = (value: string, max = 280) =>
  value.length > max ? value.slice(0, max - 1) + "…" : value;

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * Parses Supabase `functions.invoke()` errors (FunctionsHttpError) into a message + PayPal debug metadata.
 */
export function parseSupabaseFunctionError(
  error: any,
  fallbackMessage: string
): ParsedSupabaseFunctionError {
  const parsed: ParsedSupabaseFunctionError = { message: fallbackMessage };

  const contextBody = error?.context?.body;

  if (contextBody != null) {
    const rawBody =
      typeof contextBody === "string" ? contextBody : safeStringify(contextBody);

    parsed.rawBody = rawBody;

    try {
      const body =
        typeof contextBody === "string" ? JSON.parse(rawBody) : contextBody;

      if (typeof body?.error === "string" && body.error.trim()) {
        parsed.message = body.error;
      }

      if (typeof body?.debug_id === "string" && body.debug_id.trim()) {
        parsed.debugId = body.debug_id;
      }

      if (typeof body?.paypal_error === "string" && body.paypal_error.trim()) {
        parsed.paypalError = body.paypal_error;
      }

      if (Array.isArray(body?.details)) {
        parsed.details = body.details.filter((d: unknown) => typeof d === "string");
      }

      return parsed;
    } catch {
      // If it's not JSON, still surface it.
      const debugMatch = rawBody.match(/"debug_id"\s*:\s*"([^"]+)"/);
      if (debugMatch) parsed.debugId = debugMatch[1];

      parsed.message = truncate(rawBody || fallbackMessage);
      return parsed;
    }
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    parsed.message = truncate(error.message);
  }

  return parsed;
}
