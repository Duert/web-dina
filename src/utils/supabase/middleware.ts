import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // AV: This is a fix for the 504 Gateway Timeout error.
    // We race the getUser call against a timeout to prevent the edge function from timing out.
    // If the database is slow, we proceed without blocking the request.
    const userPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 2000)
    )

    try {
        await Promise.race([userPromise, timeoutPromise])
    } catch (error) {
        // If it times out or fails (e.g. 504), we just ignore it and let the request proceed.
        // The page will load and the client-side auth will handle the rest.
        console.warn('Middleware auth check timed out or failed, proceeding without session refresh.')
        response.headers.set('x-middleware-timeout', 'timeout')
    }

    return response
}
