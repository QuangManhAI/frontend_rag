import type { ComponentPropsWithRef, ElementType } from 'react';

/** Glass materials (docs/FE_DESIGN_SYSTEM.md §4.1). */
export type GlassMaterial = 'regular' | 'strong' | 'clear';
/** Shape picks the radius: panel = lg, control = md, chip = full. */
export type GlassShape = 'panel' | 'control' | 'chip';

interface GlassOwnProps<T extends ElementType> {
  as?: T;
  material?: GlassMaterial;
  shape?: GlassShape;
  /** Sits inside another glass surface: no second backdrop-filter (glass never stacks on glass). */
  nested?: boolean;
  /** Hover / press feedback (§8.2); the specular highlight follows the pointer from level 2. */
  interactive?: boolean;
  className?: string;
}

export type GlassProps<T extends ElementType = 'div'> = GlassOwnProps<T> & Omit<ComponentPropsWithRef<T>, keyof GlassOwnProps<T>>;

/**
 * The one glass surface of the UI. Styling lives in index.css (`.glass` + `::before` backdrop layer +
 * `::after` specular layer) so Liquid Glass levels change tokens and filters, not components.
 */
export function Glass<T extends ElementType = 'div'>({
  as,
  material = 'regular',
  shape = 'panel',
  nested = false,
  interactive = false,
  className,
  ...rest
}: GlassProps<T>) {
  const Tag: ElementType = as ?? 'div';
  return (
    <Tag
      {...rest}
      className={className ? `glass ${className}` : 'glass'}
      data-material={material}
      data-shape={shape}
      data-nested={nested ? 'true' : 'false'}
      data-interactive={interactive ? 'true' : undefined}
    />
  );
}
