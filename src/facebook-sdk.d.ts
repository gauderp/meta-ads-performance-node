declare module "facebook-nodejs-business-sdk" {
  export class FacebookAdsApi {
    static init(accessToken: string): typeof FacebookAdsApi;
  }

  export class AdAccount {
    constructor(id: string);
    getInsights(fields: string[], params: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  }

  export class Ad {
    constructor(id: string);
    update(fields: string[], params: Record<string, unknown>): Promise<unknown>;
  }

  export class AdSet {
    constructor(id: string);
    getInsights(fields: string[], params: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  }

  export class Campaign {
    constructor(id: string);
    update(fields: string[], params: Record<string, unknown>): Promise<unknown>;
  }

  const defaultExport: {
    FacebookAdsApi: typeof FacebookAdsApi;
    AdAccount: typeof AdAccount;
    Ad: typeof Ad;
    AdSet: typeof AdSet;
    Campaign: typeof Campaign;
  };

  export default defaultExport;
}
