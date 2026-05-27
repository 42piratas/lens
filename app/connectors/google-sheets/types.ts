export type CellValue = string | number | null;

export type RangeData = {
  values: CellValue[][];
  majorDimension: "ROWS";
};

export { IntegrationError } from "../_shared/integration-error";
export type { IntegrationErrorKind } from "../_shared/integration-error";
