import type { Ga4BigQueryEvent, StripeCustomer } from "@/core/domain/ingestion.schema";

const PAGEVIEW_EVENT_NAME = "page_view";
const SESSION_START_EVENT_NAME = "session_start";
const SCROLL_EVENT_NAME = "scroll";
const CLICK_EVENT_NAME = "click";
const CASUAL_READER_COUNT = 400;
const CONVERTING_READER_COUNT = 100;
const PSEUDO_ID_PREFIX = "mock_reader_";

function generatePseudoId(index: number, isConverter: boolean): string {
  const bucket = isConverter ? "c" : "b";
  return `${PSEUDO_ID_PREFIX}${bucket}_${index.toString().padStart(4, "0")}`;
}

function generateEngagementMsec(isConverter: boolean, eventIndex: number): number {
  if (isConverter) {
    return Math.floor(Math.random() * 40000) + 15000 + eventIndex * 200;
  }
  return Math.floor(Math.random() * 8000) + 500;
}

function generateEventName(eventIndex: number): string {
  const cycle = eventIndex % 4;
  if (cycle === 0) return PAGEVIEW_EVENT_NAME;
  if (cycle === 1) return SESSION_START_EVENT_NAME;
  if (cycle === 2) return SCROLL_EVENT_NAME;
  return CLICK_EVENT_NAME;
}

function buildEventParams(
  engagementMsec: number,
): Ga4BigQueryEvent["event_params"] {
  return [
    { key: "engagement_time_msec", value: { int_value: engagementMsec } },
    { key: "page_title", value: { string_value: "Mock Article" } },
    { key: "session_engaged", value: { int_value: engagementMsec > 0 ? 1 : 0 } },
  ];
}

function generateCasualEvents(readerIndex: number): Ga4BigQueryEvent[] {
  const events: Ga4BigQueryEvent[] = [];
  const eventCount = Math.floor(Math.random() * 4) + 1;
  const baseTimestampMs = Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000;
  const engagementMsec = generateEngagementMsec(false, 0);

  for (let i = 0; i < eventCount; i++) {
    events.push({
      user_pseudo_id: generatePseudoId(readerIndex, false),
      event_name: generateEventName(i),
      event_timestamp: (baseTimestampMs + i * 60000) * 1000,
      event_date: new Date(baseTimestampMs + i * 60000).toISOString().slice(0, 10).replace(/-/g, ""),
      event_params: buildEventParams(engagementMsec),
      user_first_touch_timestamp: (baseTimestampMs - 86400000) * 1000,
    });
  }
  return events;
}

function generateConvertingEvents(readerIndex: number): Ga4BigQueryEvent[] {
  const events: Ga4BigQueryEvent[] = [];
  const eventCount = Math.floor(Math.random() * 12) + 8;
  const baseTimestampMs = Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000;

  for (let i = 0; i < eventCount; i++) {
    const engagementMsec = generateEngagementMsec(true, i);
    events.push({
      user_pseudo_id: generatePseudoId(readerIndex, true),
      event_name: generateEventName(i),
      event_timestamp: (baseTimestampMs + i * 90000) * 1000,
      event_date: new Date(baseTimestampMs + i * 90000).toISOString().slice(0, 10).replace(/-/g, ""),
      event_params: buildEventParams(engagementMsec),
      user_first_touch_timestamp: (baseTimestampMs - 86400000) * 1000,
    });
  }
  return events;
}

function generateStripeCustomers(): StripeCustomer[] {
  const customers: StripeCustomer[] = [];

  for (let i = 0; i < CONVERTING_READER_COUNT; i++) {
    customers.push({
      id: `cus_mock_${i.toString().padStart(4, "0")}`,
      created: Math.floor((Date.now() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000) / 1000),
      metadata: {
        user_pseudo_id: generatePseudoId(i, true),
      },
    });
  }

  return customers;
}

export type MockSeedData = {
  ga4Events: Ga4BigQueryEvent[];
  stripeCustomers: StripeCustomer[];
};

export function generateMockSeedData(): MockSeedData {
  const ga4Events: Ga4BigQueryEvent[] = [];

  for (let i = 0; i < CASUAL_READER_COUNT; i++) {
    ga4Events.push(...generateCasualEvents(i));
  }

  for (let i = 0; i < CONVERTING_READER_COUNT; i++) {
    ga4Events.push(...generateConvertingEvents(i));
  }

  const stripeCustomers = generateStripeCustomers();

  return { ga4Events, stripeCustomers };
}