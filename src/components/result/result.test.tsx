import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { useUi } from '../../store/uiStore';
import { useWorld } from '../../store/worldStore';
import { useRag } from '../../store/ragStore';
import { useFx } from '../../store/fxStore';
import { ResultCard } from './ResultCard';
import { TopKBadges } from './TopKBadges';
import { Anchor, anchors, createManualAnchor, projectAnchors } from '../world/overlay/anchors';

describe('Result Components & 3D Anchors', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    anchors.clear();
    useUi.setState({
      focusedPaperId: null,
      panelPaperId: null,
      focusContext: null,
    });
    useWorld.setState({
      vectors: null,
      vectorIds: [],
      vectorIndexByPaperId: new Map(),
      categories: [{ index: 0, code: 'cs.AI', name: 'Artificial Intelligence', paper_count: 10 }],
    });
    useFx.setState({ topK: [] });
  });

  describe('anchors overlay math', () => {
    it('registers and unregisters Anchor elements in the set', () => {
      const { unmount } = render(
        <Anchor position={[0, 0, 0]}>
          <span>Label</span>
        </Anchor>,
      );
      expect(anchors.size).toBe(1);

      unmount();
      expect(anchors.size).toBe(0);
    });

    it('projects visible anchors onto screen coordinates', () => {
      const el = document.createElement('div');
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();

      const item = {
        el,
        pos: new THREE.Vector3(0, 0, 0),
        visible: true,
        distanceFactor: 10,
      };
      anchors.add(item);

      projectAnchors(camera, 800, 600);
      expect(el.style.visibility).toBe('visible');
      expect(el.style.transform).toContain('translate3d(400.0px, 300.0px, 0)');

      item.visible = false;
      projectAnchors(camera, 800, 600);
      expect(el.style.visibility).toBe('hidden');

      item.visible = true;
      item.pos.set(0, 0, 20); // behind the camera
      projectAnchors(camera, 800, 600);
      expect(el.style.visibility).toBe('hidden');
    });

    it('createManualAnchor shows and hides content', () => {
      const manual = createManualAnchor();
      const el = document.createElement('div');
      const label = document.createElement('span');
      el.appendChild(label);

      manual.item = { el, pos: new THREE.Vector3(), visible: false };
      manual.show([1, 2, 3], '0.92');
      expect(manual.item.visible).toBe(true);
      expect(label.textContent).toBe('0.92');

      manual.hide();
      expect(manual.item.visible).toBe(false);
    });
  });

  describe('ResultCard', () => {
    it('returns null when focusedPaperId is null or vectors not loaded', () => {
      const { container } = render(<ResultCard />);
      expect(container.firstChild).toBeNull();
    });

    it('renders ResultCard for focused paper and handles actions', () => {
      useWorld.setState({
        vectorIds: ['p1'],
        vectorIndexByPaperId: new Map([['p1', 0]]),
        vectors: {
          count: 1,
          positions: new Float32Array([0, 10, 0]),
          years: new Uint16Array([2023]),
          categories: new Uint16Array([0]),
          twigIds: new Uint32Array([1]),
          crateIds: new Uint32Array([1]),
          authority: new Float32Array(1),
          flags: new Uint8Array(1),
        },
      });

      useUi.setState({
        focusedPaperId: 'p1',
        focusContext: {
          citationChecks: [],
          grounded: [
            {
              chunk_id: 'c1',
              paper_id: 'p1',
              title: 'Attention Paper',
              section_title: 'Abstract',
              section_type: 'abstract',
              citation_tag: '[p1]',
              text: 'Attention is all you need',
              similarity_score: 0.95,
              authority_score: 0.8,
              final_score: 0.92,
            },
          ],
        },
      });

      const { container } = render(<ResultCard />);
      expect(screen.getByTestId('result-card')).toBeDefined();
      expect(screen.getByText('Attention Paper')).toBeDefined();

      const openDetailBtn = container.querySelector('.btn-primary') as HTMLButtonElement;
      expect(openDetailBtn).not.toBeNull();
      fireEvent.click(openDetailBtn);
      expect(useUi.getState().panelPaperId).toBe('p1');

      const closeBtn = container.querySelector('button[aria-label="Đóng thẻ"]') as HTMLButtonElement;
      expect(closeBtn).not.toBeNull();
      fireEvent.click(closeBtn);
      expect(useUi.getState().focusedPaperId).toBeNull();
    });
  });

  describe('TopKBadges', () => {
    it('returns null when visualPhase is not in found/generating/done', () => {
      useRag.setState({ visualPhase: 'embedding' });
      const { container } = render(<TopKBadges />);
      expect(container.firstChild).toBeNull();
    });

    it('renders top-k badges when found and handles click', () => {
      useWorld.setState({
        vectorIds: ['p1', 'p2'],
        vectorIndexByPaperId: new Map([['p1', 0], ['p2', 1]]),
        vectors: {
          count: 2,
          positions: new Float32Array([0, 0, 0, 10, 10, 10]),
          years: new Uint16Array([2023, 2024]),
          categories: new Uint16Array([0, 0]),
          twigIds: new Uint32Array([1, 2]),
          crateIds: new Uint32Array([1, 2]),
          authority: new Float32Array(2),
          flags: new Uint8Array(2),
        },
      });

      useRag.setState({ visualPhase: 'done' });
      useFx.setState({
        topK: [
          { paper_id: 'p1', index: 0, rank: 1, final_score: 0.9, chunkCount: 1 },
          { paper_id: 'p2', index: 1, rank: 2, final_score: 0.85, chunkCount: 2 },
        ],
      });
      useUi.setState({ focusedPaperId: 'p1' }); // p1 is focused, so p2 badge should show

      const { container } = render(<TopKBadges />);
      const badge = container.querySelector('button[aria-label="Kết quả hạng 2: p2"]') as HTMLButtonElement;
      expect(badge).not.toBeNull();

      fireEvent.click(badge);
      expect(useUi.getState().focusedPaperId).toBe('p2');
    });
  });
});
