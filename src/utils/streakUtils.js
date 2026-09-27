// Client-side re-export of the canonical streak logic. The server
// (functions/_shared/streakLogic.js) is the source of truth for anything
// that WRITES stats; this file is for read-only display math only (e.g.
// "days to next reward", risk colour on a card) so the UI doesn't need a
// round trip just to render numbers that are already sitting in the doc.
export * from '../../functions/_shared/streakLogic.js';
