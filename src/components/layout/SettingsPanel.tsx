import { RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { useUi, type QualityMode, type Settings } from '../../store/uiStore';
import { useWorld } from '../../store/worldStore';

type NumKey = 'top_k' | 'nprobe';

const QUALITY: ReadonlyArray<readonly [QualityMode, string]> = [
  ['auto', 'Tự động'],
  ['high', 'Cao'],
  ['low', 'Thấp'],
];
const TIER_LABEL = ['đầy đủ', 'dpr 1', 'bloom nhẹ', 'tắt bloom'] as const;

/** Retrieval settings; invalid numbers are rejected (shown inline, never applied). */
export function SettingsPanel() {
  const open = useUi((s) => s.settingsOpen);
  const settings = useUi((s) => s.settings);
  const categories = useWorld((s) => s.categories);
  const tier = useUi((s) => s.qualityTier);
  const [draft, setDraft] = useState<Record<NumKey, string>>({ top_k: String(settings.top_k), nprobe: String(settings.nprobe) });
  const [errors, setErrors] = useState<Partial<Record<keyof Settings, string>>>({});
  if (!open) return null;

  const setNum = (key: NumKey, raw: string) => {
    setDraft((d) => ({ ...d, [key]: raw }));
    const n = Number(raw);
    const errs = raw.trim() === '' ? { [key]: `${key} không được để trống` } : useUi.getState().updateSettings({ [key]: n });
    setErrors((e) => ({ ...e, [key]: errs[key] }));
  };
  const setFlag = (patch: Partial<Settings>) => useUi.getState().updateSettings(patch);

  return (
    <div className="glass glass-strong w-80 max-w-[calc(100vw-2rem)] p-4 text-sm fade-in" role="dialog" aria-label="Cài đặt truy xuất" data-testid="settings-panel">
      <div className="flex items-center mb-3">
        <h2 className="font-semibold">Cài đặt</h2>
        <button type="button" className="btn btn-icon ml-auto" aria-label="Đóng cài đặt" onClick={() => useUi.getState().setSettingsOpen(false)}>
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ['top_k', 'top_k (1–20)', 1, 20],
            ['nprobe', 'nprobe (1–6)', 1, 6],
          ] as const
        ).map(([key, label, min, max]) => (
          <label key={key} className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--ink-muted)] mono">{label}</span>
            <input
              type="number"
              min={min}
              max={max}
              step={1}
              className="field mono"
              value={draft[key]}
              aria-invalid={errors[key] ? true : undefined}
              aria-describedby={errors[key] ? `${key}-err` : undefined}
              data-testid={`setting-${key}`}
              onChange={(e) => setNum(key, e.target.value)}
            />
            {errors[key] && (
              <span id={`${key}-err`} role="alert" className="text-[var(--danger)] text-[0.7rem]">
                {errors[key]}
              </span>
            )}
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-xs mt-3">
        <span className="text-[var(--ink-muted)]">Lọc loại bài báo</span>
        <select className="field" value={settings.category} onChange={(e) => setFlag({ category: e.target.value })}>
          <option value="">Tất cả</option>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="mt-3 text-xs">
        <legend className="text-[var(--ink-muted)] mb-1">
          Chất lượng <span className="mono">· đang dùng: {TIER_LABEL[tier]}</span>
        </legend>
        <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Chất lượng hiển thị">
          {QUALITY.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={settings.quality === value}
              aria-pressed={settings.quality === value}
              className="btn justify-center !py-1"
              data-testid={`quality-${value}`}
              onClick={() => setFlag({ quality: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2 mt-3 text-xs">
        {(
          [
            ['use_authority_boost', 'Tăng điểm theo authority (PageRank)'],
            ['expand_query', 'Mở rộng câu hỏi (query expansion)'],
            ['reduceMotion', 'Giảm chuyển động'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings[key]} onChange={(e) => setFlag({ [key]: e.target.checked })} className="accent-[var(--accent)]" />
            {label}
          </label>
        ))}
      </div>
      <button
        type="button"
        className="btn mt-4"
        onClick={() => {
          useUi.getState().resetSettings();
          const s = useUi.getState().settings;
          setDraft({ top_k: String(s.top_k), nprobe: String(s.nprobe) });
          setErrors({});
        }}
      >
        <RotateCcw size={13} /> Đặt lại
      </button>
    </div>
  );
}
