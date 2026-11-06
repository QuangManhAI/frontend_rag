import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { Glass } from './Glass';

describe('Glass', () => {
  it('defaults to a regular panel that is not nested', () => {
    render(<Glass data-testid="g">x</Glass>);
    const el = screen.getByTestId('g');
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveClass('glass');
    expect(el.dataset).toMatchObject({ material: 'regular', shape: 'panel', nested: 'false' });
    expect(el.dataset.interactive).toBeUndefined();
  });

  it('renders the requested element and keeps its own props', () => {
    render(
      <Glass as="header" material="strong" className="flex px-3" aria-label="Thanh trên" data-testid="g">
        x
      </Glass>,
    );
    const el = screen.getByTestId('g');
    expect(el.tagName).toBe('HEADER');
    expect(el).toHaveClass('glass', 'flex', 'px-3');
    expect(el).toHaveAttribute('aria-label', 'Thanh trên');
    expect(el.dataset.material).toBe('strong');
  });

  it('marks nested and interactive surfaces', () => {
    render(<Glass as="button" type="button" material="clear" shape="control" nested interactive data-testid="g" />);
    const el = screen.getByTestId('g');
    expect(el).toHaveAttribute('type', 'button');
    expect(el.dataset).toMatchObject({ material: 'clear', shape: 'control', nested: 'true', interactive: 'true' });
  });

  it('forwards the ref to the rendered element', () => {
    const ref = createRef<HTMLElement>();
    render(<Glass as="article" ref={ref} data-testid="g" />);
    expect(ref.current).toBe(screen.getByTestId('g'));
  });
});
