const FIKEN_BASE_URL = "https://api.fiken.no/api/v2";

export class FikenApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string
  ) {
    super(`Fiken API error ${status} ${statusText}: ${body}`);
    this.name = "FikenApiError";
  }
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageCount: number;
    resultCount: number;
    pageSize: number;
  };
}

export class FikenClient {
  private token: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(token: string) {
    this.token = token;
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(() => fn());
    this.queue = next.catch(() => {});
    return next;
  }

  private async fetchJson<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<{ data: T; headers: Headers }> {
    const url = new URL(`${FIKEN_BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new FikenApiError(response.status, response.statusText, body);
    }

    const data = (await response.json()) as T;
    return { data, headers: response.headers };
  }

  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.enqueue(async () => {
      const { data } = await this.fetchJson<T>(path, params);
      return data;
    });
  }

  async post<T = unknown>(
    path: string,
    body: unknown
  ): Promise<{ data: T | null; location: string | null }> {
    return this.enqueue(async () => {
      const url = `${FIKEN_BASE_URL}${path}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new FikenApiError(response.status, response.statusText, errorBody);
      }

      const location = response.headers.get("Location");
      let data: T | null = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text) as T;
        } catch {
          // 201 responses often have no body
        }
      }
      return { data, location };
    });
  }

  async patch<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.enqueue(async () => {
      const url = new URL(`${FIKEN_BASE_URL}${path}`);
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined) {
            url.searchParams.set(key, String(value));
          }
        }
      }
      const response = await fetch(url.toString(), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const errorBody = await response.text();
        throw new FikenApiError(response.status, response.statusText, errorBody);
      }
      const text = await response.text();
      if (text) {
        return JSON.parse(text) as T;
      }
      return null as T;
    });
  }

  async getPaginated<T>(
    path: string,
    pagination: { page?: number; pageSize?: number },
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<PaginatedResult<T>> {
    return this.enqueue(async () => {
      const allParams = {
        ...params,
        page: pagination.page ?? 0,
        pageSize: pagination.pageSize ?? 25,
      };

      const { data, headers } = await this.fetchJson<T[]>(path, allParams);

      const page = parseInt(headers.get("Fiken-Api-Page") ?? "0", 10);
      const pageCount = parseInt(
        headers.get("Fiken-Api-Page-Count") ?? "1",
        10
      );
      const resultCount = parseInt(
        headers.get("Fiken-Api-Result-Count") ?? String(data.length),
        10
      );
      const pageSize = allParams.pageSize;

      return {
        data,
        pagination: { page, pageCount, resultCount, pageSize },
      };
    });
  }
}
