export { findConnectedComponents } from "./find-connected-components.js";
export type { Connectivity } from "./find-connected-components.js";
export {
  findExteriorMask,
  findClosedContours,
  findEnclosedRegions,
} from "./find-enclosed-regions.js";
export {
  validateEnclosure,
  findValidCaptures,
  findHouses,
} from "./validate-enclosure.js";
export { resolveCapture, isIndexInHouse } from "./resolve-capture.js";
export { recalculateScore } from "./recalculate-score.js";
export {
  ORTHOGONAL_DELTAS,
  KING_DELTAS,
  neighborIndices4,
  neighborIndices8,
  isActiveWall,
} from "./neighbors.js";
