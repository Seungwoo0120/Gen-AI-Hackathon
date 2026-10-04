// Short names for contract types. Generated from packages/shared/openapi.yaml;
// run `npm run gen:api` after the spec changes.
import type { components } from "./schema";

type Schemas = components["schemas"];

export type AeWaitTimesResponse = Schemas["AeWaitTimesResponse"];
export type AeHospitalWaitTime = Schemas["AeHospitalWaitTime"];
export type CareLevel = Schemas["CareLevel"];
export type RoutingRequest = Schemas["RoutingRequest"];
export type RoutingResult = Schemas["RoutingResult"];
export type EmergencyCheck = Schemas["EmergencyCheck"];
export type Medication = Schemas["Medication"];
export type MedicationInput = Schemas["MedicationInput"];
export type InteractionCheckResult = Schemas["InteractionCheckResult"];
export type InteractionWarning = Schemas["InteractionWarning"];
export type SymptomEntry = Schemas["SymptomEntry"];
export type SymptomInput = Schemas["SymptomInput"];
export type ExtractResult = Schemas["ExtractResult"];
export type DoctorSummary = Schemas["DoctorSummary"];
export type Language = Schemas["Language"];
export type LocalizedText = Schemas["LocalizedText"];
export type ChatQuestion = Schemas["ChatQuestion"];
export type ChatTurn = Schemas["ChatTurn"];
export type ChatResult = Schemas["ChatResult"];
