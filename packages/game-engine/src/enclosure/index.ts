export { findConnectedComponents } from "./find-connected-components";
export type { Connectivity } from "./find-connected-components";
export {
  findExteriorMask,
  findClosedContours,
  findEnclosedRegions,
} from "./find-enclosed-regions";
export {
  validateEnclosure,
  findValidCaptures,
  findHouses,
} from "./validate-enclosure";
export { resolveCapture, isIndexInHouse } from "./resolve-capture";
export { recalculateScore } from "./recalculate-score";
export {
  findLandingCaptures,
  resolveLandingCaptures,
  findGroundedIndices,
  findSurroundableIndices,
} from "./landing";
export {
  buildCapturedTerritoryContours,
  buildHalfCellRingsForIndices,
} from "./captured-territory-contours";
export type {
  CapturedTerritoryContour,
  FormalPoint,
} from "./captured-territory-contours";
export {
  ORTHOGONAL_DELTAS,
  KING_DELTAS,
  neighborIndices4,
  neighborIndices8,
  isActiveWall,
} from "./neighbors";
