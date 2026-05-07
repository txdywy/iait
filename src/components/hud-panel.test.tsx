import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HudPanel } from './HudPanel';
import { ConfidenceBadge, CompletenessBadge, FreshnessBadge, RiskBadge } from './StatusBadges';

const today = new Date().toISOString();
const staleDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();

describe('HUD primitives', () => {
  it('renders a HUD panel heading, uppercase eyebrow label, and readable child text', () => {
    render(
      <HudPanel title="Index Signals" eyebrow="Global view">
        <p>Readable compute trend summary</p>
      </HudPanel>,
    );

    expect(screen.getByRole('heading', { name: 'Index Signals' })).toBeInTheDocument();
    expect(screen.getByText('Global view')).toHaveClass('uppercase');
    expect(screen.getByText('Readable compute trend summary')).toBeInTheDocument();
  });

  it('renders confidence with exact text', () => {
    render(<ConfidenceBadge value={4} />);

    expect(screen.getByText('Confidence 4/5')).toBeInTheDocument();
  });

  it('renders explicit completeness labels for partial and full factors', () => {
    render(
      <div>
        <CompletenessBadge value="partial" />
        <CompletenessBadge value="full" />
      </div>,
    );

    expect(screen.getByText('Partial factors')).toBeInTheDocument();
    expect(screen.getByText('Full factors')).toBeInTheDocument();
  });

  it('renders today and stale freshness labels', () => {
    render(
      <div>
        <FreshnessBadge timestamp={today} />
        <FreshnessBadge timestamp={staleDate} />
      </div>,
    );

    expect(screen.getByText('Updated today')).toBeInTheDocument();
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('labels risk as a modeling assumption without legal verdict copy', () => {
    render(<RiskBadge tier="tier-2" multiplier={0.82} />);

    expect(screen.getByText(/Risk adjustment/i)).toBeInTheDocument();
    expect(screen.getByText(/Modeling assumption/i)).toBeInTheDocument();
    expect(screen.queryByText(/legal risk|compliance verdict|sanctioned/i)).not.toBeInTheDocument();
  });
});
