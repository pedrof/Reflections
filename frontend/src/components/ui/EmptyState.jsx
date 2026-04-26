import { useMemo } from 'react';
import { reflectionsSayings } from '../../constants/sayings.js';

export default function EmptyState({ icon = '✦', title, description, action }) {
  const saying = useMemo(
    () => reflectionsSayings[Math.floor(Math.random() * reflectionsSayings.length)],
    []
  );
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-surface-700 flex items-center justify-center text-3xl mb-5 shadow-surface">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-white/50 max-w-sm mb-6">{description}</p>
      {action && action}
      <p className="mt-8 text-xs text-white/25 italic max-w-md leading-relaxed">"{saying}"</p>
    </div>
  );
}
