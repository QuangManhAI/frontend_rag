import { useCallback, type ComponentPropsWithRef, type ElementType, type Ref } from 'react';
import { registerRefractTarget } from './LiquidFilters';

/** Glass materials (docs/design/FE_DESIGN_SYSTEM.md §4.1). */
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
  /** Unique name of a floating panel that bends its backdrop at Liquid Glass level 3 (`#lg-refract-<name>`). */
  refract?: string;
  className?: string;
}

export type GlassProps<T extends ElementType = 'div'> = GlassOwnProps<T> & Omit<ComponentPropsWithRef<T>, keyof GlassOwnProps<T>>;

function assignRef<V>(ref: Ref<V> | undefined, value: V | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: V | null }).current = value;
}

/**
 * The one glass surface of the UI. Styling lives in index.css (`.glass` + `::before` tint layer +
 * `::after` specular layer) so Liquid Glass levels change tokens and filters, not components.
 */
export function Glass<T extends ElementType = 'div'>({
  as,
  material = 'regular',
  shape = 'panel',
  nested = false,
  interactive = false,
  refract,
  className,
  ...rest
}: GlassProps<T>) {
  const Tag: ElementType = as ?? 'div';
  const { ref: outerRef, ...props } = rest as typeof rest & { ref?: Ref<HTMLElement> };
  const ref = useCallback(
    (el: HTMLElement | null) => {
      assignRef(outerRef, el);
      if (refract) registerRefractTarget(refract, el);
    },
    [outerRef, refract],
  );
  return (
    <Tag
      {...props}
      ref={ref}
      className={className ? `glass ${className}` : 'glass'}
      data-material={material}
      data-shape={shape}
      data-nested={nested ? 'true' : 'false'}
      data-interactive={interactive ? 'true' : undefined}
      data-refract={refract}
    />
  );
}
