import type { ServiceTime } from '@/types';

interface ServiceTimesProps {
  times: ServiceTime[];
}

export default function ServiceTimes({ times }: ServiceTimesProps) {
  if (!times.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {times.map((st, i) => (
        <div
          key={i}
          className="bg-white rounded-xl p-6 border border-cream shadow-sm hover:shadow-md transition-shadow text-center"
        >
          <p className="text-gold font-bold text-sm uppercase tracking-wider">{st.day}</p>
          <p className="text-2xl font-bold text-navy-dark mt-1">{st.time}</p>
          <p className="text-steel text-sm mt-1">{st.label}</p>
        </div>
      ))}
    </div>
  );
}
