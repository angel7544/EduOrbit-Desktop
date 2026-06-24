
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { JWT } from 'npm:google-auth-library@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountStr) {
      throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable')
    }

    let serviceAccount
    try {
        serviceAccount = JSON.parse(serviceAccountStr)
    } catch (e) {
        throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT JSON: ${e.message}`)
    }

    if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
        throw new Error('Service Account JSON is missing client_email, private_key, or project_id')
    }
    
    const client = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    })

    const res = await client.authorize()
    
    return new Response(
      JSON.stringify({ 
        access_token: res.access_token,
        project_id: serviceAccount.project_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in get-fcm-token:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
