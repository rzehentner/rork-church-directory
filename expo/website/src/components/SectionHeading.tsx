interface SectionHeadingProps {
  title: string;
  subtitle?: string;
}

export default function SectionHeading({ title, subtitle }: SectionHeadingProps) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-3xl font-bold text-navy-dark">{title}</h2>
      <div className="w-16 h-1 bg-gold mx-auto mt-3 rounded-full" />
      {subtitle && <p className="text-steel mt-4 max-w-xl mx-auto">{subtitle}</p>}
    </div>
  );
}
