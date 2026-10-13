
export default function SectionHeading({ id, eyebrow, title, description }: { id: string; eyebrow: string; title: string; description?: string }) {
  return <div className="mb-[26px] max-w-[720px] sm:mb-9 [&_h2]:text-[29px] [&_h2]:font-bold [&_h2]:leading-[1.24] [&_h2]:tracking-[-0.035em] [&_h2]:text-balance sm:[&_h2]:text-[clamp(28px,3vw,38px)]"><p className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.13em] text-blue-700 sm:text-xs">{eyebrow}</p><h2 id={id}>{title}</h2>{description && <p className="mt-[17px] max-w-[640px] text-base leading-relaxed text-slate-600">{description}</p>}</div>;
}
