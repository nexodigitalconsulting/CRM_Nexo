// =============================================================================
// Edge Function Dispatcher - CRÍTICO para Supabase Self-Hosted
// =============================================================================
// Este archivo recibe TODAS las peticiones y las despacha a las funciones 
// correspondientes usando EdgeRuntime.userWorkers
//
// Basado en: https://github.com/supabase/supabase/blob/master/docker/functions-relay/main/index.ts
// =============================================================================

const FUNCTION_PATH_PREFIX = '/';

// Mapa de funciones y sus configuraciones de JWT
const FUNCTIONS_CONFIG: Record<string, { verifyJWT: boolean }> = {
  'ping': { verifyJWT: false },
  'db-migrate': { verifyJWT: false },
  'setup-database': { verifyJWT: false },
  'bootstrap-admin': { verifyJWT: false },
  'send-email': { verifyJWT: true },
  'process-notifications': { verifyJWT: true },
  'calendar-ical': { verifyJWT: true },
  'google-calendar-auth': { verifyJWT: true },
  'google-calendar-callback': { verifyJWT: false }, // callback OAuth
  'google-calendar-events': { verifyJWT: true },
};

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Health check endpoints
  if (url.pathname === '/health' || url.pathname === '/_main/health' || url.pathname === '/main/health') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Edge Functions Dispatcher Ready',
        version: '1.0.0',
        functions: Object.keys(FUNCTIONS_CONFIG).length
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Root path
  if (url.pathname === '/' || url.pathname === '') {
    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Supabase Edge Functions',
        version: '1.0.0',
        environment: 'self-hosted'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Extraer nombre de función del path
  // Formato esperado: /functions/v1/{function_name} o /{function_name}
  let functionName = '';
  
  if (pathParts[0] === 'functions' && pathParts[1] === 'v1') {
    functionName = pathParts[2] || '';
  } else {
    functionName = pathParts[0] || '';
  }

  // Si no hay función, retornar lista de funciones disponibles
  if (!functionName) {
    return new Response(
      JSON.stringify({
        available_functions: Object.keys(FUNCTIONS_CONFIG),
        usage: 'GET /functions/v1/{function_name}'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Verificar si la función existe
  const functionConfig = FUNCTIONS_CONFIG[functionName];
  
  if (!functionConfig) {
    console.error(`[Dispatcher] Function not found: ${functionName}`);
    return new Response(
      JSON.stringify({
        error: 'Function not found',
        function: functionName,
        available: Object.keys(FUNCTIONS_CONFIG)
      }),
      { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  console.log(`[Dispatcher] Routing request to: ${functionName}`);

  try {
    // Crear worker para la función
    // @ts-ignore - EdgeRuntime es global en Supabase Edge Runtime
    const worker = await EdgeRuntime.userWorkers.create({
      servicePath: functionName,
      memoryLimitMb: 150,
      workerTimeoutMs: 60 * 1000, // 1 minuto
      noModuleCache: false,
      importMapPath: null,
      envVars: Object.keys(Deno.env.toObject()),
    });

    // Despachar la petición al worker
    const response = await worker.fetch(req);
    
    console.log(`[Dispatcher] ${functionName} responded with status: ${response.status}`);
    
    return response;
  } catch (error) {
    console.error(`[Dispatcher] Error invoking ${functionName}:`, error);
    
    // Si EdgeRuntime no está disponible, intentar fetch directo
    if (String(error).includes('EdgeRuntime')) {
      console.log(`[Dispatcher] EdgeRuntime not available, attempting direct routing`);
      
      // En algunos entornos, las funciones están en rutas separadas
      // Intentar redirigir
      return new Response(
        JSON.stringify({
          error: 'EdgeRuntime not available',
          message: 'This dispatcher requires Supabase Edge Runtime environment',
          function: functionName,
          suggestion: 'Call the function directly at /functions/v1/' + functionName
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        error: 'Function invocation failed',
        function: functionName,
        message: String(error)
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
