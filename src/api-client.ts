/**
 * Bright MLS RESO Web API Client
 *
 * Base URL (Live): https://bright-reso.brightmls.com/RESO/OData/bright
 * Base URL (Test): https://bright-reso.tst.brightmls.com/RESO/OData/bright
 * Auth: Bearer token (Authorization: Bearer {api_key})
 * Protocol: OData v4.01
 * Responses: JSON (application/json)
 * Pagination: $top / $skip with $count
 */

const DEFAULT_BASE_URL = 'https://bright-reso.brightmls.com/RESO/OData/bright';

export interface ODataResponse<T = any> {
  '@odata.context'?: string;
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
  value: T[];
}

export interface ODataQueryParams {
  $filter?: string;
  $select?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
  $expand?: string;
}

export class BrightMLSClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || DEFAULT_BASE_URL;
  }

  // ── OData filter builder helpers ──────────────────────────────

  /**
   * Build an OData $filter string from structured params.
   * Supports eq, gt, ge, lt, le, contains, and date comparisons.
   */
  static buildFilter(conditions: Array<string | undefined | null>): string | undefined {
    const valid = conditions.filter(Boolean) as string[];
    return valid.length > 0 ? valid.join(' and ') : undefined;
  }

  static eq(field: string, value: string | number | undefined): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') return `${field} eq '${value}'`;
    return `${field} eq ${value}`;
  }

  static gt(field: string, value: number | undefined): string | undefined {
    if (value === undefined || value === null) return undefined;
    return `${field} gt ${value}`;
  }

  static ge(field: string, value: number | string | undefined): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') return `${field} ge ${value}`;
    return `${field} ge ${value}`;
  }

  static lt(field: string, value: number | undefined): string | undefined {
    if (value === undefined || value === null) return undefined;
    return `${field} lt ${value}`;
  }

  static le(field: string, value: number | string | undefined): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') return `${field} le ${value}`;
    return `${field} le ${value}`;
  }

  static contains(field: string, value: string | undefined): string | undefined {
    if (!value) return undefined;
    return `contains(${field},'${value}')`;
  }

  static dateGe(field: string, dateStr: string | undefined): string | undefined {
    if (!dateStr) return undefined;
    return `${field} ge ${dateStr}`;
  }

  static dateLe(field: string, dateStr: string | undefined): string | undefined {
    if (!dateStr) return undefined;
    return `${field} le ${dateStr}`;
  }

  // ── Generic request method ────────────────────────────────────

  private async request<T>(path: string, params?: ODataQueryParams): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bright MLS API Error ${response.status}: ${text}`);
    }

    return response.json();
  }

  // ── Tool 1: search_properties ─────────────────────────────────

  async searchProperties(params: {
    city?: string;
    postalCode?: string;
    standardStatus?: string;
    propertyType?: string;
    bedroomsMin?: number;
    bedroomsMax?: number;
    bathroomsMin?: number;
    bathroomsMax?: number;
    livingAreaMin?: number;
    livingAreaMax?: number;
    listPriceMin?: number;
    listPriceMax?: number;
    listDateFrom?: string;
    listDateTo?: string;
    top?: number;
    skip?: number;
    orderby?: string;
  }): Promise<ODataResponse> {
    const filter = BrightMLSClient.buildFilter([
      BrightMLSClient.eq('City', params.city),
      BrightMLSClient.eq('PostalCode', params.postalCode),
      BrightMLSClient.eq('StandardStatus', params.standardStatus),
      BrightMLSClient.eq('PropertyType', params.propertyType),
      BrightMLSClient.ge('BedroomsTotal', params.bedroomsMin),
      BrightMLSClient.le('BedroomsTotal', params.bedroomsMax),
      BrightMLSClient.ge('BathroomsTotalInteger', params.bathroomsMin),
      BrightMLSClient.le('BathroomsTotalInteger', params.bathroomsMax),
      BrightMLSClient.ge('LivingArea', params.livingAreaMin),
      BrightMLSClient.le('LivingArea', params.livingAreaMax),
      BrightMLSClient.ge('ListPrice', params.listPriceMin),
      BrightMLSClient.le('ListPrice', params.listPriceMax),
      BrightMLSClient.dateGe('ListingContractDate', params.listDateFrom),
      BrightMLSClient.dateLe('ListingContractDate', params.listDateTo),
    ]);

    return this.request<ODataResponse>('/BrightProperties', {
      $filter: filter,
      $select: 'ListingKey,ListingId,ListPrice,ClosePrice,DaysOnMarket,BedroomsTotal,BathroomsTotalInteger,LivingArea,YearBuilt,GarageSpaces,Latitude,Longitude,StandardStatus,StreetNumber,StreetName,StreetSuffix,City,StateOrProvince,PostalCode,PropertyType,PropertySubType,ListingContractDate,CloseDate,OriginalListPrice,PublicRemarks',
      $orderby: params.orderby || 'ListPrice desc',
      $top: params.top || 25,
      $skip: params.skip,
      $count: true,
    });
  }

  // ── Tool 2: get_property ──────────────────────────────────────

  async getProperty(listingKey: string): Promise<any> {
    return this.request<any>(`/BrightProperties('${listingKey}')`);
  }

  // ── Tool 3: search_sold_comps ─────────────────────────────────

  async searchSoldComps(params: {
    city?: string;
    postalCode?: string;
    propertyType?: string;
    closeDateMonths?: number;
    bedroomsMin?: number;
    bedroomsMax?: number;
    bathroomsMin?: number;
    bathroomsMax?: number;
    livingAreaMin?: number;
    livingAreaMax?: number;
    closePriceMin?: number;
    closePriceMax?: number;
    top?: number;
    skip?: number;
    orderby?: string;
  }): Promise<ODataResponse> {
    // Calculate close date threshold
    const months = params.closeDateMonths || 6;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const filter = BrightMLSClient.buildFilter([
      "StandardStatus eq 'Closed'",
      BrightMLSClient.eq('City', params.city),
      BrightMLSClient.eq('PostalCode', params.postalCode),
      BrightMLSClient.eq('PropertyType', params.propertyType),
      BrightMLSClient.dateGe('CloseDate', cutoffStr),
      BrightMLSClient.ge('BedroomsTotal', params.bedroomsMin),
      BrightMLSClient.le('BedroomsTotal', params.bedroomsMax),
      BrightMLSClient.ge('BathroomsTotalInteger', params.bathroomsMin),
      BrightMLSClient.le('BathroomsTotalInteger', params.bathroomsMax),
      BrightMLSClient.ge('LivingArea', params.livingAreaMin),
      BrightMLSClient.le('LivingArea', params.livingAreaMax),
      BrightMLSClient.ge('ClosePrice', params.closePriceMin),
      BrightMLSClient.le('ClosePrice', params.closePriceMax),
    ]);

    return this.request<ODataResponse>('/BrightProperties', {
      $filter: filter,
      $select: 'ListingKey,ListingId,ListPrice,ClosePrice,OriginalListPrice,DaysOnMarket,CloseDate,ListingContractDate,BedroomsTotal,BathroomsTotalInteger,LivingArea,YearBuilt,GarageSpaces,Latitude,Longitude,StreetNumber,StreetName,StreetSuffix,City,StateOrProvince,PostalCode,PropertyType,PropertySubType',
      $orderby: params.orderby || 'CloseDate desc',
      $top: params.top || 25,
      $skip: params.skip,
      $count: true,
    });
  }

  // ── Tool 4: get_property_history ──────────────────────────────

  async getPropertyHistory(listingKey: string): Promise<ODataResponse> {
    return this.request<ODataResponse>('/BrightPropertyHistory', {
      $filter: `ListingKey eq '${listingKey}'`,
      $orderby: 'ModificationTimestamp desc',
      $count: true,
    });
  }

  // ── Tool 5: search_active_listings ────────────────────────────

  async searchActiveListings(params: {
    city?: string;
    postalCode?: string;
    propertyType?: string;
    bedroomsMin?: number;
    bathroomsMin?: number;
    listPriceMin?: number;
    listPriceMax?: number;
    livingAreaMin?: number;
    top?: number;
    skip?: number;
    orderby?: string;
  }): Promise<ODataResponse> {
    const filter = BrightMLSClient.buildFilter([
      "(StandardStatus eq 'Active' or StandardStatus eq 'ActiveUnderContract')",
      BrightMLSClient.eq('City', params.city),
      BrightMLSClient.eq('PostalCode', params.postalCode),
      BrightMLSClient.eq('PropertyType', params.propertyType),
      BrightMLSClient.ge('BedroomsTotal', params.bedroomsMin),
      BrightMLSClient.ge('BathroomsTotalInteger', params.bathroomsMin),
      BrightMLSClient.ge('ListPrice', params.listPriceMin),
      BrightMLSClient.le('ListPrice', params.listPriceMax),
      BrightMLSClient.ge('LivingArea', params.livingAreaMin),
    ]);

    return this.request<ODataResponse>('/BrightProperties', {
      $filter: filter,
      $select: 'ListingKey,ListingId,ListPrice,DaysOnMarket,BedroomsTotal,BathroomsTotalInteger,LivingArea,YearBuilt,GarageSpaces,Latitude,Longitude,StandardStatus,StreetNumber,StreetName,StreetSuffix,City,StateOrProvince,PostalCode,PropertyType,PropertySubType,ListingContractDate,PublicRemarks',
      $orderby: params.orderby || 'ListingContractDate desc',
      $top: params.top || 25,
      $skip: params.skip,
      $count: true,
    });
  }

  // ── Tool 6: get_property_media ────────────────────────────────

  async getPropertyMedia(listingKey: string, top?: number): Promise<ODataResponse> {
    return this.request<ODataResponse>('/BrightMedia', {
      $filter: `ListingKey eq '${listingKey}'`,
      $select: 'MediaKey,MediaURL,LongDescription,MediaType,Order,PreferredPhotoYN,ResourceName,ImageWidth,ImageHeight',
      $orderby: 'Order asc',
      $top: top || 50,
      $count: true,
    });
  }

  // ── Tool 7: search_agents ─────────────────────────────────────

  async searchAgents(params: {
    memberName?: string;
    memberMlsId?: string;
    officeName?: string;
    city?: string;
    stateOrProvince?: string;
    top?: number;
    skip?: number;
  }): Promise<ODataResponse> {
    const filter = BrightMLSClient.buildFilter([
      BrightMLSClient.contains('MemberFullName', params.memberName),
      BrightMLSClient.eq('MemberMlsId', params.memberMlsId),
      BrightMLSClient.contains('OfficeName', params.officeName),
      BrightMLSClient.eq('MemberCity', params.city),
      BrightMLSClient.eq('MemberStateOrProvince', params.stateOrProvince),
    ]);

    return this.request<ODataResponse>('/BrightMembers', {
      $filter: filter,
      $select: 'MemberKey,MemberMlsId,MemberFirstName,MemberLastName,MemberFullName,MemberEmail,MemberDirectPhone,MemberMobilePhone,MemberStateLicense,MemberDesignation,OfficeName,OfficeKey,MemberCity,MemberStateOrProvince,MemberPostalCode,MemberStatus',
      $top: params.top || 25,
      $skip: params.skip,
      $count: true,
    });
  }

  // ── Tool 8: get_agent ─────────────────────────────────────────

  async getAgent(memberKey: string): Promise<any> {
    return this.request<any>(`/BrightMembers('${memberKey}')`);
  }

  // ── Tool 9: search_offices ────────────────────────────────────

  async searchOffices(params: {
    officeName?: string;
    officeMlsId?: string;
    city?: string;
    stateOrProvince?: string;
    top?: number;
    skip?: number;
  }): Promise<ODataResponse> {
    const filter = BrightMLSClient.buildFilter([
      BrightMLSClient.contains('OfficeName', params.officeName),
      BrightMLSClient.eq('OfficeMlsId', params.officeMlsId),
      BrightMLSClient.eq('OfficeCity', params.city),
      BrightMLSClient.eq('OfficeStateOrProvince', params.stateOrProvince),
    ]);

    return this.request<ODataResponse>('/BrightOffices', {
      $filter: filter,
      $select: 'OfficeKey,OfficeMlsId,OfficeName,OfficePhone,OfficeEmail,OfficeAddress1,OfficeAddress2,OfficeCity,OfficeStateOrProvince,OfficePostalCode,OfficeBrokerKey,OfficeBrokerMlsId,OfficeStatus',
      $top: params.top || 25,
      $skip: params.skip,
      $count: true,
    });
  }

  // ── Tool 10: get_school_info ──────────────────────────────────

  async getSchoolInfo(params: {
    city?: string;
    postalCode?: string;
    schoolDistrict?: string;
    schoolName?: string;
    top?: number;
  }): Promise<{ schools: ODataResponse; districts: ODataResponse }> {
    // Query schools
    const schoolFilter = BrightMLSClient.buildFilter([
      BrightMLSClient.eq('City', params.city),
      BrightMLSClient.eq('PostalCode', params.postalCode),
      BrightMLSClient.contains('SchoolName', params.schoolName),
      BrightMLSClient.contains('SchoolDistrict', params.schoolDistrict),
    ]);

    const schools = await this.request<ODataResponse>('/School', {
      $filter: schoolFilter,
      $top: params.top || 25,
      $count: true,
    });

    // Query school districts
    const districtFilter = BrightMLSClient.buildFilter([
      BrightMLSClient.contains('SchoolDistrictName', params.schoolDistrict),
      BrightMLSClient.eq('City', params.city),
    ]);

    const districts = await this.request<ODataResponse>('/SchoolDistrict', {
      $filter: districtFilter,
      $top: params.top || 25,
      $count: true,
    });

    return { schools, districts };
  }

  // ── Tool 11: get_market_stats ─────────────────────────────────

  async getMarketStats(params: {
    city?: string;
    postalCode?: string;
    propertyType?: string;
    months?: number;
    standardStatus?: string;
  }): Promise<{
    totalCount: number;
    avgListPrice: number | null;
    medianListPrice: number | null;
    avgClosePrice: number | null;
    medianClosePrice: number | null;
    avgPricePerSqft: number | null;
    avgDaysOnMarket: number | null;
    listToSaleRatio: number | null;
    periodMonths: number;
    filters: Record<string, string | undefined>;
  }> {
    const months = params.months || 6;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const status = params.standardStatus || 'Closed';

    const filter = BrightMLSClient.buildFilter([
      BrightMLSClient.eq('StandardStatus', status),
      BrightMLSClient.eq('City', params.city),
      BrightMLSClient.eq('PostalCode', params.postalCode),
      BrightMLSClient.eq('PropertyType', params.propertyType),
      status === 'Closed'
        ? BrightMLSClient.dateGe('CloseDate', cutoffStr)
        : BrightMLSClient.dateGe('ListingContractDate', cutoffStr),
    ]);

    // Fetch up to 500 records for aggregation
    const data = await this.request<ODataResponse>('/BrightProperties', {
      $filter: filter,
      $select: 'ListPrice,ClosePrice,DaysOnMarket,LivingArea,OriginalListPrice',
      $top: 500,
      $count: true,
    });

    const records = data.value || [];
    const totalCount = data['@odata.count'] || records.length;

    // Client-side aggregation
    const listPrices = records.map((r: any) => r.ListPrice).filter((v: any) => v != null) as number[];
    const closePrices = records.map((r: any) => r.ClosePrice).filter((v: any) => v != null) as number[];
    const domValues = records.map((r: any) => r.DaysOnMarket).filter((v: any) => v != null) as number[];

    // Price per sqft
    const pricePerSqft: number[] = [];
    for (const r of records as any[]) {
      const price = r.ClosePrice || r.ListPrice;
      if (price && r.LivingArea && r.LivingArea > 0) {
        pricePerSqft.push(price / r.LivingArea);
      }
    }

    // List-to-sale ratio
    let listToSaleRatios: number[] = [];
    for (const r of records as any[]) {
      if (r.ClosePrice && r.ListPrice && r.ListPrice > 0) {
        listToSaleRatios.push(r.ClosePrice / r.ListPrice);
      }
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const median = (arr: number[]) => {
      if (arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    return {
      totalCount,
      avgListPrice: avg(listPrices) ? Math.round(avg(listPrices)!) : null,
      medianListPrice: median(listPrices) ? Math.round(median(listPrices)!) : null,
      avgClosePrice: avg(closePrices) ? Math.round(avg(closePrices)!) : null,
      medianClosePrice: median(closePrices) ? Math.round(median(closePrices)!) : null,
      avgPricePerSqft: avg(pricePerSqft) ? Math.round(avg(pricePerSqft)! * 100) / 100 : null,
      avgDaysOnMarket: avg(domValues) ? Math.round(avg(domValues)!) : null,
      listToSaleRatio: avg(listToSaleRatios) ? Math.round(avg(listToSaleRatios)! * 10000) / 10000 : null,
      periodMonths: months,
      filters: {
        city: params.city,
        postalCode: params.postalCode,
        propertyType: params.propertyType,
        standardStatus: status,
      },
    };
  }

  // ── Tool 12: search_open_houses ───────────────────────────────

  async searchOpenHouses(params: {
    city?: string;
    postalCode?: string;
    dateFrom?: string;
    dateTo?: string;
    top?: number;
    skip?: number;
  }): Promise<ODataResponse> {
    const filter = BrightMLSClient.buildFilter([
      BrightMLSClient.eq('City', params.city),
      BrightMLSClient.eq('PostalCode', params.postalCode),
      BrightMLSClient.dateGe('OpenHouseDate', params.dateFrom),
      BrightMLSClient.dateLe('OpenHouseDate', params.dateTo),
    ]);

    return this.request<ODataResponse>('/BrightOpenHouses', {
      $filter: filter,
      $select: 'OpenHouseKey,ListingKey,ListingId,OpenHouseDate,OpenHouseStartTime,OpenHouseEndTime,OpenHouseType,OpenHouseStatus,VirtualOpenHouseURL,Refreshments,OpenHouseRemarks,City,PostalCode',
      $orderby: 'OpenHouseDate asc',
      $top: params.top || 25,
      $skip: params.skip,
      $count: true,
    });
  }
}
