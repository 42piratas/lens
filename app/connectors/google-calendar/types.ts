export type CalendarSummary = {
  id: string;
  name: string;
  backgroundColor?: string;
  primary?: boolean;
};

export type NormalizedEvent = {
  id: string;
  calendarId: string;
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  color?: string;
};

export { IntegrationError } from "../_shared/integration-error";
export type { IntegrationErrorKind } from "../_shared/integration-error";
