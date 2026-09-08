import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import StoreLayout from "@/components/store/StoreLayout";

const CONTENT: Record<string, { title: string; body: string[] }> = {
  shipping: {
    title: "Shipping",
    body: [
      "Orders are packed within 1-2 business days.",
      "Standard shipping is $7.99 and arrives in 3-7 business days. Express shipping is $14.99 and arrives in 1-3 business days.",
      "Standard shipping is free on orders over $150.",
      "You'll receive tracking by email as soon as your order leaves us.",
    ],
  },
  returns: {
    title: "Returns",
    body: [
      "Unworn items with tags attached can be returned within 14 days of delivery.",
      "Limited drops, socks, durags and final-sale items cannot be returned.",
      "Email us with your order number to start a return. Refunds post to your original payment method within 5-10 business days of us receiving the item.",
    ],
  },
  privacy: {
    title: "Privacy",
    body: [
      "We collect only what we need to process your order: your name, email, shipping address and order history.",
      "Payments are handled by PayPal. We never see or store your card details.",
      "We do not sell your personal information.",
    ],
  },
  terms: {
    title: "Terms",
    body: [
      "Dimes Only Clothing is the official apparel line of Dimes Only World. You must be 18 or older to purchase.",
      "Prices are in USD. We may correct pricing or availability errors and cancel affected orders with a full refund.",
      "Promo codes cannot be combined and may be withdrawn at any time.",
    ],
  },
  contact: {
    title: "Contact",
    body: [
      "Questions about an order, a size or a return? Reach out through your Dimes Only World dashboard messages and we'll get back to you within one business day.",
    ],
  },
};

const StorePolicies: React.FC = () => {
  const { page } = useParams();
  const content = CONTENT[page || "shipping"] || CONTENT.shipping;

  useEffect(() => {
    document.title = `${content.title} | Dimes Only Clothing`;
  }, [content.title]);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="store-display text-3xl uppercase tracking-widest">{content.title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed" style={{ color: "hsl(var(--store-muted))" }}>
          {content.body.map((p) => <p key={p}>{p}</p>)}
        </div>
      </div>
    </StoreLayout>
  );
};

export default StorePolicies;
