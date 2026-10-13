// Lightweight inline artwork: no remote image requests or animation downloads.
export default function LearningIllustration() {
  return (
    <svg viewBox="0 0 560 450" role="img" aria-labelledby="learning-illustration-title" xmlns="http://www.w3.org/2000/svg">
      <title id="learning-illustration-title">Mga mag-aaral na sama-samang nagbabasa sa isang learning center</title>
      <defs><pattern id="als-dot-grid" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="#b5c8e6" /></pattern></defs>
      <rect x="32" y="18" width="492" height="414" rx="130" fill="#e5edfb" />
      <path d="M42 285C64 110 169 47 307 87s205 152 202 284H42Z" fill="#d3e0fa" />
      <rect x="362" y="37" width="120" height="105" fill="url(#als-dot-grid)" />
      <circle cx="102" cy="108" r="31" fill="#f9ce63" />
      <path d="m91 108 8 8 16-18" stroke="#17265b" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="182" y="77" width="186" height="123" rx="12" fill="#fff" />
      <rect x="198" y="93" width="154" height="91" rx="5" fill="#f3f6fc" />
      <path d="m225 127 48-20 48 20-48 21Z" fill="#17265b" /><path d="M243 138v16q30 21 60 0v-16" fill="#2f6df6" /><path d="M321 127v36" stroke="#cc655e" strokeWidth="4" /><circle cx="321" cy="166" r="5" fill="#cc655e" />
      <ellipse cx="280" cy="401" rx="235" ry="20" fill="#becfec" />
      {/* Learner on the left */}
      <path d="M92 255q-9-57 21-84 37-19 63 16l-5 68Z" fill="#233452" />
      <path d="M111 233q29-24 53 0l23 95H88Z" fill="#c65d55" />
      <rect x="128" y="217" width="20" height="24" rx="7" fill="#c78665" />
      <ellipse cx="139" cy="195" rx="26" ry="33" fill="#e4aa83" />
      <path d="M113 194q-5-38 28-36 34 4 27 36-20-5-36-20-2 20-19 20Z" fill="#233452" />
      <path d="M133 208q7 7 14 0" stroke="#88553f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="129" cy="196" r="2" fill="#233452" /><circle cx="148" cy="196" r="2" fill="#233452" />
      <path d="m104 264 18 39 50-4" fill="none" stroke="#e4aa83" strokeWidth="17" strokeLinecap="round" />
      {/* Learner in the middle */}
      <path d="M240 235q32-22 65 0l20 92H222Z" fill="#2f6df6" />
      <rect x="263" y="211" width="20" height="31" rx="8" fill="#ac704f" />
      <ellipse cx="273" cy="187" rx="29" ry="36" fill="#c18b63" />
      <path d="M244 190q-12-51 29-50 35 0 32 46l-12-19q-23 9-47-1Z" fill="#17265b" />
      <circle cx="263" cy="186" r="2.2" fill="#17265b" /><circle cx="283" cy="186" r="2.2" fill="#17265b" />
      <path d="M265 200q8 8 16 0" stroke="#754d38" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="m243 262 7 34 39 5m14-41-4 35-28 5" stroke="#c18b63" strokeWidth="17" fill="none" strokeLinecap="round" />
      {/* Learner on the right */}
      <path d="M367 250q32-22 60 0l26 82h-102Z" fill="#f3c65f" />
      <rect x="389" y="230" width="20" height="26" rx="8" fill="#d59772" />
      <ellipse cx="399" cy="205" rx="28" ry="34" fill="#efba93" />
      <path d="M371 207q-15-50 26-47 38 0 33 44l-12-25q-27 12-47 10Z" fill="#343a48" />
      <path d="m367 177 35-15 39 13-34 15Z" fill="#17265b" /><path d="m438 175-1 25" stroke="#c65d55" strokeWidth="3" />
      <circle cx="389" cy="205" r="2" fill="#233452" /><circle cx="409" cy="205" r="2" fill="#233452" />
      <path d="M391 218q8 6 15-1" stroke="#88553f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="m368 273-12 25-24 1m95-25-8 29-33-2" stroke="#efba93" strokeWidth="16" fill="none" strokeLinecap="round" />
      {/* Shared desk and open books */}
      <rect x="74" y="314" width="402" height="17" rx="7" fill="#17265b" /><path d="M103 331v66m344-66v66" stroke="#17265b" strokeWidth="13" strokeLinecap="round" />
      <path d="m179 292 51 4 41-8v25l-41 6-51-4Z" fill="#fff" /><path d="m230 296 1 23" stroke="#b6c7e3" strokeWidth="2" />
      <path d="m292 301 35-10 37 7v17l-37-6-35 9Z" fill="#fff" /><path d="m327 291 0 18" stroke="#b6c7e3" strokeWidth="2" />
      <rect x="110" y="303" width="52" height="9" rx="2" fill="#f9ce63" />
      {/* Community garden */}
      <path d="M493 371v-73m0 35q-35-3-30-35 33 1 30 35m0-14q-1-36 29-40 10 28-29 40" fill="#709d83" stroke="#4c7d64" strokeWidth="3" />
      <path d="M472 362h42l-8 38h-26Z" fill="#c65d55" />
      <path d="m67 207 6 10 11 1-8 8 2 11-11-5-10 5 2-11-8-8 11-1Z" fill="#f9ce63" />
    </svg>
  );
}
