export function todayInPhilippines(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/[^0-9]/g, '').slice(0, maxLength);
}

export function validateStudentForm(data: FormData, requireEmail = true): string | null {
  const birthDate = String(data.get('birth_date') || '').trim();
  const lrn = String(data.get('lrn_number') || '').trim();
  const email = String(data.get('email') || '').trim();
  if (!birthDate) return 'Birth date is required.';
  const parsedDate = Date.parse(birthDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(parsedDate) || new Date(parsedDate).toISOString().slice(0, 10) !== birthDate) {
    return 'Enter a valid birth date.';
  }
  if (birthDate > todayInPhilippines()) return 'Birth date cannot be in the future.';
  if (!/^[0-9]{12}$/.test(lrn)) return 'Enter the required 12-digit Learner Reference Number (LRN).';
  if (requireEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  for (const name of ['contact_no', 'mother_contact_no', 'father_contact_no', 'guardian_contact_no']) {
    const phone = String(data.get(name) || '').trim();
    if (phone && !/^[0-9]{1,11}$/.test(phone)) return 'Contact numbers must contain digits only, up to 11 digits.';
  }
  const codes = ['province_code', 'municipality_code', 'barangay_code'].map(name => String(data.get(name) || ''));
  if (codes.some(Boolean) && !codes.every(code => /^[0-9]{9}$/.test(code))) {
    return 'Complete the province, municipality/city, and barangay selections.';
  }
  return null;
}
