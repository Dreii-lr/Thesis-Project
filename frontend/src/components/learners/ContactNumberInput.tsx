'use client';

import type { InputHTMLAttributes } from 'react';
import { digitsOnly } from '@/src/lib/student-validation';

export default function ContactNumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="tel"
      inputMode="numeric"
      maxLength={11}
      pattern="[0-9]{1,11}"
      title="Enter digits only, up to 11 digits."
      onInput={(event) => {
        event.currentTarget.value = digitsOnly(event.currentTarget.value, 11);
        props.onInput?.(event);
      }}
    />
  );
}
