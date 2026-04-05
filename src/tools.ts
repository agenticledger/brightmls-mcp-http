import { z } from 'zod';
import { BrightMLSClient } from './api-client.js';

/**
 * Bright MLS MCP Tool Definitions
 *
 * 12 tools covering: Property Search, Comps, History, Active Listings,
 * Media, Agents, Offices, Schools, Market Stats, Open Houses
 */

interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (client: BrightMLSClient, args: any) => Promise<any>;
}

// Reusable pagination params
const paginationParams = {
  top: z.number().optional().describe('Max results to return (default 25, max 200)'),
  skip: z.number().optional().describe('Number of results to skip for pagination'),
};

export const tools: ToolDef[] = [
  // ── 1. search_properties ──────────────────────────────────────
  {
    name: 'search_properties',
    description: 'Search Bright MLS properties with filters for status, location, price, beds, baths, sqft, dates. Returns listing details with coordinates.',
    inputSchema: z.object({
      city: z.string().optional().describe('City name (e.g. "Germantown", "Bethesda")'),
      postalCode: z.string().optional().describe('5-digit ZIP code'),
      standardStatus: z.string().optional().describe('Listing status: Active, ActiveUnderContract, Closed, ComingSoon, Pending, Withdrawn'),
      propertyType: z.string().optional().describe('Property type: Residential, Land, Commercial Sale, etc.'),
      bedroomsMin: z.number().optional().describe('Minimum number of bedrooms'),
      bedroomsMax: z.number().optional().describe('Maximum number of bedrooms'),
      bathroomsMin: z.number().optional().describe('Minimum number of bathrooms'),
      bathroomsMax: z.number().optional().describe('Maximum number of bathrooms'),
      livingAreaMin: z.number().optional().describe('Minimum living area in square feet'),
      livingAreaMax: z.number().optional().describe('Maximum living area in square feet'),
      listPriceMin: z.number().optional().describe('Minimum list price in dollars'),
      listPriceMax: z.number().optional().describe('Maximum list price in dollars'),
      listDateFrom: z.string().optional().describe('List date start (YYYY-MM-DD)'),
      listDateTo: z.string().optional().describe('List date end (YYYY-MM-DD)'),
      orderby: z.string().optional().describe('OData $orderby (e.g. "ListPrice desc", "DaysOnMarket asc")'),
      ...paginationParams,
    }),
    handler: async (client: BrightMLSClient, args: any) =>
      client.searchProperties(args),
  },

  // ── 2. get_property ───────────────────────────────────────────
  {
    name: 'get_property',
    description: 'Get a single property by ListingKey with all available fields including full remarks, features, and tax info.',
    inputSchema: z.object({
      listingKey: z.string().describe('The unique ListingKey identifier for the property'),
    }),
    handler: async (client: BrightMLSClient, args: { listingKey: string }) =>
      client.getProperty(args.listingKey),
  },

  // ── 3. search_sold_comps ──────────────────────────────────────
  {
    name: 'search_sold_comps',
    description: 'Search recently sold comparable properties for CMA analysis. Returns ClosePrice, DaysOnMarket, CloseDate, ListPrice for list-to-sale ratio calculations.',
    inputSchema: z.object({
      city: z.string().optional().describe('City to search (e.g. "Silver Spring")'),
      postalCode: z.string().optional().describe('ZIP code to search'),
      propertyType: z.string().optional().describe('Property type (e.g. "Residential")'),
      closeDateMonths: z.number().optional().describe('Look back period in months (default 6)'),
      bedroomsMin: z.number().optional().describe('Minimum bedrooms for comp range'),
      bedroomsMax: z.number().optional().describe('Maximum bedrooms for comp range'),
      bathroomsMin: z.number().optional().describe('Minimum bathrooms for comp range'),
      bathroomsMax: z.number().optional().describe('Maximum bathrooms for comp range'),
      livingAreaMin: z.number().optional().describe('Minimum sqft for comp range'),
      livingAreaMax: z.number().optional().describe('Maximum sqft for comp range'),
      closePriceMin: z.number().optional().describe('Minimum close price'),
      closePriceMax: z.number().optional().describe('Maximum close price'),
      orderby: z.string().optional().describe('OData $orderby (default: "CloseDate desc")'),
      ...paginationParams,
    }),
    handler: async (client: BrightMLSClient, args: any) =>
      client.searchSoldComps(args),
  },

  // ── 4. get_property_history ───────────────────────────────────
  {
    name: 'get_property_history',
    description: 'Get the transaction and modification history for a property. Shows price changes, status changes, and listing events.',
    inputSchema: z.object({
      listingKey: z.string().describe('The ListingKey of the property to get history for'),
    }),
    handler: async (client: BrightMLSClient, args: { listingKey: string }) =>
      client.getPropertyHistory(args.listingKey),
  },

  // ── 5. search_active_listings ─────────────────────────────────
  {
    name: 'search_active_listings',
    description: 'Search currently active and active-under-contract listings. Shows current market competition and inventory.',
    inputSchema: z.object({
      city: z.string().optional().describe('City to search'),
      postalCode: z.string().optional().describe('ZIP code to search'),
      propertyType: z.string().optional().describe('Property type filter'),
      bedroomsMin: z.number().optional().describe('Minimum bedrooms'),
      bathroomsMin: z.number().optional().describe('Minimum bathrooms'),
      listPriceMin: z.number().optional().describe('Minimum list price'),
      listPriceMax: z.number().optional().describe('Maximum list price'),
      livingAreaMin: z.number().optional().describe('Minimum sqft'),
      orderby: z.string().optional().describe('OData $orderby (default: "ListingContractDate desc")'),
      ...paginationParams,
    }),
    handler: async (client: BrightMLSClient, args: any) =>
      client.searchActiveListings(args),
  },

  // ── 6. get_property_media ─────────────────────────────────────
  {
    name: 'get_property_media',
    description: 'Get photos and media for a property listing. Returns URLs, media type, dimensions, and preferred photo flag.',
    inputSchema: z.object({
      listingKey: z.string().describe('The ListingKey of the property'),
      top: z.number().optional().describe('Max media items to return (default 50)'),
    }),
    handler: async (client: BrightMLSClient, args: { listingKey: string; top?: number }) =>
      client.getPropertyMedia(args.listingKey, args.top),
  },

  // ── 7. search_agents ──────────────────────────────────────────
  {
    name: 'search_agents',
    description: 'Search Bright MLS member agents by name, MLS ID, office, or location. Returns contact info, licensing, and designations.',
    inputSchema: z.object({
      memberName: z.string().optional().describe('Agent name to search (partial match)'),
      memberMlsId: z.string().optional().describe('Agent MLS ID (exact match)'),
      officeName: z.string().optional().describe('Office name to search (partial match)'),
      city: z.string().optional().describe('Agent city'),
      stateOrProvince: z.string().optional().describe('Agent state (e.g. "MD", "VA", "DC")'),
      ...paginationParams,
    }),
    handler: async (client: BrightMLSClient, args: any) =>
      client.searchAgents(args),
  },

  // ── 8. get_agent ──────────────────────────────────────────────
  {
    name: 'get_agent',
    description: 'Get a single agent/member by MemberKey with full details including all contact info, licensing, and office.',
    inputSchema: z.object({
      memberKey: z.string().describe('The unique MemberKey identifier for the agent'),
    }),
    handler: async (client: BrightMLSClient, args: { memberKey: string }) =>
      client.getAgent(args.memberKey),
  },

  // ── 9. search_offices ─────────────────────────────────────────
  {
    name: 'search_offices',
    description: 'Search real estate offices by name, MLS ID, city, or state. Returns office contact info and broker details.',
    inputSchema: z.object({
      officeName: z.string().optional().describe('Office name to search (partial match)'),
      officeMlsId: z.string().optional().describe('Office MLS ID (exact match)'),
      city: z.string().optional().describe('Office city'),
      stateOrProvince: z.string().optional().describe('Office state (e.g. "MD", "VA")'),
      ...paginationParams,
    }),
    handler: async (client: BrightMLSClient, args: any) =>
      client.searchOffices(args),
  },

  // ── 10. get_school_info ───────────────────────────────────────
  {
    name: 'get_school_info',
    description: 'Look up schools and school districts for an area. Search by city, ZIP code, school name, or district name.',
    inputSchema: z.object({
      city: z.string().optional().describe('City to search for schools'),
      postalCode: z.string().optional().describe('ZIP code to search for schools'),
      schoolDistrict: z.string().optional().describe('School district name (partial match)'),
      schoolName: z.string().optional().describe('School name (partial match)'),
      top: z.number().optional().describe('Max results per resource (default 25)'),
    }),
    handler: async (client: BrightMLSClient, args: any) =>
      client.getSchoolInfo(args),
  },

  // ── 11. get_market_stats ──────────────────────────────────────
  {
    name: 'get_market_stats',
    description: 'Compute market statistics for an area: avg/median sale price, avg price/sqft, avg days on market, list-to-sale ratio. Uses client-side aggregation.',
    inputSchema: z.object({
      city: z.string().optional().describe('City to analyze'),
      postalCode: z.string().optional().describe('ZIP code to analyze'),
      propertyType: z.string().optional().describe('Property type (e.g. "Residential")'),
      months: z.number().optional().describe('Look back period in months (default 6)'),
      standardStatus: z.string().optional().describe('Status to analyze (default "Closed")'),
    }),
    handler: async (client: BrightMLSClient, args: any) =>
      client.getMarketStats(args),
  },

  // ── 12. search_open_houses ────────────────────────────────────
  {
    name: 'search_open_houses',
    description: 'Search upcoming open houses by area and date range. Returns event dates, times, type (in-person/virtual), and virtual tour URLs.',
    inputSchema: z.object({
      city: z.string().optional().describe('City to search for open houses'),
      postalCode: z.string().optional().describe('ZIP code to search'),
      dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
      ...paginationParams,
    }),
    handler: async (client: BrightMLSClient, args: any) =>
      client.searchOpenHouses(args),
  },
];
