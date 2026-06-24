
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { JWT } from 'npm:google-auth-library@9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, any>
  target?: {
    type: 'all' | 'course' | 'user' | 'offer'
    id?: string // course_id or user_id or offer_id
    userIds?: string[] // specific list of user ids
  }
}

const getAccessToken = async (clientEmail: string, privateKey: string) => {
  try {
    const client = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    })
    const res = await client.authorize()
    return res.access_token
  } catch (error) {
    console.error('Error getting access token:', error)
    throw new Error(`Failed to get access token: ${error.message}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Function started (v3 - Webhook Support).')
    
    // 1. Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Get Service Account
    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountStr) {
        throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable')
    }

    let serviceAccount
    try {
        serviceAccount = JSON.parse(serviceAccountStr)
        // Fix for escaped newlines in private_key which is common in env vars
        if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
        }
    } catch (e) {
        throw new Error(`Error parsing FIREBASE_SERVICE_ACCOUNT: ${e.message}`)
    }

    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error('Invalid Service Account JSON: Missing project_id, client_email, or private_key')
    }

    // 3. Parse Payload
    let payload: NotificationPayload | null = null;
    let rawBody: any;

    try {
        rawBody = await req.json()
    } catch (e) {
        return new Response(
            JSON.stringify({ error: 'Invalid JSON payload' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Check if this is a Database Webhook payload
    if (rawBody.type === 'INSERT' && rawBody.table === 'notifications' && rawBody.record) {
        console.log('Detected Database Webhook payload');
        const record = rawBody.record;
        
        // Construct NotificationPayload from DB record
        payload = {
            title: record.title,
            body: record.message, // DB has 'message', payload expects 'body'
            data: {
                type: record.type,
                courseId: record.course_id,
                chapterId: record.chapter_id,
                offerId: record.offer_id,
                image_url: record.image_url,
            },
            target: {
                type: 'all' // Default
            }
        };

        // Clean undefined data
        if (payload.data) {
             Object.keys(payload.data).forEach(key => 
                payload.data![key] === null && delete payload.data![key]
            );
        }

        // Determine target from record
        if (record.user_id) {
            // Priority to specific user if user_id is present
            payload.target = { type: 'user', id: record.user_id };
        } else if (record.type === 'course' && record.course_id) {
            payload.target = { type: 'course', id: record.course_id };
        } else if (record.type === 'offer') {
             // Offers typically go to everyone, but if offer_id is present we can use it for deep linking logic if needed.
             // Usually offers are for 'all'.
             payload.target = { type: 'all' };
             // If you wanted to target specific users for an offer, you'd need more logic.
             // But based on current AdminNotificationsScreen, 'offer' type sends to all users.
             if (record.offer_id) {
                 // payload.target.id = record.offer_id; // Not really used for 'all'
             }
        } else {
            // Default to 'all' for 'general' and others
            payload.target = { type: 'all' };
        }
        
        // Handle direct user targeting if added to schema later, or via logic
        // For now, these are the main types.

    } else {
        // Direct invocation payload
        payload = rawBody as NotificationPayload;
    }

    if (!payload) {
         return new Response(
            JSON.stringify({ error: 'Could not parse payload' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const { title, body, data, target } = payload

    if (!title || !body) {
         return new Response(
            JSON.stringify({ error: 'Missing title or body' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    let userIds: string[] = []

    // 4. Determine recipients
    console.log(`Target type: ${target?.type}`)
    if (target?.type === 'all') {
      const { data: users, error } = await supabaseClient
        .from('users')
        .select('id') 
      
      if (error) throw error
      userIds = users.map(u => u.id)

    } else if (target?.type === 'course' && target.id) {
      const { data: purchases, error } = await supabaseClient
        .from('purchases')
        .select('user_id')
        .eq('course_id', target.id)

      if (error) throw error
      userIds = purchases.map(p => p.user_id)

    } else if (target?.type === 'user') {
      if (target.userIds) {
        userIds = target.userIds
      } else if (target.id) {
        userIds = [target.id]
      }
    } else if (target?.type === 'offer') {
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('id')
        
        if (error) throw error
        userIds = users.map(u => u.id)
    }

    if (userIds.length === 0) {
      console.log('No recipients found for target:', target)
      return new Response(
        JSON.stringify({ message: 'No recipients found', success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${userIds.length} user IDs. Fetching tokens...`)

    // 5. Fetch tokens for these users
    let tokens: string[] = []
    const CHUNK_SIZE_DB = 1000
    
    userIds = [...new Set(userIds)]

    for (let i = 0; i < userIds.length; i += CHUNK_SIZE_DB) {
        const chunk = userIds.slice(i, i + CHUNK_SIZE_DB)
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('push_token')
            .in('id', chunk)
            .not('push_token', 'is', null)
        
        if (error) {
            console.error('Error fetching tokens:', error)
            continue
        }
        if (users) {
            tokens.push(...users.map(u => u.push_token))
        }
    }

    tokens = [...new Set(tokens)]
    console.log(`Found ${tokens.length} valid push tokens.`)

    if (tokens.length === 0) {
        return new Response(
            JSON.stringify({ message: 'No valid push tokens found for recipients', success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 6. Get Google Access Token
    console.log('Getting Google Access Token...')
    const accessToken = await getAccessToken(serviceAccount.client_email, serviceAccount.private_key)
    if (!accessToken) {
        throw new Error('Failed to generate Google Access Token')
    }
    console.log('Access Token generated.')

    // 7. Send to FCM (HTTP v1)
    const projectId = serviceAccount.project_id
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
    
    console.log('Sending to FCM...')

    const results = []
    
    const CONCURRENCY_LIMIT = 20
    let successCount = 0
    let failureCount = 0
    const invalidTokens: string[] = []

    for (let i = 0; i < tokens.length; i += CONCURRENCY_LIMIT) {
        const chunk = tokens.slice(i, i + CONCURRENCY_LIMIT)
        const promises = chunk.map(async (token) => {
            // Clone and sanitize data for each message
            const messageData = data ? { ...data } : {};
            for (const key in messageData) {
                if (messageData[key] === undefined || messageData[key] === null) {
                    delete messageData[key];
                } else {
                    messageData[key] = String(messageData[key]);
                }
            }

            const image = (messageData as any).image_url;

            const messagePayload = {
                message: {
                    token: token,
                    notification: {
                        title: title,
                        body: body,
                    },
                    data: messageData,
                    android: {
                        priority: 'HIGH',
                        notification: {
                            channel_id: 'high_importance_channel',
                            default_sound: true,
                            notification_priority: 'PRIORITY_MAX',
                            visibility: 'PUBLIC',
                            ...(image ? { image: image } : {}),
                        }
                    },
                    apns: {
                        headers: {
                            'apns-priority': '10',
                        },
                        payload: {
                            aps: {
                                sound: 'default',
                                'mutable-content': image ? 1 : undefined,
                            }
                        },
                        ...(image ? { fcm_options: { image: image } } : {}),
                    }
                }
            }
            if (image) {
                (messagePayload.message.notification as any).image = image;
            }

            try {
                const res = await fetch(fcmUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(messagePayload)
                })
                
                let resData
                try {
                    resData = await res.json()
                } catch (e) {
                    resData = { error: { message: 'Invalid JSON response from FCM' } }
                }
                
                if (!res.ok) {
                    const errCode = resData.error?.status || resData.error?.code
                    const errMsg = resData.error?.message
                    // console.log(`FCM Error (${errCode}): ${errMsg}`)
                    failureCount++
                    
                    if (res.status === 404 || errMsg === 'Requested entity was not found.') {
                         // Token invalid
                         invalidTokens.push(token)
                    }
                    return { success: false, error: resData }
                } else {
                    successCount++
                    return { success: true, name: resData.name }
                }
            } catch (err) {
                console.error('Fetch error:', err)
                failureCount++
                return { success: false, error: err }
            }
        })
        
        const chunkResults = await Promise.all(promises)
        results.push(...chunkResults)
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
        console.log(`Removing ${invalidTokens.length} invalid tokens...`)
        await supabaseClient
            .from('users')
            .update({ push_token: null })
            .in('push_token', invalidTokens)
    }
    
    console.log(`Completed. Success: ${successCount}, Failed: ${failureCount}`)

    return new Response(
      JSON.stringify({ success: true, sent_count: tokens.length, success_count: successCount, failure_count: failureCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unhandled Error in function:', error)
    return new Response(
      JSON.stringify({ error: `Unhandled Error: ${error.message || error}`, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
