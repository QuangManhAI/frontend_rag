import type { Vec3 } from './world';

/** Crawl progress, sent every 2 s by `GET /api/crawl/stream`. */
export interface CrawlStatus {
  running: boolean;
  target: number;
  fetched: number;
  embedded: number;
  rate_per_min: number;
  started_at: string;
}

/** A group of papers of one crate that just finished a pipeline step. */
export interface CrawlBatch {
  stage: 'fetched' | 'embedded';
  crate_id: number;
  category_index: number;
  count: number;
}

/** A freshly embedded paper with its provisional place in the canopy. */
export interface CrawlVectorItem {
  paper_id: string;
  position: Vec3;
  twig_id: number;
  crate_id: number;
  category_index: number;
  year: number;
  authority: number;
}

/** One SSE event of the crawl stream, discriminated by `type`. */
export type CrawlStreamEvent =
  | ({ type: 'crawl_status' } & CrawlStatus)
  | ({ type: 'crawl_batch' } & CrawlBatch)
  | { type: 'crawl_vectors'; items: CrawlVectorItem[] }
  | { type: 'crawl_error'; message: string; recoverable: boolean }
  | { type: 'crawl_done'; fetched: number; embedded: number };

/** Connection state of the crawl stream as shown in the HUD. */
export type CrawlConnection = 'connected' | 'reconnecting' | 'offline';
