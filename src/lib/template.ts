type TemplateVars = {
  first_name?: string | null;
  last_name?: string | null;
  business_name?: string;
  review_link?: string | null;
};

export function renderTemplate(body: string, vars: TemplateVars): string {
  return body
    .replaceAll("{{first_name}}", vars.first_name?.trim() || "there")
    .replaceAll("{{last_name}}", vars.last_name?.trim() || "")
    .replaceAll("{{business_name}}", vars.business_name || "")
    .replaceAll("{{review_link}}", vars.review_link || "");
}

export const TEMPLATE_VARS = ["first_name", "last_name", "business_name", "review_link"] as const;

const OPT_OUT_NOTICE = "Reply STOP to opt out.";

/**
 * Every outgoing message must carry an opt-out instruction (Australia's
 * Spam Act 2003, and equivalent rules elsewhere) — appended here rather
 * than left to the business owner to remember in their template, so it
 * can't be accidentally left off.
 */
export function appendOptOutNotice(body: string): string {
  if (body.toLowerCase().includes("stop")) return body;
  return `${body} ${OPT_OUT_NOTICE}`;
}
