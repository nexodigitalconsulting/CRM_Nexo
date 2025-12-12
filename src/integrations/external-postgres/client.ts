import { supabase } from "@/integrations/supabase/client";

type FilterOperator = {
  eq?: unknown;
  neq?: unknown;
  gt?: unknown;
  gte?: unknown;
  lt?: unknown;
  lte?: unknown;
  in?: unknown[];
  like?: string;
};

type FilterValue = unknown | FilterOperator;

interface QueryOptions {
  columns?: string;
  filters?: Record<string, FilterValue>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

interface MutationResult<T> {
  data: T[] | null;
  error: Error | null;
  count?: number;
}

/**
 * External PostgreSQL Client
 * Uses Supabase Edge Function as proxy to connect to external PostgreSQL
 */
class ExternalPostgresClient {
  private async callProxy<T>(body: Record<string, unknown>): Promise<MutationResult<T>> {
    try {
      const { data, error } = await supabase.functions.invoke('postgres-proxy', {
        body,
      });

      if (error) {
        const details = (error as any)?.context?.body
          ? ` | Details: ${(error as any).context.body}`
          : '';
        console.error('[ExternalPG] Proxy error:', error);
        return { data: null, error: new Error(`${error.message}${details}`) };
      }

      if (data?.error) {
        console.error('[ExternalPG] Query error:', data.error);
        return { data: null, error: new Error(String(data.error)) };
      }

      return { data: data?.data || [], error: null, count: data?.count };
    } catch (err) {
      console.error('[ExternalPG] Unexpected error:', err);
      return { data: null, error: err as Error };
    }
  }

  /**
   * Query builder for a table
   */
  from(table: string) {
    return new QueryBuilder(table, this.callProxy.bind(this));
  }
}

class QueryBuilder<T = Record<string, unknown>> {
  private table: string;
  private callProxy: <R>(body: Record<string, unknown>) => Promise<MutationResult<R>>;
  private _columns: string = '*';
  private _filters: Record<string, FilterValue> = {};
  private _orderBy?: { column: string; ascending?: boolean };
  private _limit?: number;
  private _offset?: number;
  private _single: boolean = false;

  constructor(
    table: string,
    callProxy: <R>(body: Record<string, unknown>) => Promise<MutationResult<R>>
  ) {
    this.table = table;
    this.callProxy = callProxy;
  }

  select(columns: string = '*') {
    this._columns = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this._filters[column] = value;
    return this;
  }

  neq(column: string, value: unknown) {
    this._filters[column] = { neq: value };
    return this;
  }

  gt(column: string, value: unknown) {
    this._filters[column] = { gt: value };
    return this;
  }

  gte(column: string, value: unknown) {
    this._filters[column] = { gte: value };
    return this;
  }

  lt(column: string, value: unknown) {
    this._filters[column] = { lt: value };
    return this;
  }

  lte(column: string, value: unknown) {
    this._filters[column] = { lte: value };
    return this;
  }

  in(column: string, values: unknown[]) {
    this._filters[column] = { in: values };
    return this;
  }

  like(column: string, pattern: string) {
    this._filters[column] = { like: pattern };
    return this;
  }

  ilike(column: string, pattern: string) {
    this._filters[column] = { like: pattern };
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this._orderBy = { column, ascending: options?.ascending };
    return this;
  }

  limit(count: number) {
    this._limit = count;
    return this;
  }

  range(from: number, to: number) {
    this._offset = from;
    this._limit = to - from + 1;
    return this;
  }

  single() {
    this._single = true;
    this._limit = 1;
    return this;
  }

  maybeSingle() {
    this._single = true;
    this._limit = 1;
    return this;
  }

  async then<TResult1 = MutationResult<T>, TResult2 = never>(
    onfulfilled?: ((value: MutationResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const result = await this.execute();
    if (onfulfilled) {
      return onfulfilled(result);
    }
    return result as unknown as TResult1;
  }

  private async execute(): Promise<MutationResult<T>> {
    const result = await this.callProxy<T>({
      operation: 'select',
      table: this.table,
      columns: this._columns,
      filters: Object.keys(this._filters).length > 0 ? this._filters : undefined,
      orderBy: this._orderBy,
      limit: this._limit,
      offset: this._offset,
    });

    if (this._single && result.data) {
      return {
        data: result.data[0] as unknown as T[] | null,
        error: result.error,
      };
    }

    return result;
  }

  async insert(data: Partial<T> | Partial<T>[]) {
    return this.callProxy<T>({
      operation: 'insert',
      table: this.table,
      data,
    });
  }

  async update(data: Partial<T>) {
    return this.callProxy<T>({
      operation: 'update',
      table: this.table,
      data,
      filters: Object.keys(this._filters).length > 0 ? this._filters : undefined,
    });
  }

  async delete() {
    return this.callProxy<T>({
      operation: 'delete',
      table: this.table,
      filters: Object.keys(this._filters).length > 0 ? this._filters : undefined,
    });
  }

  async upsert(data: Partial<T> | Partial<T>[], options?: { onConflict?: string }) {
    return this.callProxy<T>({
      operation: 'upsert',
      table: this.table,
      data,
      onConflict: options?.onConflict,
    });
  }
}

// Export singleton instance
export const externalPg = new ExternalPostgresClient();

// Export types for tables
export type { MutationResult, QueryOptions };
