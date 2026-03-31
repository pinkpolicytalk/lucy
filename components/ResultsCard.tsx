import React, { useState } from 'react';
import { CalculationResult, CalculatorTab, DiscountState } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface ResultsCardProps {
  result: CalculationResult | null;
  onCopy?: () => void;
}

const MEMO_FORMULAS: Partial<Record<CalculatorTab, (result: CalculationResult) => string>> = {
  [CalculatorTab.MILES]: (r) => {
    const { curOdo, curDate, prevOdo, prevDate } = r.details;
    return `Miles reported at ${curOdo.toLocaleString()} on ${curDate}. Previous reading was ${prevOdo.toLocaleString()} on ${prevDate}. EAM calculates out to ${r.outputAmount.toLocaleString()}.`;
  },
  [CalculatorTab.PREMIUM]: (r) => {
    const isForward = r.mode === 'FORWARD';
    return isForward
      ? `${CURRENCY_FORMATTER.format(r.outputAmount)}/m (${CURRENCY_FORMATTER.format(r.inputAmount)} total)`
      : `${CURRENCY_FORMATTER.format(r.outputAmount)} total based on monthly of ${CURRENCY_FORMATTER.format(r.inputAmount)}`;
  },
  [CalculatorTab.DISCOUNTS]: (r) => {
    const adjList = r.details.adjustments as Array<{ label: string; state: DiscountState; percent: number }>;
    const adjText =
      adjList.length > 0
        ? adjList.map((a) => `${a.label} is ${a.state === 'ADD' ? 'added' : 'removed'}`).join(', ')
        : 'no adjustments';
    let memo = `If ${adjText} adjusted premium would be approx. ${CURRENCY_FORMATTER.format(r.outputAmount)}.`;
    if (r.details.bundleAmount > 0) {
      memo += ` Quote for MLD policy ${CURRENCY_FORMATTER.format(r.details.bundleAmount)}, total cost of bundle would be approx. ${CURRENCY_FORMATTER.format(r.details.bundleTotal)}.`;
    }
    return memo;
  },
  [CalculatorTab.REBUILD]: (r) => `Price per sq ft approx. ${CURRENCY_FORMATTER.format(r.outputAmount)}`,
  [CalculatorTab.LIFE]: (r) =>
    `Estimated life coverage needed is ${CURRENCY_FORMATTER.format(r.outputAmount)} based on a monthly income of ${CURRENCY_FORMATTER.format(r.inputAmount)} replaced for 10 years and ${r.details.numKids} children`,
  [CalculatorTab.DIFFERENCE]: (r) => {
    const diffValue = r.outputAmount;
    const typeWord = diffValue < 0 ? 'decrease' : 'increase';
    const absDiff = Math.abs(diffValue);
    return `Current premium is ${CURRENCY_FORMATTER.format(r.inputAmount)}. Quoted at new premium at ${CURRENCY_FORMATTER.format(r.details.quoted)} for a ${typeWord} of ${CURRENCY_FORMATTER.format(absDiff)}`;
  },
};

