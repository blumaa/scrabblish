import gsap from 'gsap';
import { CELL_SIZE } from './svg-coords';
import type { Board } from '../types/game';

export interface AnimTile {
  row: number;
  col: number;
  isNew: boolean; // true = hidden by React, false = needs overlay
}

const FALL_DISTANCE = 70;
const FALL_DURATION = 0.45;
const STAGGER_DELAY = 0.1;

/**
 * Animate tiles "falling" onto the board with a staggered drop + bounce.
 * Tiles are animated in the order provided.
 *
 * - `isNew` tiles are hidden via visibility="hidden" by React; GSAP takes ownership.
 * - non-`isNew` tiles (intersections) get temporary overlay SVG elements.
 */
export function animateTilesFalling(
  svg: SVGSVGElement,
  tiles: AnimTile[],
  board: Board,
): { cleanup: () => void; done: Promise<void> } {
  if (tiles.length === 0) return { cleanup: () => {}, done: Promise.resolve() };

  const committedGroup = svg.querySelector('#committed-tiles');
  if (!committedGroup) return { cleanup: () => {}, done: Promise.resolve() };

  const animated: { el: Element; finalX: number; finalY: number; isOverlay: boolean }[] = [];
  const overlayElements: SVGGElement[] = [];
  const ns = 'http://www.w3.org/2000/svg';

  for (const tile of tiles) {
    const finalX = tile.col * CELL_SIZE;
    const finalY = tile.row * CELL_SIZE;

    if (tile.isNew) {
      // Find the real committed tile element (hidden by React)
      const tileEl = committedGroup.querySelector(`g.placed-tile[data-pos="${tile.row}-${tile.col}"]`);
      if (tileEl) {
        animated.push({ el: tileEl, finalX, finalY, isOverlay: false });
      }
    } else {
      // Create a temporary overlay for intersection tiles
      const tileData = board[tile.row]?.[tile.col];
      if (!tileData) continue;

      const g = document.createElementNS(ns, 'g');
      g.setAttribute('class', 'tile-fall-overlay');
      g.setAttribute('transform', `translate(${finalX}, ${finalY})`);

      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('width', String(CELL_SIZE - 4));
      rect.setAttribute('height', String(CELL_SIZE - 4));
      rect.setAttribute('x', '2');
      rect.setAttribute('y', '2');
      rect.setAttribute('rx', '4');
      rect.setAttribute('class', 'tile-bg');
      g.appendChild(rect);

      const text = document.createElementNS(ns, 'text');
      text.setAttribute('x', String(CELL_SIZE / 2));
      text.setAttribute('y', String(CELL_SIZE / 2 + 2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('class', 'tile-letter');
      text.textContent = tileData.letter;
      g.appendChild(text);

      if (!tileData.isBlank && tileData.points > 0) {
        const pts = document.createElementNS(ns, 'text');
        pts.setAttribute('x', String(CELL_SIZE - 8));
        pts.setAttribute('y', String(CELL_SIZE - 8));
        pts.setAttribute('text-anchor', 'end');
        pts.setAttribute('class', 'tile-points');
        pts.textContent = String(tileData.points);
        g.appendChild(pts);
      }

      committedGroup.appendChild(g);
      overlayElements.push(g);
      animated.push({ el: g, finalX, finalY, isOverlay: true });
    }
  }

  if (animated.length === 0) return { cleanup: () => {}, done: Promise.resolve() };

  // Create green word border that tiles fall into
  const minCol = Math.min(...tiles.map((t) => t.col));
  const maxCol = Math.max(...tiles.map((t) => t.col));
  const minRow = Math.min(...tiles.map((t) => t.row));
  const maxRow = Math.max(...tiles.map((t) => t.row));

  const borderRect = document.createElementNS(ns, 'rect');
  borderRect.setAttribute('x', String(minCol * CELL_SIZE - 1));
  borderRect.setAttribute('y', String(minRow * CELL_SIZE - 1));
  borderRect.setAttribute('width', String((maxCol - minCol + 1) * CELL_SIZE + 2));
  borderRect.setAttribute('height', String((maxRow - minRow + 1) * CELL_SIZE + 2));
  borderRect.setAttribute('rx', '4');
  borderRect.setAttribute('fill', 'none');
  borderRect.setAttribute('stroke', 'var(--color-valid)');
  borderRect.setAttribute('stroke-width', '2.5');
  borderRect.setAttribute('class', 'tile-fall-border');
  committedGroup.appendChild(borderRect);
  gsap.fromTo(borderRect, { attr: { opacity: 0 } }, { attr: { opacity: 0.9 }, duration: 2, ease: 'power2.out' });

  // Set initial state for all tiles
  for (const { el, finalX, finalY, isOverlay } of animated) {
    const attrs: Record<string, string | number> = {
      transform: `translate(${finalX}, ${finalY - FALL_DISTANCE})`,
      opacity: 0,
    };
    if (!isOverlay) {
      attrs.visibility = 'visible';
    }
    gsap.set(el, { attr: attrs });
  }

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    gsap.killTweensOf(borderRect);
    borderRect.remove();
    for (const { el, finalX, finalY, isOverlay } of animated) {
      gsap.killTweensOf(el);
      if (isOverlay) {
        el.remove();
      } else {
        gsap.set(el, { attr: { transform: `translate(${finalX}, ${finalY})`, opacity: 1 } });
      }
    }
  };

  const done = new Promise<void>((resolve) => {
    animated.forEach(({ el, finalX, finalY }, i) => {
      gsap.to(el, {
        attr: { transform: `translate(${finalX}, ${finalY})`, opacity: 1 },
        duration: FALL_DURATION,
        delay: i * STAGGER_DELAY,
        ease: 'bounce.out',
        onComplete: i === animated.length - 1 ? () => {
          // Remove overlays immediately
          for (const overlay of overlayElements) {
            overlay.remove();
          }
          // Fade out the green border after 2 seconds
          gsap.to(borderRect, {
            attr: { opacity: 0 },
            delay: 2,
            duration: 0.5,
            onComplete: () => {
              borderRect.remove();
              resolve();
            },
          });
        } : undefined,
      });
    });
  });

  return { cleanup, done };
}
