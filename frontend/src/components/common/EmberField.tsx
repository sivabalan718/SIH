import React, { useMemo } from 'react';

interface EmberFieldProps {
  /** Number of embers to render. Keep modest — this is atmosphere, not a light show. */
  count?: number;
  /** 'clay' for artisan-side pages (orange), 'gold' for customer-side pages (amber). */
  variant?: 'clay' | 'gold';
}

// Deterministic pseudo-random so the ember layout is stable across re-renders
// (no seed state, no external deps — just a cheap hash of the index).
function seeded(i: number) {
  const x = Math.sin(i * 999.17) * 10000;
  return x - Math.floor(x);
}

/**
 * Decorative-only. Renders behind the auth card, above StarryBackground3D,
 * so the "kiln spark" motion reads as one continuous atmosphere with the
 * existing starfield rather than a separate effect competing with it.
 */
export const EmberField: React.FC<EmberFieldProps> = ({ count = 14, variant = 'clay' }) => {
  const embers = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: seeded(i + 1) * 100,
        size: 2 + seeded(i + 2) * 3,
        duration: 7 + seeded(i + 3) * 6,
        delay: seeded(i + 4) * 9,
        drift: (seeded(i + 5) - 0.5) * 60,
      })),
    [count]
  );

  return (
    <div className="m63-ember-layer" aria-hidden="true">
      {embers.map((ember) => (
        <span
          key={ember.id}
          className="m63-ember"
          style={
            {
              left: `${ember.left}%`,
              background:
                variant === 'gold'
                  ? 'radial-gradient(circle, rgba(252, 211, 77, 0.9) 0%, rgba(217, 119, 6, 0.15) 70%)'
                  : undefined,
              '--m63-ember-size': `${ember.size}px`,
              '--m63-ember-duration': `${ember.duration}s`,
              '--m63-ember-delay': `${ember.delay}s`,
              '--m63-ember-drift': `${ember.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
  