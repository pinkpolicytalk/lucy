import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Header from './components/Header';
import ResultsCard from './components/ResultsCard';
import { InsuranceType, CalculationMode, CalculationResult, CalculatorTab, DiscountState } from './types';
import { MULTIPLIERS, TYPE_LABELS, DISCOUNT_DATA, CURRENCY_FORMATTER } from './constants';

// ─── Color tokens ────────────────────────────────────────────────
const C = {
  sand:    '#b8a99a',
  burgundy:'#613834',
  brown:   '#9d7b56',
  red:     '#ec0c21',
  blush:   '#eb9ea5',
  dark:    '#2b0307',
  charcoal:'#443d3d',
  espresso:'#5d4c3b',
  cream:   '#faf7f4',
  white:   '#ffffff',
};

const serif = 'Georgia, "Times New Roman", serif';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CalculatorTab>(CalculatorTab.PREMIUM);
  const [result, setResult] = useState<CalculationResult | null>(null);

  // Premium
  const [amount, setAmount]   = useState('');
  const [type, setType]       = useState<InsuranceType>(InsuranceType.AUTO);
  const [mode, setMode]       = useState<CalculationMode>(CalculationMode.FORWARD);

  // Miles
  const [curOdo, setCurOdo]   = useState('');
  const [curDate, setCurDate] = useState(new Date().toLocaleDateString('en-US'));
  const [prevOdo, setPrevOdo] = useState('');
  const [prevDate, setPrevDate] = useState('');
  const [showOdoError, setShowOdoError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("Bestie.... are you sure about that?");

  // Discounts
  const [discountBase, setDiscountBase]   = useState('');
  const [discountFreq, setDiscountFreq]   = useState<'MONTHLY' | '6MONTH'>('MONTHLY');
  const [bundlePremium, setBundlePremium] = useState('');
  const [selectedDiscounts, setSelectedDiscounts] = useState<Record<string, DiscountState>>({
    'CGDD': 'NONE', 'MCD': 'NONE', 'MLD life': 'NONE',
    'MLD renter': 'NONE', 'MLD home': 'NONE', 'MLD home & plup': 'NONE'
  });

  // Difference
  const [currentPremium, setCurrentPremium] = useState('');
  const [quotedPremium, setQuotedPremium]   = useState('');

  // Rebuild
  const [sqft, setSqft]               = useState('');
  const [costPerSqft, setCostPerSqft] = useState('350');
  const [isCostLocked, setIsCostLocked] = useState(true);

  // Life
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [numKids, setNumKids]             = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setResult(null); }, [activeTab]);
  useEffect(() => { inputRef.current?.focus(); }, [activeTab]);

  const liveAdjustedPremium = useMemo(() => {
    const base = parseFloat(discountBase);
    if (isNaN(base) || base <= 0) return 0;
    let totalDelta = 0;
    Object.entries(selectedDiscounts).forEach(([key, state]) => {
      if (state === 'NONE') return;
      const pct = DISCOUNT_DATA[key as keyof typeof DISCOUNT_DATA];
      totalDelta += state === 'ADD' ? -pct : pct;
    });
    return base * (1 + totalDelta / 100);
  }, [discountBase, selectedDiscounts]);

  const clearInputs = () => {
    setAmount(''); setCurOdo(''); setPrevOdo(''); setDiscountBase('');
    setBundlePremium(''); setCurrentPremium(''); setQuotedPremium('');
    setSqft(''); setMonthlyIncome(''); setNumKids('');
  };

  const calculate = useCallback(() => {
    let newResult: CalculationResult | null = null;

    if (activeTab === CalculatorTab.PREMIUM) {
      const n = parseFloat(amount);
      if (isNaN(n) || n <= 0) return;
      const multiplier = MULTIPLIERS[type];
      const outputAmount = mode === CalculationMode.FORWARD ? n / multiplier : n * multiplier;
      newResult = { inputAmount: n, outputAmount, type, mode, multiplier, tab: CalculatorTab.PREMIUM, details: { label: TYPE_LABELS[type] } };
    }

    else if (activeTab === CalculatorTab.MILES) {
      const cOdo = parseFloat(curOdo);
      const pOdo = parseFloat(prevOdo);
      const parseDate = (s: string) => {
        const d = new Date(s); if (!isNaN(d.getTime())) return d;
        const p = s.split('/');
        if (p.length === 3) { const dt = new Date(+p[2], +p[0]-1, +p[1]); if (!isNaN(dt.getTime())) return dt; }
        return null;
      };
      const cDate = parseDate(curDate);
      const pDate = parseDate(prevDate);
      if (isNaN(cOdo) || isNaN(pOdo) || !cDate || !pDate) {
        setErrorMsg("I need all the numbers and dates to do the math!");
        setShowOdoError(true); return;
      }
      if (cOdo < pOdo) {
        setErrorMsg("The current odometer can't be less than the old one!");
        setShowOdoError(true); return;
      }
      const diffDays = Math.ceil(Math.abs(cDate.getTime() - pDate.getTime()) / 86400000);
      if (diffDays === 0) {
        setErrorMsg("The dates have to be different!");
        setShowOdoError(true); return;
      }
      const milesDriven = cOdo - pOdo;
      const annualEstimate = Math.round((milesDriven / diffDays * 365) / 100) * 100;
      newResult = { inputAmount: milesDriven, outputAmount: annualEstimate, tab: CalculatorTab.MILES,
        details: { days: diffDays, avgDaily: milesDriven / diffDays, curOdo: cOdo, curDate, prevOdo: pOdo, prevDate } };
    }

    else if (activeTab === CalculatorTab.DISCOUNTS) {
      const base = parseFloat(discountBase);
      if (isNaN(base) || base <= 0) return;
      let totalDelta = 0;
      const adjustments: Array<{label: string, state: DiscountState, percent: number}> = [];
      (Object.entries(selectedDiscounts) as [string, DiscountState][]).forEach(([key, state]) => {
        if (state === 'NONE') return;
        const pct = DISCOUNT_DATA[key as keyof typeof DISCOUNT_DATA];
        totalDelta += state === 'ADD' ? -pct : pct;
        adjustments.push({ label: key, state, percent: pct });
      });
      const bundleVal = parseFloat(bundlePremium) || 0;
      newResult = { inputAmount: base, outputAmount: liveAdjustedPremium, tab: CalculatorTab.DISCOUNTS,
        details: { freq: discountFreq, adjustments, totalDelta, bundleAmount: bundleVal, bundleTotal: liveAdjustedPremium + bundleVal } };
    }

    else if (activeTab === CalculatorTab.DIFFERENCE) {
      const cur = parseFloat(currentPremium);
      const quo = parseFloat(quotedPremium);
      if (isNaN(cur) || isNaN(quo)) return;
      newResult = { inputAmount: cur, outputAmount: quo - cur, tab: CalculatorTab.DIFFERENCE, details: { quoted: quo } };
    }

    else if (activeTab === CalculatorTab.REBUILD) {
      const s = parseFloat(sqft);
      const c = parseFloat(costPerSqft);
      if (isNaN(s) || isNaN(c)) return;
      newResult = { inputAmount: s, outputAmount: s * c, tab: CalculatorTab.REBUILD, details: { costPerSqft: c } };
    }

    else if (activeTab === CalculatorTab.LIFE) {
      const income = parseFloat(monthlyIncome);
      const kids = parseFloat(numKids);
      if (isNaN(income) || isNaN(kids)) return;
      newResult = { inputAmount: income, outputAmount: (income * 120) + (kids * 100000), tab: CalculatorTab.LIFE,
        details: { numKids: kids, incomeNeed: income * 120, kidsNeed: kids * 100000 } };
    }

    if (newResult) setResult(newResult);
  }, [activeTab, amount, type, mode, curOdo, curDate, prevOdo, prevDate, discountBase, discountFreq,
      selectedDiscounts, liveAdjustedPremium, bundlePremium, currentPremium, quotedPremium, sqft, costPerSqft, monthlyIncome, numKids]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') calculate(); };
  const handleDiscountToggle = (id: string, state: DiscountState) =>
    setSelectedDiscounts(prev => ({ ...prev, [id]: state }));

  const tabs = [CalculatorTab.PREMIUM, CalculatorTab.DIFFERENCE, CalculatorTab.DISCOUNTS, CalculatorTab.MILES, CalculatorTab.REBUILD, CalculatorTab.LIFE];
  const tabLabel = (t: CalculatorTab) => ({ PREMIUM: 'Premium', DIFFERENCE: 'Difference', DISCOUNTS: 'Discounts', MILES: 'Miles', REBUILD: 'Sq Ft', LIFE: 'Life' }[t]);

  // Shared input style
  const inputCls = "w-full bg-transparent border-b py-2 outline-none text-xl";
  const inputStyle = { borderColor: C.sand, color: C.dark, fontFamily: serif };

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ backgroundColor: C.cream }}>

      {/* Error modal */}
      {showOdoError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={() => setShowOdoError(false)}>
          <div className="rounded-2xl p-10 max-w-sm w-full text-center space-y-6 shadow-2xl border"
            style={{ backgroundColor: C.cream, borderColor: C.sand }}
            onClick={e => e.stopPropagation()}>
            <p className="text-xl" style={{ color: C.dark, fontFamily: serif }}>{errorMsg}</p>
            <button onClick={() => setShowOdoError(false)}
              className="w-full py-3 rounded-full text-xs tracking-[0.3em] uppercase transition-colors"
              style={{ backgroundColor: C.burgundy, color: C.white, fontFamily: serif }}>
              Try again
            </button>
          </div>
        </div>
      )}

      <Header />

      <main className="flex-grow max-w-3xl mx-auto w-full px-6 flex flex-col gap-10">

        {/* Tab bar */}
        <div className="flex items-end gap-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="flex-1 py-3 px-2 text-xs tracking-[0.15em] uppercase transition-all duration-300 rounded-t-xl border-x border-t"
                style={{
                  fontFamily: serif,
                  borderColor: isActive ? C.sand : 'transparent',
                  backgroundColor: isActive ? C.white : C.sand + '55',
                  color: isActive ? C.burgundy : C.espresso,
                  fontWeight: isActive ? 600 : 400,
                  transform: isActive ? 'translateY(1px)' : 'translateY(0)',
                  zIndex: isActive ? 10 : 1,
                  position: 'relative',
                }}>
                {tabLabel(tab)}
              </button>
            );
          })}
        </div>

        {/* Calculator panel */}
        <div className="rounded-b-2xl rounded-tr-2xl border p-8 lg:p-10 space-y-8 -mt-1"
          style={{ backgroundColor: C.white, borderColor: C.sand, boxShadow: '0 8px 30px -8px rgba(43,3,7,0.08)' }}>

          {/* PREMIUM */}
          {activeTab === CalculatorTab.PREMIUM && (
            <div className="space-y-8">
              <h2 className="text-center text-2xl" style={{ color: C.burgundy, fontFamily: serif }}>
                OK, but what's the monthly?
              </h2>
              <div className="space-y-6 max-w-xs mx-auto">
                <div className="relative border-b py-2" style={{ borderColor: C.sand }}>
                  <span className="absolute left-0 bottom-4 text-lg" style={{ color: C.charcoal, opacity: 0.4, fontFamily: serif }}>$</span>
                  <input ref={inputRef} type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    onKeyDown={handleKeyDown} placeholder="0.00"
                    className="w-full pl-6 bg-transparent text-4xl text-center outline-none placeholder:opacity-20"
                    style={{ color: C.dark, fontFamily: serif }} />
                </div>
                <div className="flex border rounded-full p-1" style={{ borderColor: C.sand, backgroundColor: C.cream }}>
                  {(['FORWARD', 'REVERSE'] as CalculationMode[]).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className="flex-1 py-2 rounded-full text-xs tracking-[0.2em] uppercase transition-all"
                      style={mode === m ? { backgroundColor: C.burgundy, color: C.white, fontFamily: serif } : { color: C.espresso, fontFamily: serif }}>
                      {m === 'FORWARD' ? 'Division' : 'Multiplication'}
                    </button>
                  ))}
                </div>
                <div className="flex border rounded-full p-1" style={{ borderColor: C.sand, backgroundColor: C.cream }}>
                  {(Object.keys(TYPE_LABELS) as InsuranceType[]).map(t => (
                    <button key={t} onClick={() => setType(t)}
                      className="flex-1 py-3 rounded-full text-xs tracking-[0.2em] transition-all"
                      style={type === t ? { backgroundColor: C.burgundy, color: C.white, fontFamily: serif } : { color: C.espresso, fontFamily: serif }}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DIFFERENCE */}
          {activeTab === CalculatorTab.DIFFERENCE && (
            <div className="space-y-8">
              <h2 className="text-center text-2xl" style={{ color: C.burgundy, fontFamily: serif }}>Premium Difference</h2>
              <div className="grid grid-cols-2 gap-8">
                {[
                  { label: 'Current Premium', val: currentPremium, set: setCurrentPremium, ref: inputRef },
                  { label: 'Quoted Premium',  val: quotedPremium,  set: setQuotedPremium,  ref: undefined },
                ].map(({ label, val, set, ref }) => (
                  <div key={label} className="space-y-3">
                    <label className="block text-xs tracking-[0.3em] uppercase text-center" style={{ color: C.brown, fontFamily: serif }}>{label}</label>
                    <div className="relative border-b py-2" style={{ borderColor: C.sand }}>
                      <span className="absolute left-0 bottom-4 text-lg" style={{ color: C.charcoal, opacity: 0.4 }}>$</span>
                      <input ref={ref} type="number" value={val} onChange={e => set(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder="0.00" className="w-full pl-6 bg-transparent text-3xl text-center outline-none placeholder:opacity-20"
                        style={{ color: C.dark, fontFamily: serif }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DISCOUNTS */}
          {activeTab === CalculatorTab.DISCOUNTS && (
            <div className="space-y-8">
              <h2 className="text-center text-2xl" style={{ color: C.burgundy, fontFamily: serif }}>Bundle of Joy</h2>
              <div className="space-y-4">
                <div className="relative border-b py-2 max-w-xs mx-auto" style={{ borderColor: C.sand }}>
                  <span className="absolute left-0 bottom-4 text-lg" style={{ color: C.charcoal, opacity: 0.4 }}>$</span>
                  <input ref={inputRef} type="number" value={discountBase} onChange={e => setDiscountBase(e.target.value)}
                    onKeyDown={handleKeyDown} placeholder="Starting Premium"
                    className="w-full pl-6 bg-transparent text-3xl text-center outline-none placeholder:opacity-20"
                    style={{ color: C.dark, fontFamily: serif }} />
                </div>
                <div className="flex border rounded-full p-1 max-w-xs mx-auto" style={{ borderColor: C.sand, backgroundColor: C.cream }}>
                  {(['MONTHLY', '6MONTH'] as const).map(f => (
                    <button key={f} onClick={() => setDiscountFreq(f)}
                      className="flex-1 py-2 rounded-full text-xs tracking-[0.2em] uppercase transition-all"
                      style={discountFreq === f ? { backgroundColor: C.burgundy, color: C.white, fontFamily: serif } : { color: C.espresso, fontFamily: serif }}>
                      {f === 'MONTHLY' ? 'Monthly' : '6 Month'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t" style={{ borderColor: C.sand }}>
                <p className="text-xs tracking-[0.3em] uppercase text-center" style={{ color: C.brown, fontFamily: serif }}>Modify Coverage</p>
                {Object.entries(DISCOUNT_DATA).map(([label]) => (
                  <div key={label} className="flex rounded-full p-1 border" style={{ borderColor: C.sand, backgroundColor: C.cream }}>
                    {(['REMOVE', 'NONE', 'ADD'] as DiscountState[]).map(s => {
                      const isSel = selectedDiscounts[label] === s;
                      const content = s === 'REMOVE' ? 'Remove' : s === 'ADD' ? 'Add' : label;
                      const activeStyle = s === 'REMOVE' && isSel
                        ? { backgroundColor: '#fde8e8', color: '#7f1d1d' }
                        : s === 'ADD' && isSel
                        ? { backgroundColor: '#d1fae5', color: '#064e3b' }
                        : isSel
                        ? { backgroundColor: C.white, color: C.dark, fontWeight: 600 }
                        : { color: C.espresso };
                      return (
                        <button key={s} onClick={() => handleDiscountToggle(label, s)}
                          className="flex-1 py-2 rounded-full text-xs tracking-wider uppercase transition-all truncate px-2"
                          style={{ fontFamily: serif, ...activeStyle }}>
                          {content}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {parseFloat(discountBase) > 0 && (
                <div className="rounded-xl p-5 text-center border" style={{ backgroundColor: C.cream, borderColor: C.sand }}>
                  <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: C.brown, fontFamily: serif }}>Adjusted Subtotal</p>
                  <p className="text-3xl font-bold" style={{ color: C.dark, fontFamily: serif }}>{CURRENCY_FORMATTER.format(liveAdjustedPremium)}</p>
                </div>
              )}

              <div className="pt-4 border-t space-y-3" style={{ borderColor: C.sand }}>
                <p className="text-xs tracking-[0.2em] uppercase text-center" style={{ color: C.brown, fontFamily: serif }}>Optional: Add second policy</p>
                <div className="relative border-b py-2 max-w-xs mx-auto" style={{ borderColor: C.sand }}>
                  <span className="absolute left-0 bottom-4 text-lg" style={{ color: C.charcoal, opacity: 0.4 }}>$</span>
                  <input type="number" value={bundlePremium} onChange={e => setBundlePremium(e.target.value)}
                    onKeyDown={handleKeyDown} placeholder="0.00"
                    className="w-full pl-6 bg-transparent text-3xl text-center outline-none placeholder:opacity-20"
                    style={{ color: C.dark, fontFamily: serif }} />
                </div>
              </div>
            </div>
          )}

          {/* MILES */}
          {activeTab === CalculatorTab.MILES && (
            <div className="space-y-8">
              <h2 className="text-center text-2xl" style={{ color: C.burgundy, fontFamily: serif }}>Makin my way downtown</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                {[
                  { label: 'Most Recent ODO', val: curOdo, set: setCurOdo, type: 'number', ph: '000,000', ref: inputRef },
                  { label: 'Current Date',    val: curDate, set: setCurDate, type: 'text',   ph: 'MM/DD/YYYY', ref: undefined },
                  { label: 'Prior ODO',       val: prevOdo, set: setPrevOdo, type: 'number', ph: '000,000', ref: undefined },
                  { label: 'Past Date',       val: prevDate, set: setPrevDate, type: 'text',  ph: 'MM/DD/YYYY', ref: undefined },
                ].map(({ label, val, set, type, ph, ref }) => (
                  <div key={label} className="space-y-2">
                    <label className="block text-xs tracking-[0.2em] uppercase" style={{ color: C.brown, fontFamily: serif }}>{label}</label>
                    <input ref={ref} type={type} value={val} onChange={e => set(e.target.value)} onKeyDown={handleKeyDown}
                      placeholder={ph} className={inputCls} style={inputStyle} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REBUILD */}
          {activeTab === CalculatorTab.REBUILD && (
            <div className="space-y-8">
              <h2 className="text-center text-2xl" style={{ color: C.burgundy, fontFamily: serif }}>Price per Sq Ft</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs tracking-[0.2em] uppercase" style={{ color: C.brown, fontFamily: serif }}>Square Footage</label>
                  <input ref={inputRef} type="number" value={sqft} onChange={e => setSqft(e.target.value)}
                    onKeyDown={handleKeyDown} placeholder="e.g. 2500" className={inputCls} style={inputStyle} />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs tracking-[0.2em] uppercase" style={{ color: C.brown, fontFamily: serif }}>Cost per Sq Ft</label>
                  <div className="relative">
                    <span className="absolute left-0 bottom-3 text-lg" style={{ color: C.charcoal, opacity: 0.4 }}>$</span>
                    <input type="number" value={costPerSqft} readOnly={isCostLocked}
                      onDoubleClick={() => setIsCostLocked(false)}
                      onChange={e => setCostPerSqft(e.target.value)} onKeyDown={handleKeyDown}
                      className={`${inputCls} pl-5`}
                      style={{ ...inputStyle, opacity: isCostLocked ? 0.5 : 1, cursor: isCostLocked ? 'not-allowed' : 'text' }} />
                    {isCostLocked && (
                      <p className="text-xs italic mt-1" style={{ color: C.brown, opacity: 0.7, fontFamily: serif }}>Double click to edit</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LIFE */}
          {activeTab === CalculatorTab.LIFE && (
            <div className="space-y-8">
              <h2 className="text-center text-2xl" style={{ color: C.burgundy, fontFamily: serif }}>Life Coverage</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs tracking-[0.2em] uppercase" style={{ color: C.brown, fontFamily: serif }}>Monthly Income</label>
                  <div className="relative">
                    <span className="absolute left-0 bottom-3 text-lg" style={{ color: C.charcoal, opacity: 0.4 }}>$</span>
                    <input ref={inputRef} type="number" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)}
                      onKeyDown={handleKeyDown} placeholder="0.00" className={`${inputCls} pl-5`} style={inputStyle} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs tracking-[0.2em] uppercase" style={{ color: C.brown, fontFamily: serif }}>Number of Kids</label>
                  <input type="number" value={numKids} onChange={e => setNumKids(e.target.value)}
                    onKeyDown={handleKeyDown} placeholder="0" className={inputCls} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* Calculate button */}
          <div className="pt-4 flex justify-center">
            <button onClick={calculate}
              className="px-12 py-3 rounded-full text-sm tracking-[0.3em] uppercase transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: C.burgundy, color: C.white, fontFamily: serif }}>
              Calculate
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="pb-8">
            <ResultsCard result={result} onCopy={clearInputs} />
          </div>
        )}
      </main>

      {/* Footer hint */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <p className="text-xs tracking-[0.3em] uppercase px-6 py-2 rounded-full whitespace-nowrap"
          style={{ color: C.burgundy, opacity: 0.5, backgroundColor: C.white + 'cc', fontFamily: serif, backdropFilter: 'blur(8px)' }}>
          Press Enter to calculate
        </p>
      </div>
    </div>
  );
};

export default App;
