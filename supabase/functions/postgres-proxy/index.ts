import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create connection pool
const pool = new Pool({
  hostname: Deno.env.get('EXTERNAL_POSTGRES_HOST')!,
  port: parseInt(Deno.env.get('EXTERNAL_POSTGRES_PORT') || '5432'),
  user: Deno.env.get('EXTERNAL_POSTGRES_USER')!,
  password: Deno.env.get('EXTERNAL_POSTGRES_PASSWORD')!,
  database: Deno.env.get('EXTERNAL_POSTGRES_DB')!,
  tls: { enabled: false },
}, 3);

type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

interface QueryRequest {
  operation: Operation;
  table: string;
  columns?: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  onConflict?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const client = await pool.connect();

  try {
    const body: QueryRequest = await req.json();
    const { operation, table, columns, data, filters, orderBy, limit, offset, onConflict } = body;

    console.log(`[postgres-proxy] ${operation.toUpperCase()} on ${table}`);

    let query = '';
    let params: unknown[] = [];
    let paramIndex = 1;

    // Build query based on operation
    switch (operation) {
      case 'select': {
        const cols = columns || '*';
        query = `SELECT ${cols} FROM ${table}`;
        
        // Add WHERE clauses
        if (filters && Object.keys(filters).length > 0) {
          const whereClauses: string[] = [];
          for (const [key, value] of Object.entries(filters)) {
            if (value === null) {
              whereClauses.push(`${key} IS NULL`);
            } else if (typeof value === 'object' && value !== null) {
              // Handle operators like { eq: value }, { in: [values] }, { gte: value }
              const op = value as Record<string, unknown>;
              if ('eq' in op) {
                whereClauses.push(`${key} = $${paramIndex++}`);
                params.push(op.eq);
              } else if ('neq' in op) {
                whereClauses.push(`${key} != $${paramIndex++}`);
                params.push(op.neq);
              } else if ('gt' in op) {
                whereClauses.push(`${key} > $${paramIndex++}`);
                params.push(op.gt);
              } else if ('gte' in op) {
                whereClauses.push(`${key} >= $${paramIndex++}`);
                params.push(op.gte);
              } else if ('lt' in op) {
                whereClauses.push(`${key} < $${paramIndex++}`);
                params.push(op.lt);
              } else if ('lte' in op) {
                whereClauses.push(`${key} <= $${paramIndex++}`);
                params.push(op.lte);
              } else if ('in' in op && Array.isArray(op.in)) {
                const placeholders = op.in.map(() => `$${paramIndex++}`).join(', ');
                whereClauses.push(`${key} IN (${placeholders})`);
                params.push(...(op.in as unknown[]));
              } else if ('like' in op) {
                whereClauses.push(`${key} ILIKE $${paramIndex++}`);
                params.push(op.like);
              }
            } else {
              whereClauses.push(`${key} = $${paramIndex++}`);
              params.push(value);
            }
          }
          if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
          }
        }
        
        // Add ORDER BY
        if (orderBy) {
          query += ` ORDER BY ${orderBy.column} ${orderBy.ascending !== false ? 'ASC' : 'DESC'}`;
        }
        
        // Add LIMIT and OFFSET
        if (limit) {
          query += ` LIMIT ${limit}`;
        }
        if (offset) {
          query += ` OFFSET ${offset}`;
        }
        break;
      }

      case 'insert': {
        if (!data) throw new Error('Data required for insert');
        const rows = Array.isArray(data) ? data : [data];
        if (rows.length === 0) throw new Error('No data to insert');
        
        const keys = Object.keys(rows[0]);
        const valueSets: string[] = [];
        
        for (const row of rows) {
          const placeholders = keys.map(() => `$${paramIndex++}`).join(', ');
          valueSets.push(`(${placeholders})`);
          params.push(...keys.map(k => row[k]));
        }
        
        query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${valueSets.join(', ')} RETURNING *`;
        break;
      }

      case 'update': {
        if (!data || Array.isArray(data)) throw new Error('Single data object required for update');
        
        const setClauses = Object.keys(data).map(key => `${key} = $${paramIndex++}`);
        params.push(...Object.values(data));
        
        query = `UPDATE ${table} SET ${setClauses.join(', ')}`;
        
        // Add WHERE clauses
        if (filters && Object.keys(filters).length > 0) {
          const whereClauses = Object.keys(filters).map(key => `${key} = $${paramIndex++}`);
          params.push(...Object.values(filters));
          query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        
        query += ' RETURNING *';
        break;
      }

      case 'delete': {
        query = `DELETE FROM ${table}`;
        
        if (filters && Object.keys(filters).length > 0) {
          const whereClauses = Object.keys(filters).map(key => `${key} = $${paramIndex++}`);
          params.push(...Object.values(filters));
          query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        
        query += ' RETURNING *';
        break;
      }

      case 'upsert': {
        if (!data) throw new Error('Data required for upsert');
        const rows = Array.isArray(data) ? data : [data];
        if (rows.length === 0) throw new Error('No data to upsert');
        
        const keys = Object.keys(rows[0]);
        const valueSets: string[] = [];
        
        for (const row of rows) {
          const placeholders = keys.map(() => `$${paramIndex++}`).join(', ');
          valueSets.push(`(${placeholders})`);
          params.push(...keys.map(k => row[k]));
        }
        
        const conflict = onConflict || 'id';
        const updateClauses = keys.filter(k => k !== conflict).map(k => `${k} = EXCLUDED.${k}`);
        
        query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${valueSets.join(', ')}
                 ON CONFLICT (${conflict}) DO UPDATE SET ${updateClauses.join(', ')}
                 RETURNING *`;
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    console.log(`[postgres-proxy] Query: ${query.substring(0, 200)}...`);
    
    const result = await client.queryObject(query, params);
    
    return new Response(JSON.stringify({ 
      data: result.rows,
      count: result.rowCount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[postgres-proxy] Error:', errMsg);
    return new Response(JSON.stringify({ 
      error: errMsg,
      data: null 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    client.release();
  }
});
