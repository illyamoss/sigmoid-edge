import type {
  Ga4BigQueryEvent,
  InternalGa4Event,
} from "@/core/domain/ingestion.schema";

const ENGAGEMENT_TIME_KEY = "engagement_time_msec";

function extractEngagementTimeMsec(
  eventParams: Ga4BigQueryEvent["event_params"],
): number {
  if (!eventParams || eventParams.length === 0) return 0;
  const entry = eventParams.find(
    (param) => param.key === ENGAGEMENT_TIME_KEY,
  );
  if (!entry) return 0;
  const rawValue = entry.value.int_value;
  if (rawValue === undefined || rawValue === null) return 0;
  return Number(rawValue);
}

export function transformBigQueryEvent(
  raw: Ga4BigQueryEvent,
): InternalGa4Event {
  return {
    user_pseudo_id: raw.user_pseudo_id,
    event_name: raw.event_name,
    event_timestamp: new Date(raw.event_timestamp / 1000),
    engagement_time_msec: extractEngagementTimeMsec(raw.event_params),
  };
}

export function transformBigQueryEvents(
  events: Ga4BigQueryEvent[],
): InternalGa4Event[] {
  return events.map(transformBigQueryEvent);
}