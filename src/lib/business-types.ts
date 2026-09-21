export const BUSINESS_TYPES = [
  {
    value: "PHYSIO_OSTEO",
    label: "Physio / Osteo / Allied Health",
    blurb: "Post-appointment review requests tied to your booking system.",
  },
  {
    value: "RESTAURANT",
    label: "Restaurant / Hospitality",
    blurb: "Send a review request a couple hours after the booking or bill closes.",
  },
  {
    value: "TRADIE",
    label: "Tradie / Home Services",
    blurb: "Trigger a request the moment a job is marked complete.",
  },
] as const;

export type BusinessTypeValue = (typeof BUSINESS_TYPES)[number]["value"];
