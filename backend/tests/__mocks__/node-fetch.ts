/**
 * Manual mock for node-fetch to avoid ESM issues in Jest
 */

export interface MockResponse {
  ok: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<any>;
  text?: () => Promise<string>;
}

const mockFetch = jest.fn<Promise<MockResponse>, [string, any?]>();

export default mockFetch;
export { mockFetch as fetch };

