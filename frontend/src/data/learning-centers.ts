export type LearningCenter = {
  barangay: string;
  venue: string;
  schedule: string;
  teacher: string;
  phone: string | null;
  verified: boolean;
};

// TODO: Replace these samples with assignments approved by ALS Santa Cruz staff.
// Set verified: true ONLY after checking the venue, schedule, teacher, and number.
// Use a dialable number (for example +639...) in phone. null keeps call/text disabled.
// Add more Santa Cruz barangays to this list as verified information becomes available.
export const learningCenters: LearningCenter[] = [
  { barangay: "Bubukal", venue: "[Learning center sa Bubukal]", schedule: "[Araw at oras ng klase]", teacher: "[Pangalan ng Guro]", phone: null, verified: false },
  { barangay: "Labuin", venue: "[Learning center sa Labuin]", schedule: "[Araw at oras ng klase]", teacher: "[Pangalan ng Guro]", phone: null, verified: false },
  { barangay: "San Jose", venue: "[Learning center sa San Jose]", schedule: "[Araw at oras ng klase]", teacher: "[Pangalan ng Guro]", phone: null, verified: false },
  { barangay: "Pagsawitan", venue: "[Learning center sa Pagsawitan]", schedule: "[Araw at oras ng klase]", teacher: "[Pangalan ng Guro]", phone: null, verified: false },
];
