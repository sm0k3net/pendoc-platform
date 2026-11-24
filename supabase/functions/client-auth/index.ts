Deno.serve((request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  return Response.json(
    { error: 'Open the PenDoc sign-in page and use an email sign-in link.' },
    { status: 410, headers },
  );
});
