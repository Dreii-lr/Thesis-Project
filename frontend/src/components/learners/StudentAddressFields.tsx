'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getBarangays, getCities, getProvinces, type LocationItem } from '@/src/lib/locations-api';
import type { ContactDetailsInput } from '@/src/lib/students-api';

interface AddressProps {
  initial?: ContactDetailsInput;
  inputClass: string;
  labelClass?: string;
}

function matchLocation(items: LocationItem[], code?: string | null, name?: string | null) {
  const normalized = (name || '').trim().toLowerCase();
  return items.find(item => item.code === code) || items.find(item => item.name.toLowerCase() === normalized);
}

export default function StudentAddressFields({ initial, inputClass, labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700' }: AddressProps) {
  const [original] = useState(initial);
  const [edited, setEdited] = useState(false);
  const changed = useRef(false);
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [cities, setCities] = useState<LocationItem[]>([]);
  const [barangays, setBarangays] = useState<LocationItem[]>([]);
  const [provinceCode, setProvinceCode] = useState(initial?.province_code || '');
  const [cityCode, setCityCode] = useState(initial?.municipality_code || '');
  const [barangayCode, setBarangayCode] = useState(initial?.barangay_code || '');
  const [loading, setLoading] = useState({ provinces: true, cities: false, barangays: false });
  const [errors, setErrors] = useState({ provinces: '', cities: '', barangays: '' });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoading(value => ({ ...value, provinces: true }));
      setErrors(value => ({ ...value, provinces: '' }));
    });
    getProvinces(controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setProvinces(items);
      if (!changed.current) {
        const matched = matchLocation(items, original?.province_code, original?.province);
        if (matched) setProvinceCode(matched.code);
      }
    }).catch(error => {
      if (!controller.signal.aborted) setErrors(value => ({ ...value, provinces: error instanceof Error ? error.message : 'Could not load provinces.' }));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(value => ({ ...value, provinces: false }));
    });
    return () => controller.abort();
  }, [retry, original]);

  useEffect(() => {
    if (!provinceCode) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoading(value => ({ ...value, cities: true }));
      setErrors(value => ({ ...value, cities: '' }));
    });
    getCities(provinceCode, controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setCities(items);
      if (!changed.current) {
        const matched = matchLocation(items, original?.municipality_code, original?.municipality);
        if (matched) setCityCode(matched.code);
      }
    }).catch(error => {
      if (!controller.signal.aborted) setErrors(value => ({ ...value, cities: error instanceof Error ? error.message : 'Could not load cities.' }));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(value => ({ ...value, cities: false }));
    });
    return () => controller.abort();
  }, [provinceCode, retry, original]);

  useEffect(() => {
    if (!cityCode) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoading(value => ({ ...value, barangays: true }));
      setErrors(value => ({ ...value, barangays: '' }));
    });
    getBarangays(cityCode, controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setBarangays(items);
      if (!changed.current) {
        const matched = matchLocation(items, original?.barangay_code, original?.barangay);
        if (matched) setBarangayCode(matched.code);
      }
    }).catch(error => {
      if (!controller.signal.aborted) setErrors(value => ({ ...value, barangays: error instanceof Error ? error.message : 'Could not load barangays.' }));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(value => ({ ...value, barangays: false }));
    });
    return () => controller.abort();
  }, [cityCode, retry, original]);

  const province = provinces.find(item => item.code === provinceCode);
  const city = cities.find(item => item.code === cityCode);
  const barangay = barangays.find(item => item.code === barangayCode);
  const legacy = !edited && !original?.province_code;
  // Preserve legacy names until a complete PSGC address is selected.
  const complete = Boolean(province && city && barangay);
  const keepLegacy = legacy && !complete;
  const error = errors.provinces || errors.cities || errors.barangays;

  return (
    <>
      <div>
        <label htmlFor="province_select" className={labelClass}>Province</label>
        <select id="province_select" value={provinceCode} disabled={loading.provinces || Boolean(errors.provinces)} className={inputClass} onChange={event => {
          changed.current = true; setEdited(true);
          setProvinceCode(event.target.value); setCityCode(''); setBarangayCode(''); setCities([]); setBarangays([]);
          setErrors(value => ({ ...value, cities: '', barangays: '' }));
        }}>
          <option value="" disabled={Boolean(provinceCode)}>{loading.provinces ? 'Loading provinces…' : 'Select province'}</option>
          {provinces.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="municipality_select" className={labelClass}>Municipality / City</label>
        <select id="municipality_select" value={cityCode} required={Boolean(provinceCode) && !keepLegacy} disabled={!provinceCode || loading.cities || Boolean(errors.cities)} className={inputClass} onChange={event => {
          changed.current = true; setEdited(true);
          setCityCode(event.target.value); setBarangayCode(''); setBarangays([]);
          setErrors(value => ({ ...value, barangays: '' }));
        }}>
          <option value="" disabled={Boolean(cityCode)}>{loading.cities ? 'Loading cities…' : provinceCode ? 'Select municipality / city' : 'Choose a province first'}</option>
          {cities.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="barangay_select" className={labelClass}>Barangay (Village/Ward)</label>
        <select id="barangay_select" value={barangayCode} required={Boolean(cityCode) && !keepLegacy} disabled={!cityCode || loading.barangays || Boolean(errors.barangays)} className={inputClass} onChange={event => { changed.current = true; setEdited(true); setBarangayCode(event.target.value); }}>
          <option value="" disabled={Boolean(barangayCode)}>{loading.barangays ? 'Loading barangays…' : cityCode ? 'Select barangay' : 'Choose a city first'}</option>
          {barangays.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </div>
      <input type="hidden" name="province" value={keepLegacy ? original?.province || '' : province?.name || ''} />
      <input type="hidden" name="municipality" value={keepLegacy ? original?.municipality || '' : city?.name || ''} />
      <input type="hidden" name="barangay" value={keepLegacy ? original?.barangay || '' : barangay?.name || ''} />
      <input type="hidden" name="province_code" value={keepLegacy ? '' : provinceCode} />
      <input type="hidden" name="municipality_code" value={keepLegacy ? '' : cityCode} />
      <input type="hidden" name="barangay_code" value={keepLegacy ? '' : barangayCode} />
      {keepLegacy && original?.province && <p className="col-span-full text-xs leading-5 text-slate-500">Saved address: {[original.barangay, original.municipality, original.province].filter(Boolean).join(', ')}. Select a barangay to update it.</p>}
      {error && <div role="alert" className="col-span-full flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertCircle size={15} /><span className="flex-1">{error}</span><button type="button" onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-1 font-semibold underline"><RefreshCw size={12} />Try again</button></div>}
    </>
  );
}