const ResultsCard: React.FC<ResultsCardProps> = ({ result, onCopy }) => {
  const [copied, setCopied] = useState(false);

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12" style={{ opacity: 0.4 }}>
        <p className="text-xs tracking-widest uppercase" style={{ color: '#613834', fontFamily: 'Georgia, serif' }}>
          Awaiting Input
        </p>
      </div>
    );
  }

  const systemNote = MEMO_FORMULAS[result.tab]?.(result) || 'Calculation processed successfully.';

  const handleCopy = () => {
    navigator.clipboard.writeText(systemNote);
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  const renderResultTitle = () => {
    switch (result.tab) {
      case CalculatorTab.PREMIUM: return result.mode === 'FORWARD' ? 'Estimated Monthly' : 'Full Term Total';
      case CalculatorTab.MILES: return 'Estimated Annual Miles';
      case CalculatorTab.DISCOUNTS:
        if (result.details?.bundleAmount > 0) return 'Estimated Bundle Premium';
        return result.details?.freq === 'MONTHLY' ? 'Estimated Adjusted Monthly' : 'Estimated Adjusted Total';
      case CalculatorTab.DIFFERENCE: return 'Premium Difference';
      case CalculatorTab.REBUILD: return 'Price per Sq Ft';
      case CalculatorTab.LIFE: return 'Estimated Life Coverage';
      default: return 'Result';
    }
  };

  const renderMainValue = () => {
    if (result.tab === CalculatorTab.MILES) {
      return result.outputAmount.toLocaleString() + ' mi';
    }
    let baseVal = result.outputAmount;
    if (result.tab === CalculatorTab.DISCOUNTS && result.details?.bundleAmount > 0) {
      baseVal = result.details.bundleTotal;
    }
    const val = CURRENCY_FORMATTER.format(baseVal);
    if (result.tab === CalculatorTab.DIFFERENCE) {
      const sign = result.outputAmount >= 0 ? '+' : '-';
      const absVal = Math.abs(result.outputAmount);
      return `${sign}${CURRENCY_FORMATTER.format(absVal)}`;
    }
    return val;
  };

  const diffColor =
    result.tab === CalculatorTab.DIFFERENCE
      ? result.outputAmount < 0
        ? '#2d6a4f'
        : '#9d0208'
      : '#2b0307';

  return (
    <div className="space-y-10" style={{ animation: 'fadeUp 0.5s ease forwards' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="text-center space-y-3">
        <p className="text-xs tracking-[0.4em] uppercase" style={{ color: '#9d7b56', fontFamily: 'Georgia, serif' }}>
          {renderResultTitle()}
        </p>
        <div
          className="text-7xl md:text-8xl tracking-tighter font-bold"
          style={{ color: diffColor, fontFamily: 'Georgia, serif' }}
        >
          {renderMainValue()}
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <span
            className="text-xs tracking-[0.2em] border px-3 py-1 rounded-full uppercase"
            style={{ borderColor: '#b8a99a', color: '#5d4c3b', fontFamily: 'Georgia, serif' }}
          >
            {result.tab}
          </span>
          {result.tab === CalculatorTab.PREMIUM && result.details?.label && (
            <span
              className="text-xs tracking-[0.2em] border px-3 py-1 rounded-full"
              style={{ borderColor: '#b8a99a', color: '#5d4c3b', fontFamily: 'Georgia, serif' }}
            >
              {result.details.label}
            </span>
          )}
        </div>
      </div>

      <div
        className="rounded-2xl p-8 space-y-5 border"
        style={{ backgroundColor: '#faf7f4', borderColor: '#b8a99a' }}
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: '#b8a99a' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#613834' }}></div>
            <h3 className="text-xs tracking-[0.3em] uppercase" style={{ color: '#613834', fontFamily: 'Georgia, serif' }}>
              System Memo
            </h3>
          </div>
          <button
            onClick={handleCopy}
            className="text-xs tracking-[0.2em] uppercase px-4 py-1.5 rounded-full transition-all duration-300 border"
            style={
              copied
                ? { backgroundColor: '#613834', color: '#fff', borderColor: '#613834' }
                : { color: '#613834', borderColor: '#b8a99a', backgroundColor: 'transparent' }
            }
          >
            {copied ? 'Copied ✓' : 'Copy Note'}
          </button>
        </div>

        <p className="text-base leading-relaxed italic" style={{ color: '#443d3d', fontFamily: 'Georgia, serif' }}>
          "{systemNote}"
        </p>

        {result.tab === CalculatorTab.DISCOUNTS && (
          <p className="text-xs italic" style={{ color: '#9d7b56', opacity: 0.8, fontFamily: 'Georgia, serif' }}>
            * Estimate only — discounts apply to certain coverages only
          </p>
        )}
      </div>

      <div className="flex justify-center pt-2" style={{ opacity: 0.2 }}>
        <div className="w-24 h-[1px]" style={{ backgroundColor: '#613834' }}></div>
      </div>
    </div>
  );
};

export default ResultsCard;
