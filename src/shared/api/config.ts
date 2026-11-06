export const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api/v1').replace(/\/$/, '');
/** World 3D and the crawl stream come from the UTH pipeline, not from RAG_TS. */
export const PIPELINE_BASE = (import.meta.env.VITE_PIPELINE_BASE ?? '/pipeline').replace(/\/$/, '');
/** Chat, papers and health: mock unless VITE_USE_MOCK=false (then RAG_TS at API_BASE). */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
/**
 * World 3D + crawl: mock unless VITE_MOCK_WORLD=false (then the pipeline at PIPELINE_BASE).
 * Mock by default because the pipeline does not serve `/world/*` yet (see ASSUMPTIONS.md).
 */
export const MOCK_WORLD = import.meta.env.VITE_MOCK_WORLD !== 'false';
