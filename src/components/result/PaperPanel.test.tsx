import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GroundedChunk } from '../../types/rag';
import type { PaperDetail } from '../../types/world';
import { useUi } from '../../store/uiStore';
import { BROWSE_NOTE, PaperPanel, UNVERIFIED_WARNING, USED_NOTE } from './PaperPanel';

const detail: PaperDetail = {
  paper_id: '2310.00297',
  title: 'LoRA Everywhere',
  authors: ['A. Nguyễn', 'B. Chen'],
  category_index: 1,
  year: 2023,
  abstract: 'We study $x$.',
  has_fulltext: true,
  chunks: [
    { chunk_id: '2310.00297::c0', section_title: 'Abstract', section_type: 'abstract', text: 'abs' },
    { chunk_id: '2310.00297::c2', section_title: '3 Method', section_type: 'method', text: 'method text' },
  ],
};

vi.mock('../../api/client', () => ({
  getPaper: (id: string) => (id === '2310.00297' ? Promise.resolve(detail) : Promise.reject(new Error('404'))),
}));

const grounded: GroundedChunk = {
  chunk_id: '2310.00297::c2', paper_id: '2310.00297', title: 'LoRA Everywhere', section_title: '3 Method', section_type: 'method',
  text: 'method text', similarity_score: 0.91, authority_score: 0.2, final_score: 0.768, citation_tag: '[Paper: 2310.00297]',
};

function open(paperId: string, ctx = { citationChecks: [{ paper_id: '2412.99999', status: 'unverified' as const }], grounded: [grounded] }) {
  useUi.setState({ panelPaperId: paperId, focusContext: ctx });
  return render(<PaperPanel />);
}

describe('PaperPanel', () => {
  beforeEach(() => useUi.setState({ panelPaperId: null, focusContext: null }));

  it('grounded: shows the used band and scores on the used chunk', async () => {
    open('2310.00297');
    expect(await screen.findByText('LoRA Everywhere')).toBeInTheDocument();
    expect(screen.getByTestId('paper-panel')).toHaveAttribute('data-case', 'grounded');
    expect(screen.getAllByText(new RegExp(USED_NOTE)).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('0.768')).toBeInTheDocument();
    expect(document.querySelector('[data-used="true"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: /arXiv/ })).toHaveAttribute('href', 'https://arxiv.org/abs/2310.00297');
  });

  it('browse: paper not used for this answer', async () => {
    open('2310.00297', { citationChecks: [], grounded: [] });
    expect(await screen.findByText('LoRA Everywhere')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(BROWSE_NOTE))).toBeInTheDocument();
    expect(document.querySelector('[data-used="true"]')).toBeNull();
  });

  it('unverified: warns and survives a failed metadata load', async () => {
    open('2412.99999');
    expect(screen.getByRole('alert')).toHaveTextContent(UNVERIFIED_WARNING);
    expect(await screen.findByText(/Không tải được metadata/)).toBeInTheDocument();
  });
});
