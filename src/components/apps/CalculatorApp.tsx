import React, { useState, useEffect } from 'react';
import {
  Calculator as CalcIcon,
  RotateCcw,
  Delete,
  Copy,
  Check,
  Binary,
  Cpu,
  History,
  Sparkles,
} from 'lucide-react';
import { soundEngine } from '../../utils/audio';
import { clipboardService } from '../../core/clipboard/ClipboardService';
import { notificationService } from '../../core/notifications/NotificationService';

type CalcMode = 'scientific' | 'programmer';
type AngleMode = 'deg' | 'rad';
type WordSize = '64' | '32' | '16' | '8';

export const CalculatorApp: React.FC = () => {
  const [mode, setMode] = useState<CalcMode>('scientific');
  const [display, setDisplay] = useState<string>('0');
  const [equation, setEquation] = useState<string>('');
  const [history, setHistory] = useState<{ expr: string; res: string }[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Scientific options
  const [angleMode, setAngleMode] = useState<AngleMode>('deg');

  // Programmer options
  const [wordSize, setWordSize] = useState<WordSize>('64');
  const [activeBase, setActiveBase] = useState<'hex' | 'dec' | 'oct' | 'bin'>('dec');

  // Programmer numerical representations derived from current integer value
  const currentBigInt = React.useMemo(() => {
    try {
      const clean = display.replace(/[^0-9a-fA-F-]/g, '');
      if (!clean || clean === '-') return BigInt(0);
      if (clean.startsWith('0x')) return BigInt(clean);
      return BigInt(clean);
    } catch {
      return BigInt(0);
    }
  }, [display]);

  // Mask by word size
  const maskBigInt = (val: bigint, size: WordSize): bigint => {
    if (size === '8') return BigInt.asIntN(8, val);
    if (size === '16') return BigInt.asIntN(16, val);
    if (size === '32') return BigInt.asIntN(32, val);
    return BigInt.asIntN(64, val);
  };

  const maskedValue = maskBigInt(currentBigInt, wordSize);

  const hexString = (maskedValue >= 0n ? maskedValue : (1n << BigInt(wordSize)) + maskedValue)
    .toString(16)
    .toUpperCase();
  const decString = maskedValue.toString(10);
  const octString = (maskedValue >= 0n ? maskedValue : (1n << BigInt(wordSize)) + maskedValue).toString(8);
  const rawBin = (maskedValue >= 0n ? maskedValue : (1n << BigInt(wordSize)) + maskedValue).toString(2);
  const binString = rawBin.padStart(parseInt(wordSize, 10), '0').replace(/(.{4})/g, '$1 ').trim();

  // Input Handling
  const handleDigit = (char: string) => {
    soundEngine.play('click');
    setDisplay((prev) => {
      if (prev === '0' || prev === 'Error') return char;
      return prev + char;
    });
  };

  const handleClear = () => {
    soundEngine.play('click');
    setDisplay('0');
    setEquation('');
  };

  const handleBackspace = () => {
    soundEngine.play('click');
    setDisplay((prev) => {
      if (prev.length <= 1 || prev === 'Error') return '0';
      return prev.slice(0, -1);
    });
  };

  const handleOperator = (op: string) => {
    soundEngine.play('click');
    setEquation(`${display} ${op} `);
    setDisplay('0');
  };

  const handleEqual = () => {
    soundEngine.play('click');
    if (!equation) return;

    const fullExpr = equation + display;
    try {
      if (mode === 'programmer') {
        // Bitwise arithmetic
        const parts = fullExpr.trim().split(/\s+/);
        if (parts.length === 3) {
          const a = BigInt(parts[0]);
          const op = parts[1];
          const b = BigInt(parts[2]);
          let res = 0n;

          if (op === '+') res = a + b;
          else if (op === '-') res = a - b;
          else if (op === '*') res = a * b;
          else if (op === '/' && b !== 0n) res = a / b;
          else if (op === 'AND') res = a & b;
          else if (op === 'OR') res = a | b;
          else if (op === 'XOR') res = a ^ b;
          else if (op === 'LSH') res = a << b;
          else if (op === 'RSH') res = a >> b;

          const finalVal = maskBigInt(res, wordSize).toString();
          setDisplay(finalVal);
          setHistory((h) => [{ expr: fullExpr, res: finalVal }, ...h.slice(0, 15)]);
          setEquation('');
          return;
        }
      }

      // Scientific calculation
      let sanitized = fullExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\^/g, '**');

      // eslint-disable-next-line no-eval
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        const formatted = Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, '');
        setDisplay(formatted);
        setHistory((h) => [{ expr: fullExpr, res: formatted }, ...h.slice(0, 15)]);
        setEquation('');
      } else {
        setDisplay('Error');
      }
    } catch {
      setDisplay('Error');
    }
  };

  // Scientific single-operand functions
  const handleSciFunc = (fnName: string) => {
    soundEngine.play('click');
    const val = parseFloat(display);
    if (isNaN(val)) return;

    let res = 0;
    const rad = angleMode === 'deg' ? (val * Math.PI) / 180 : val;

    switch (fnName) {
      case 'sin':
        res = Math.sin(rad);
        break;
      case 'cos':
        res = Math.cos(rad);
        break;
      case 'tan':
        res = Math.tan(rad);
        break;
      case 'sqrt':
        res = Math.sqrt(val);
        break;
      case 'sqr':
        res = val * val;
        break;
      case 'log':
        res = Math.log10(val);
        break;
      case 'ln':
        res = Math.log(val);
        break;
      case 'inv':
        res = val !== 0 ? 1 / val : 0;
        break;
      case 'neg':
        res = -val;
        break;
      case 'pi':
        res = Math.PI;
        break;
      case 'e':
        res = Math.E;
        break;
      default:
        return;
    }

    const formatted = Number.isInteger(res) ? res.toString() : res.toFixed(6).replace(/\.?0+$/, '');
    setDisplay(formatted);
    setHistory((h) => [{ expr: `${fnName}(${display})`, res: formatted }, ...h.slice(0, 15)]);
  };

  const handleCopyResult = () => {
    clipboardService.copyText(display);
    setCopied(true);
    soundEngine.play('click');
    notificationService.sendNotification({
      title: 'Calculator',
      message: `Copied "${display}" to clipboard`,
      type: 'info',
    });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Header & Mode Toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <CalcIcon className="w-4 h-4" />
          </div>
          <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => {
                setMode('scientific');
                soundEngine.play('click');
              }}
              className={`px-3 py-1 rounded-lg transition-colors font-medium cursor-pointer ${
                mode === 'scientific'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scientific
            </button>
            <button
              onClick={() => {
                setMode('programmer');
                soundEngine.play('click');
              }}
              className={`px-3 py-1 rounded-lg transition-colors font-medium cursor-pointer ${
                mode === 'programmer'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Programmer
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showHistory
                ? 'bg-sky-500/20 text-sky-300 border-sky-400/30'
                : 'text-slate-400 hover:text-white border-transparent hover:bg-white/5'
            }`}
            title="Toggle Calculation History"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Display Box */}
      <div className="p-4 bg-slate-900/40 border-b border-white/10 flex flex-col justify-end text-right">
        <div className="h-5 text-xs font-mono text-slate-400 truncate tracking-wide">
          {equation || ' '}
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <button
            onClick={handleCopyResult}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
            title="Copy result"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <div className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tight truncate max-w-[85%]">
            {display}
          </div>
        </div>
      </div>

      {/* Programmer Mode Bases Bar */}
      {mode === 'programmer' && (
        <div className="px-4 py-2 bg-black/30 border-b border-white/10 font-mono text-xs space-y-1">
          <div className="flex items-center justify-between pb-1 border-b border-white/5 text-[11px]">
            <span className="text-slate-500 font-sans">Rocket Word Size:</span>
            <div className="flex gap-1">
              {(['64', '32', '16', '8'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => setWordSize(sz)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    wordSize === sz ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {sz === '64' ? '64-bit Int' : sz === '8' ? '8-bit Byte' : `${sz}-bit`}
                </button>
              ))}
            </div>
          </div>

          <div
            onClick={() => setActiveBase('hex')}
            className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
              activeBase === 'hex' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <span className="text-slate-500">HEX</span>
            <span>0x{hexString}</span>
          </div>
          <div
            onClick={() => setActiveBase('dec')}
            className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
              activeBase === 'dec' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <span className="text-slate-500">DEC</span>
            <span>{decString}</span>
          </div>
          <div
            onClick={() => setActiveBase('oct')}
            className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
              activeBase === 'oct' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <span className="text-slate-500">OCT</span>
            <span>0o{octString}</span>
          </div>
          <div
            onClick={() => setActiveBase('bin')}
            className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
              activeBase === 'bin' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <span className="text-slate-500">BIN</span>
            <span className="text-[11px] tracking-wider">{binString}</span>
          </div>
        </div>
      )}

      {/* History Slide Panel */}
      {showHistory && (
        <div className="bg-slate-900/90 border-b border-white/10 p-3 max-h-36 overflow-y-auto space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans pb-1 border-b border-white/5">
            <span>Calculation History</span>
            <button
              onClick={() => setHistory([])}
              className="text-rose-400 hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
          {history.length === 0 ? (
            <div className="text-slate-500 py-2 text-center">No calculations yet</div>
          ) : (
            history.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setDisplay(item.res);
                  soundEngine.play('click');
                }}
                className="flex items-center justify-between p-1.5 rounded hover:bg-white/5 cursor-pointer"
              >
                <span className="text-slate-400 truncate">{item.expr} =</span>
                <span className="text-sky-300 font-bold">{item.res}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Keypad Grid */}
      <div className="flex-1 p-3 grid grid-cols-5 gap-1.5 bg-slate-950/80">
        {mode === 'scientific' ? (
          <>
            {/* Row 1 */}
            <button
              onClick={() => setAngleMode(angleMode === 'deg' ? 'rad' : 'deg')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-semibold text-amber-400 hover:bg-slate-700 transition-colors"
            >
              {angleMode.toUpperCase()}
            </button>
            <button
              onClick={() => handleSciFunc('sin')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              sin
            </button>
            <button
              onClick={() => handleSciFunc('cos')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              cos
            </button>
            <button
              onClick={() => handleSciFunc('tan')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              tan
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-xl bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-600/40 transition-colors"
            >
              AC
            </button>

            {/* Row 2 */}
            <button
              onClick={() => handleSciFunc('sqrt')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              √x
            </button>
            <button
              onClick={() => handleSciFunc('sqr')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              x²
            </button>
            <button
              onClick={() => handleSciFunc('inv')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              1/x
            </button>
            <button
              onClick={() => handleDigit('(')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              (
            </button>
            <button
              onClick={() => handleDigit(')')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              )
            </button>

            {/* Row 3 */}
            <button
              onClick={() => handleSciFunc('pi')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              π
            </button>
            <button
              onClick={() => handleDigit('7')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              7
            </button>
            <button
              onClick={() => handleDigit('8')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              8
            </button>
            <button
              onClick={() => handleDigit('9')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              9
            </button>
            <button
              onClick={() => handleOperator('÷')}
              className="p-2 rounded-xl bg-sky-600/30 text-sky-300 border border-sky-500/30 text-base font-bold hover:bg-sky-600/40 transition-colors"
            >
              ÷
            </button>

            {/* Row 4 */}
            <button
              onClick={() => handleSciFunc('e')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              e
            </button>
            <button
              onClick={() => handleDigit('4')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              4
            </button>
            <button
              onClick={() => handleDigit('5')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              5
            </button>
            <button
              onClick={() => handleDigit('6')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              6
            </button>
            <button
              onClick={() => handleOperator('×')}
              className="p-2 rounded-xl bg-sky-600/30 text-sky-300 border border-sky-500/30 text-base font-bold hover:bg-sky-600/40 transition-colors"
            >
              ×
            </button>

            {/* Row 5 */}
            <button
              onClick={() => handleSciFunc('ln')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              ln
            </button>
            <button
              onClick={() => handleDigit('1')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              1
            </button>
            <button
              onClick={() => handleDigit('2')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              2
            </button>
            <button
              onClick={() => handleDigit('3')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              3
            </button>
            <button
              onClick={() => handleOperator('-')}
              className="p-2 rounded-xl bg-sky-600/30 text-sky-300 border border-sky-500/30 text-base font-bold hover:bg-sky-600/40 transition-colors"
            >
              -
            </button>

            {/* Row 6 */}
            <button
              onClick={() => handleSciFunc('neg')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              ±
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              0
            </button>
            <button
              onClick={() => handleDigit('.')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              .
            </button>
            <button
              onClick={handleBackspace}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center"
            >
              <Delete className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleOperator('+')}
              className="p-2 rounded-xl bg-sky-600/30 text-sky-300 border border-sky-500/30 text-base font-bold hover:bg-sky-600/40 transition-colors"
            >
              +
            </button>

            {/* Equal Span */}
            <div className="col-span-5 pt-1">
              <button
                onClick={handleEqual}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-base shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
              >
                =
              </button>
            </div>
          </>
        ) : (
          /* Programmer Mode Keypad */
          <>
            <button
              onClick={() => handleOperator('AND')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-purple-300 hover:bg-slate-700"
            >
              AND
            </button>
            <button
              onClick={() => handleOperator('OR')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-purple-300 hover:bg-slate-700"
            >
              OR
            </button>
            <button
              onClick={() => handleOperator('XOR')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-purple-300 hover:bg-slate-700"
            >
              XOR
            </button>
            <button
              onClick={() => {
                const negated = maskBigInt(~maskedValue, wordSize).toString();
                setDisplay(negated);
              }}
              className="p-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-purple-300 hover:bg-slate-700"
            >
              NOT
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-xl bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-600/40"
            >
              AC
            </button>

            <button
              onClick={() => handleOperator('LSH')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-purple-300 hover:bg-slate-700"
            >
              &lt;&lt;
            </button>
            <button
              onClick={() => handleOperator('RSH')}
              className="p-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-purple-300 hover:bg-slate-700"
            >
              &gt;&gt;
            </button>
            <button
              onClick={() => handleDigit('A')}
              disabled={activeBase !== 'hex'}
              className="p-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-amber-300 hover:bg-slate-700 disabled:opacity-30"
            >
              A
            </button>
            <button
              onClick={() => handleDigit('B')}
              disabled={activeBase !== 'hex'}
              className="p-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-amber-300 hover:bg-slate-700 disabled:opacity-30"
            >
              B
            </button>
            <button
              onClick={handleBackspace}
              className="p-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 flex items-center justify-center"
            >
              <Delete className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleDigit('C')}
              disabled={activeBase !== 'hex'}
              className="p-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-amber-300 hover:bg-slate-700 disabled:opacity-30"
            >
              C
            </button>
            <button
              onClick={() => handleDigit('D')}
              disabled={activeBase !== 'hex'}
              className="p-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-amber-300 hover:bg-slate-700 disabled:opacity-30"
            >
              D
            </button>
            <button
              onClick={() => handleDigit('7')}
              disabled={activeBase === 'bin'}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-30"
            >
              7
            </button>
            <button
              onClick={() => handleDigit('8')}
              disabled={activeBase === 'bin' || activeBase === 'oct'}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-30"
            >
              8
            </button>
            <button
              onClick={() => handleDigit('9')}
              disabled={activeBase === 'bin' || activeBase === 'oct'}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-30"
            >
              9
            </button>

            <button
              onClick={() => handleDigit('E')}
              disabled={activeBase !== 'hex'}
              className="p-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-amber-300 hover:bg-slate-700 disabled:opacity-30"
            >
              E
            </button>
            <button
              onClick={() => handleDigit('F')}
              disabled={activeBase !== 'hex'}
              className="p-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-amber-300 hover:bg-slate-700 disabled:opacity-30"
            >
              F
            </button>
            <button
              onClick={() => handleDigit('4')}
              disabled={activeBase === 'bin'}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-30"
            >
              4
            </button>
            <button
              onClick={() => handleDigit('5')}
              disabled={activeBase === 'bin'}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-30"
            >
              5
            </button>
            <button
              onClick={() => handleDigit('6')}
              disabled={activeBase === 'bin'}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-30"
            >
              6
            </button>

            <button
              onClick={() => handleDigit('1')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800"
            >
              1
            </button>
            <button
              onClick={() => handleDigit('2')}
              disabled={activeBase === 'bin'}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-30"
            >
              2
            </button>
            <button
              onClick={() => handleDigit('3')}
              disabled={activeBase === 'bin'}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-30"
            >
              3
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="p-2 rounded-xl bg-slate-900 border border-white/5 text-sm font-bold text-white hover:bg-slate-800"
            >
              0
            </button>
            <button
              onClick={handleEqual}
              className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-md"
            >
              =
            </button>
          </>
        )}
      </div>
    </div>
  );
};
