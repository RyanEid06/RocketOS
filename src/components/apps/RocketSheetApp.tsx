import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FSItem } from '../../types';
import {
  Save,
  Download,
  Upload,
  Plus,
  Trash2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Calculator,
  FileSpreadsheet,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { RocketFS } from '../../core/filesystem/RocketFS';
import { notificationService } from '../../core/notifications/NotificationService';
import { soundEngine } from '../../utils/audio';

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  format?: 'plain' | 'currency' | 'percent';
}

interface CellData {
  raw: string;
  computed: string;
  format?: CellFormat;
}

interface RocketSheetAppProps {
  initialFilePath?: string;
  onSaveFile?: (path: string, content: string) => void;
}

const DEFAULT_ROWS = 25;
const DEFAULT_COLS = 8; // A to H

const getColName = (idx: number): string => {
  return String.fromCharCode(65 + idx);
};

export const RocketSheetApp: React.FC<RocketSheetAppProps> = ({
  initialFilePath = '/Documents/Quarterly_Budget.csv',
  onSaveFile,
}) => {
  const [currentPath, setCurrentPath] = useState<string>(initialFilePath);
  const [numRows, setNumRows] = useState<number>(DEFAULT_ROWS);
  const [numCols, setNumCols] = useState<number>(DEFAULT_COLS);
  const [grid, setGrid] = useState<Record<string, CellData>>({});
  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [formulaValue, setFormulaValue] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  const formulaInputRef = useRef<HTMLInputElement | null>(null);
  const cellInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial file or fallback to sample
  useEffect(() => {
    const rfs = RocketFS.getInstance();
    const item = rfs.resolvePath(currentPath);
    if (item && item.type === 'file' && item.content) {
      loadFromCsv(item.content);
    } else {
      // Load sample budget
      const sample = `Category,Q1 Budget,Q1 Actual,Variance,Status
Kernel Dev,45000,42500,=B2-C2,On Target
LLVM Backend,38000,37200,=B3-C3,On Target
GUI & Shell,28000,29100,=B4-C4,Review
VFS Engine,22000,19800,=B5-C5,Under Budget
Cloud Hosting,12000,11400,=B6-C6,On Target
Total,=SUM(B2:B6),=SUM(C2:C6),=SUM(D2:D6),Healthy`;
      loadFromCsv(sample);
    }
  }, [currentPath]);

  // Convert CSV string into Grid State
  const loadFromCsv = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const newGrid: Record<string, CellData> = {};
    let maxCols = DEFAULT_COLS;
    const maxRows = Math.max(lines.length + 5, DEFAULT_ROWS);

    lines.forEach((line, rIdx) => {
      // Split preserving quotes if needed
      const cols = line.split(',');
      if (cols.length > maxCols) maxCols = cols.length;

      cols.forEach((val, cIdx) => {
        const cellKey = `${getColName(cIdx)}${rIdx + 1}`;
        const raw = val.trim();
        newGrid[cellKey] = {
          raw,
          computed: computeValue(raw, newGrid),
          format: rIdx === 0 ? { bold: true, align: 'left' } : {},
        };
      });
    });

    setNumRows(maxRows);
    setNumCols(Math.max(maxCols, DEFAULT_COLS));
    setGrid(newGrid);
    setIsDirty(false);
  };

  // Safe formula computation
  const computeValue = (raw: string, currentGrid: Record<string, CellData>): string => {
    if (!raw.startsWith('=')) return raw;

    const expr = raw.substring(1).trim().toUpperCase();

    try {
      // 1. =SUM(A1:A5)
      const sumMatch = expr.match(/^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
      if (sumMatch) {
        const startCol = sumMatch[1].charCodeAt(0) - 65;
        const startRow = parseInt(sumMatch[2], 10);
        const endCol = sumMatch[3].charCodeAt(0) - 65;
        const endRow = parseInt(sumMatch[4], 10);

        let total = 0;
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const k = `${getColName(c)}${r}`;
            const cellVal = parseFloat(currentGrid[k]?.computed || currentGrid[k]?.raw || '0');
            if (!isNaN(cellVal)) total += cellVal;
          }
        }
        return total.toString();
      }

      // 2. =AVERAGE(A1:A5)
      const avgMatch = expr.match(/^AVERAGE\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
      if (avgMatch) {
        const startCol = avgMatch[1].charCodeAt(0) - 65;
        const startRow = parseInt(avgMatch[2], 10);
        const endCol = avgMatch[3].charCodeAt(0) - 65;
        const endRow = parseInt(avgMatch[4], 10);

        let total = 0;
        let count = 0;
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const k = `${getColName(c)}${r}`;
            const cellVal = parseFloat(currentGrid[k]?.computed || currentGrid[k]?.raw || '0');
            if (!isNaN(cellVal)) {
              total += cellVal;
              count++;
            }
          }
        }
        return count > 0 ? (total / count).toFixed(2).replace(/\.?0+$/, '') : '0';
      }

      // 3. Simple math like =B2-C2 or =A1*1.2
      const evaluated = expr.replace(/([A-Z]+)(\d+)/g, (_, col, row) => {
        const k = `${col}${row}`;
        const val = currentGrid[k]?.computed || currentGrid[k]?.raw || '0';
        const num = parseFloat(val.replace(/[^0-9.-]+/g, ''));
        return isNaN(num) ? '0' : num.toString();
      });

      // eslint-disable-next-line no-eval
      const result = Function(`"use strict"; return (${evaluated})`)();
      if (typeof result === 'number' && !isNaN(result)) {
        return Number.isInteger(result) ? result.toString() : result.toFixed(2);
      }
      return '#VALUE!';
    } catch {
      return '#ERROR!';
    }
  };

  // Recompute entire grid when any value changes
  const recomputeAll = (updatedGrid: Record<string, CellData>) => {
    const next: Record<string, CellData> = { ...updatedGrid };
    // Pass 1: compute formulas
    Object.keys(next).forEach((k) => {
      const raw = next[k]?.raw || '';
      if (raw.startsWith('=')) {
        next[k] = { ...next[k], computed: computeValue(raw, next) };
      } else {
        next[k] = { ...next[k], computed: raw };
      }
    });
    return next;
  };

  const handleCellChange = (cellKey: string, newRaw: string) => {
    const updated = {
      ...grid,
      [cellKey]: {
        ...(grid[cellKey] || {}),
        raw: newRaw,
        computed: newRaw,
      },
    };
    const finalGrid = recomputeAll(updated);
    setGrid(finalGrid);
    setIsDirty(true);
  };

  const handleSelectCell = (cellKey: string) => {
    setSelectedCell(cellKey);
    setEditingCell(null);
    setFormulaValue(grid[cellKey]?.raw || '');
  };

  const handleDoubleClickCell = (cellKey: string) => {
    setSelectedCell(cellKey);
    setEditingCell(cellKey);
    setFormulaValue(grid[cellKey]?.raw || '');
    setTimeout(() => cellInputRef.current?.focus(), 20);
  };

  // Toggle formats for current cell
  const handleToggleFormat = (type: 'bold' | 'italic') => {
    const current = grid[selectedCell]?.format || {};
    const updatedFormat = { ...current, [type]: !current[type] };
    setGrid((prev) => ({
      ...prev,
      [selectedCell]: {
        ...(prev[selectedCell] || { raw: '', computed: '' }),
        format: updatedFormat,
      },
    }));
    setIsDirty(true);
  };

  const handleSetAlignment = (align: 'left' | 'center' | 'right') => {
    const current = grid[selectedCell]?.format || {};
    setGrid((prev) => ({
      ...prev,
      [selectedCell]: {
        ...(prev[selectedCell] || { raw: '', computed: '' }),
        format: { ...current, align },
      },
    }));
    setIsDirty(true);
  };

  const handleSetNumberFormat = (numFormat: 'currency' | 'percent' | 'plain') => {
    const current = grid[selectedCell]?.format || {};
    const nextFormat = current.format === numFormat ? 'plain' : numFormat;
    setGrid((prev) => ({
      ...prev,
      [selectedCell]: {
        ...(prev[selectedCell] || { raw: '', computed: '' }),
        format: { ...current, format: nextFormat },
      },
    }));
    setIsDirty(true);
  };

  // Export to CSV string
  const serializeToCsv = (): string => {
    const rows: string[] = [];
    for (let r = 1; r <= numRows; r++) {
      const rowCols: string[] = [];
      for (let c = 0; c < numCols; c++) {
        const k = `${getColName(c)}${r}`;
        const raw = grid[k]?.raw || '';
        // Wrap in quotes if it contains comma
        rowCols.push(raw.includes(',') ? `"${raw}"` : raw);
      }
      rows.push(rowCols.join(','));
    }
    return rows.join('\n');
  };

  const handleSave = () => {
    const csvContent = serializeToCsv();
    const rfs = RocketFS.getInstance();
    rfs.writeFile(currentPath, csvContent);
    if (onSaveFile) onSaveFile(currentPath, csvContent);

    setIsDirty(false);
    setSaveStatus('saved');
    soundEngine.play('click');
    notificationService.sendNotification({
      title: 'Rocket Sheet',
      message: `Saved spreadsheet to ${currentPath}`,
      type: 'success',
    });
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleExportCsv = () => {
    const csv = serializeToCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', currentPath.split('/').pop() || 'spreadsheet.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notificationService.sendNotification({
      title: 'Spreadsheet Export',
      message: 'Downloaded CSV file to your local computer',
      type: 'info',
    });
  };

  // Format displayed cell value
  const renderCellDisplay = (cellKey: string) => {
    const cell = grid[cellKey];
    if (!cell) return '';

    const val = cell.computed;
    if (!val) return '';

    if (cell.format?.format === 'currency') {
      const n = parseFloat(val.replace(/[^0-9.-]+/g, ''));
      return isNaN(n) ? val : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
    if (cell.format?.format === 'percent') {
      const n = parseFloat(val.replace(/[^0-9.-]+/g, ''));
      return isNaN(n) ? val : `${(n * 100).toFixed(1)}%`;
    }
    return val;
  };

  // Selection statistics
  const currentVal = grid[selectedCell]?.computed || '';
  const numValue = parseFloat(currentVal.replace(/[^0-9.-]+/g, ''));

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Application Ribbon */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-900/90 backdrop-blur-md gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                {currentPath.split('/').pop()}
              </span>
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{currentPath}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            {saveStatus === 'saved' ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saveStatus === 'saved' ? 'Saved' : 'Save'}</span>
          </button>
          <button
            onClick={handleExportCsv}
            title="Download CSV file"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => {
              setNumRows((r) => r + 5);
              soundEngine.play('click');
            }}
            title="Add 5 rows"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+5 Rows</span>
          </button>
        </div>
      </div>

      {/* Formatting & Tool Bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/60 text-xs overflow-x-auto">
        <div className="flex items-center gap-1 border-r border-white/10 pr-2">
          <button
            onClick={() => handleToggleFormat('bold')}
            className={`p-1.5 rounded-lg transition-colors ${
              grid[selectedCell]?.format?.bold ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:bg-white/5'
            }`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleToggleFormat('italic')}
            className={`p-1.5 rounded-lg transition-colors ${
              grid[selectedCell]?.format?.italic ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:bg-white/5'
            }`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 border-r border-white/10 pr-2">
          <button
            onClick={() => handleSetAlignment('left')}
            className={`p-1.5 rounded-lg transition-colors ${
              grid[selectedCell]?.format?.align === 'left' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:bg-white/5'
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSetAlignment('center')}
            className={`p-1.5 rounded-lg transition-colors ${
              grid[selectedCell]?.format?.align === 'center' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:bg-white/5'
            }`}
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSetAlignment('right')}
            className={`p-1.5 rounded-lg transition-colors ${
              grid[selectedCell]?.format?.align === 'right' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:bg-white/5'
            }`}
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 border-r border-white/10 pr-2">
          <button
            onClick={() => handleSetNumberFormat('currency')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-[11px] ${
              grid[selectedCell]?.format?.format === 'currency' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:bg-white/5'
            }`}
            title="Format as Currency ($)"
          >
            <DollarSign className="w-3 h-3" />
            <span>USD</span>
          </button>
          <button
            onClick={() => handleSetNumberFormat('percent')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-[11px] ${
              grid[selectedCell]?.format?.format === 'percent' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:bg-white/5'
            }`}
            title="Format as Percentage (%)"
          >
            <Percent className="w-3 h-3" />
            <span>%</span>
          </button>
        </div>

        {/* Formula Helper Buttons */}
        <div className="flex items-center gap-1.5 ml-auto text-[11px] text-slate-400">
          <span className="hidden md:inline">Formulas:</span>
          <button
            onClick={() => {
              setFormulaValue('=SUM(B1:B10)');
              handleCellChange(selectedCell, '=SUM(B1:B10)');
            }}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
          >
            SUM
          </button>
          <button
            onClick={() => {
              setFormulaValue('=AVERAGE(B1:B10)');
              handleCellChange(selectedCell, '=AVERAGE(B1:B10)');
            }}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
          >
            AVG
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/40 border-b border-white/10 text-xs">
        <div className="w-14 px-2 py-1 rounded bg-black/40 border border-white/10 font-mono text-center font-bold text-sky-400 text-xs">
          {selectedCell}
        </div>
        <span className="font-mono text-slate-500 font-bold text-sm">fx</span>
        <input
          ref={formulaInputRef}
          type="text"
          value={formulaValue}
          onChange={(e) => {
            setFormulaValue(e.target.value);
            handleCellChange(selectedCell, e.target.value);
          }}
          placeholder="Enter a value or formula (=SUM(A1:A5), =A1*2, etc.)"
          className="w-full bg-transparent px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none placeholder-slate-500"
        />
      </div>

      {/* Spreadsheet Table Grid */}
      <div className="flex-1 overflow-auto bg-slate-950/80">
        <table className="border-collapse w-full min-w-[700px] text-xs font-mono">
          <thead>
            <tr className="bg-slate-900/80 sticky top-0 z-10 border-b border-white/15">
              <th className="w-12 p-1.5 border-r border-white/10 text-slate-500 font-normal text-center select-none">
                #
              </th>
              {Array.from({ length: numCols }).map((_, cIdx) => {
                const colLetter = getColName(cIdx);
                const isColSelected = selectedCell.startsWith(colLetter);
                return (
                  <th
                    key={colLetter}
                    className={`min-w-[100px] p-1.5 border-r border-white/10 text-center font-semibold select-none ${
                      isColSelected ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400'
                    }`}
                  >
                    {colLetter}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numRows }).map((_, rIdx) => {
              const rowNum = rIdx + 1;
              const isRowSelected = selectedCell.endsWith(rowNum.toString());

              return (
                <tr key={rowNum} className="border-b border-white/5 hover:bg-white/[0.02]">
                  {/* Row Header */}
                  <td
                    className={`p-1.5 border-r border-white/10 text-center text-[10px] select-none ${
                      isRowSelected ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-500 bg-slate-900/40'
                    }`}
                  >
                    {rowNum}
                  </td>

                  {/* Columns */}
                  {Array.from({ length: numCols }).map((_, cIdx) => {
                    const colLetter = getColName(cIdx);
                    const cellKey = `${colLetter}${rowNum}`;
                    const isSelected = selectedCell === cellKey;
                    const isEditing = editingCell === cellKey;
                    const cellData = grid[cellKey];
                    const format = cellData?.format || {};

                    return (
                      <td
                        key={cellKey}
                        onClick={() => handleSelectCell(cellKey)}
                        onDoubleClick={() => handleDoubleClickCell(cellKey)}
                        className={`p-1.5 border-r border-white/5 cursor-cell truncate max-w-[140px] transition-colors relative ${
                          isSelected
                            ? 'bg-sky-500/20 ring-2 ring-sky-400 text-white z-0'
                            : 'text-slate-200'
                        } ${format.bold ? 'font-bold' : 'font-normal'} ${
                          format.italic ? 'italic' : ''
                        } text-${format.align || 'left'}`}
                      >
                        {isEditing ? (
                          <input
                            ref={cellInputRef}
                            type="text"
                            value={formulaValue}
                            onChange={(e) => {
                              setFormulaValue(e.target.value);
                              handleCellChange(cellKey, e.target.value);
                            }}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingCell(null);
                                // Move down
                                if (rowNum < numRows) {
                                  handleSelectCell(`${colLetter}${rowNum + 1}`);
                                }
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className="w-full bg-slate-900 border border-sky-400 px-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          renderCellDisplay(cellKey)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Status & Summary Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/10 bg-slate-950 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <span>Cell: <strong className="text-slate-200">{selectedCell}</strong></span>
          {grid[selectedCell]?.raw?.startsWith('=') && (
            <span className="text-emerald-400 font-semibold">
              fx = {grid[selectedCell]?.raw}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isNaN(numValue) && (
            <span>Selected Value: <strong className="text-slate-200">{numValue.toLocaleString()}</strong></span>
          )}
          <span>Grid: {numCols} cols × {numRows} rows</span>
        </div>
      </div>
    </div>
  );
};
