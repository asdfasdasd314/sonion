export { INTERPRETATION_ERROR_PARAMETERS } from "./config";
export type { InterpretationErrorParameters } from "./config";
export { boundDiagnostics, truncateText } from "./bounds";
export {
  buildInterpretationErrorInsert,
  mapInterpretationFailure,
} from "./map-failure";
export type { MappedInterpretationFailure } from "./map-failure";
export {
  dismissInterpretationError,
  insertInterpretationError,
  listInterpretationErrors,
  SupabaseInterpretationError,
} from "./supabase";
export {
  InterpretationErrorInsertSchema,
  InterpretationErrorListSchema,
  InterpretationErrorRecordSchema,
  parseInterpretationErrorList,
  parseInterpretationErrorRecord,
} from "./types";
export type {
  InterpretationErrorInsert,
  InterpretationErrorRecord,
} from "./types";
