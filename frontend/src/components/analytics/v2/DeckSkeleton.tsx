import React from 'react';
import { cv } from './primitives.js';

/** Loading state: the exact bento grid, shimmering, so nothing jumps when data lands. */
export const DeckSkeleton: React.FC<{ message: string }> = ({ message }) => (
  <div role="status" aria-live="polite" aria-busy="true">
    <p className="ix-skel-msg">
      <span className="ix-skel-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {message}
    </p>
    <div className="ix-grid" aria-hidden="true">
      {[
        ['ix-c-mom', 440],
        ['ix-c-rail', 440],
        ['ix-c-prod', 330],
        ['ix-c-cat', 330],
        ['ix-c-stock', 300],
        ['ix-c-ful', 300],
        ['ix-c-ins', 190],
      ].map(([cls, h], i) => (
        <div key={i} className={`ix-skel ${cls}`} style={cv({ minHeight: h as number, '--i': i })} />
      ))}
    </div>
  </div>
);
