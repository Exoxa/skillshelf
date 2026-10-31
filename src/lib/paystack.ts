import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// Paystack talks to us in kobo, the same unit the database uses. Amounts are
// never converted to naira anywhere in this file.
const PAYSTACK_API = "https://api.paystack.co";

export type PaystackMode = "off" | "test" | "live";

export const paystackMode: PaystackMode = !env.paystackSecretKey
  ? "off"
  : env.paystackSecretKey.startsWith("sk_test_")
    ? "test"
    : "live";

export const isPaystackConfigured = paystackMode !== "off";

export type PaystackTransaction = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel?: string | null;
  paid_at?: string | null;
  customer?: { email?: string | null } | null;
  metadata?: unknown;
};

type PaystackReply<T> = {
  status?: boolean;
  message?: string;
  data?: T;
};

async function call<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data?: T; error?: string }> {
  if (!isPaystackConfigured) {
    return { error: "Card payment is not connected yet." };
  }

  try {
    const response = await fetch(`${PAYSTACK_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.paystackSecretKey}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    const body = (await response.json().catch(() => null)) as
      | PaystackReply<T>
      | null;

    if (!response.ok || !body?.status || !body.data) {
      return {
        error:
          body?.message ??
          `Paystack did not accept the request (${response.status}).`,
      };
    }

    return { data: body.data };
  } catch {
    return {
      error: "Could not reach Paystack. Check the connection and try again.",
    };
  }
}

// Start a payment. Paystack returns the page the student should be sent to.
export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}) {
  return call<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
}

// The only source of truth about whether money actually moved.
export async function verifyTransaction(reference: string) {
  return call<PaystackTransaction>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}

// Paystack signs the exact request body with the secret key. Comparing in
// constant time stops a slow attacker from guessing the signature byte by byte.
export function isValidWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!env.paystackSecretKey || !signature) return false;

  const expected = createHmac("sha512", env.paystackSecretKey)
    .update(rawBody, "utf8")
    .digest("hex");

  const given = signature.trim().toLowerCase();
  if (!/^[a-f0-9]{128}$/.test(given)) return false;

  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(given, "utf8"));
}
