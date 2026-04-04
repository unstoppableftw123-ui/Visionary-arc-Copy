import React from 'react';
import { Icons } from '../../assets/icons';
import type { TierKey } from '../../assets/icons';

interface TierBadgeProps {
  tier: TierKey;
  size?: number;
}

const TIER_COLORS: Record<TierKey, string> = {
  d: '#C9B8AD',
  c: '#D4A58A',
  b: '#C4581A',
  a: '#FF7A3D',
  s: '#FF7A3D',
};

const TierBadge: React.FC<TierBadgeProps> = ({ tier, size = 32 }) => {
  const src = Icons.tier[tier];
  const color = TIER_COLORS[tier];
  const fontWeight = tier === 's' ? 800 : 600;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <img
        src={src}
        alt={`Tier ${tier.toUpperCase()}`}
        width={size}
        height={size}
        style={{ display: 'block', flexShrink: 0 }}
        draggable={false}
      />
      <span style={{ fontSize: size * 0.3, fontWeight, color, lineHeight: 1, fontFamily: 'var(--font-display, system-ui)' }}>
        {tier.toUpperCase()}
      </span>
    </div>
  );
};

export default React.memo(TierBadge);
