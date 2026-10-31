import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import LoadoutTab from './LoadoutTab';
import craftFixture from '../../../fixtures/craft.json';
import craftTwophaseFixture from '../../../fixtures/craft_twophase.json';
import craftInfeasibleFixture from '../../../fixtures/craft_infeasible.json';

describe('Part 9: LoadoutTab Component (Stage 4 Crafting LP)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders successfully from craft.json fixture with Z=117 and recipe allocation x=(7,0,4,3)', async () => {
    render(<LoadoutTab tourTime={70} forceFixtureMode={true} />);

    // Check main title and badges
    expect(screen.getByText(/Consumable Crafting Optimizer/i)).toBeInTheDocument();
    expect(screen.getByText(/STATUS: OPTIMAL/i)).toBeInTheDocument();

    // Check Crafting Bonus Score Z = 117
    await waitFor(() => {
      const zScoreEl = screen.getByTestId('crafting-z-score');
      expect(zScoreEl).toHaveTextContent('+117');
    });

    // Check Total Raid Score (Combat 445 + Crafting 117 = 562)
    const totalScoreEl = screen.getByTestId('total-raid-score');
    expect(totalScoreEl).toHaveTextContent('562');

    // Check Recipe item counts: x1=7, x2=0, x3=4, x4=3
    const cardX1 = screen.getByTestId('recipe-card-x1');
    const cardX2 = screen.getByTestId('recipe-card-x2');
    const cardX3 = screen.getByTestId('recipe-card-x3');
    const cardX4 = screen.getByTestId('recipe-card-x4');

    expect(cardX1).toHaveTextContent('7');
    expect(cardX2).toHaveTextContent('0');
    expect(cardX3).toHaveTextContent('4');
    expect(cardX4).toHaveTextContent('3');
  });

  it('displays Big-M tableau entries symbolically as aM + b and highlights pivot cell', async () => {
    render(<LoadoutTab tourTime={70} forceFixtureMode={true} />);

    const tableau = screen.getByTestId('simplex-tableau');
    expect(tableau).toBeInTheDocument();

    // In iteration 1 of Big-M, entering cost for x1 is "-6M - 8"
    await waitFor(() => {
      expect(screen.getByText(/-6M - 8/)).toBeInTheDocument();
    });

    // Verify pivot cell is highlighted with specific title / styling
    const pivotCell = screen.getByTitle('PIVOT ELEMENT');
    expect(pivotCell).toBeInTheDocument();
  });

  it('handles the 40-minute error state and renders a readable infeasible message', async () => {
    // 40 min craft time (e.g. from naive 80-min tour: 120 - 80 = 40)
    render(<LoadoutTab tourTime={80} forceFixtureMode={true} />);

    await waitFor(() => {
      const infeasibleBanner = screen.getByTestId('infeasible-message');
      expect(infeasibleBanner).toBeInTheDocument();
      expect(screen.getByText(/Crafting Plan Infeasible!/i)).toBeInTheDocument();
      expect(screen.getByText(/insufficient to produce 14 required items/i)).toBeInTheDocument();
    });

    // Clicking the 40min preset button also triggers the infeasible state
    const optimalBtn = screen.getByTestId('preset-optimal-btn');
    fireEvent.click(optimalBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('infeasible-message')).not.toBeInTheDocument();
    });

    const infeasiblePresetBtn = screen.getByTestId('preset-40min-btn');
    fireEvent.click(infeasiblePresetBtn);

    await waitFor(() => {
      expect(screen.getByTestId('infeasible-message')).toBeInTheDocument();
    });
  });

  it('toggles method switch to Two-Phase and renders craft_twophase.json trace offline', async () => {
    render(<LoadoutTab tourTime={70} forceFixtureMode={true} />);

    const twoPhaseBtn = screen.getByTestId('method-twophase-btn');
    fireEvent.click(twoPhaseBtn);

    await waitFor(() => {
      expect(screen.getByText(/TWO-PHASE SIMPLEX/i)).toBeInTheDocument();
      expect(screen.getByText(/Phase 1 \(Minimize Artificials\)/i)).toBeInTheDocument();
    });
  });

  it('displays shadow prices (0.75 / 0.50 / 4.25) and identifies craft time as the primary bottleneck', async () => {
    render(<LoadoutTab tourTime={70} forceFixtureMode={true} />);

    await waitFor(() => {
      const spSection = screen.getByTestId('shadow-prices-section');
      expect(spSection).toBeInTheDocument();
      expect(screen.getByText(/Primary Bottleneck: Craft Time/i)).toBeInTheDocument();
      expect(screen.getByText(/\+0\.75/)).toBeInTheDocument();
      expect(screen.getByText(/\+0\.50/)).toBeInTheDocument();
      expect(screen.getByText(/\+4\.25/)).toBeInTheDocument();
    });
  });

  it('updates plan when craft time slider is moved', async () => {
    render(<LoadoutTab tourTime={70} forceFixtureMode={true} />);

    const timeSlider = screen.getByTestId('time-limit-slider');
    expect(timeSlider).toBeInTheDocument();

    // Adjust craft time to 42 min (corresponding to Z=111, x=[13,0,0,1])
    fireEvent.change(timeSlider, { target: { value: '42' } });

    await waitFor(() => {
      const zScoreEl = screen.getByTestId('crafting-z-score');
      expect(zScoreEl).toHaveTextContent('+111');
      const cardX1 = screen.getByTestId('recipe-card-x1');
      expect(cardX1).toHaveTextContent('13');
    });
  });
});
