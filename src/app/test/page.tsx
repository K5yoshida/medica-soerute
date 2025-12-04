import { createClient } from '@/lib/supabase/server'

export default async function TestPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Auth Error</h1>
        <pre className="mt-4 p-4 bg-red-50 rounded">
          {JSON.stringify(authError, null, 2)}
        </pre>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">No User</h1>
        <p>User is not logged in</p>
      </div>
    )
  }

  // Try to get user from users table
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-green-600">Test Page Works!</h1>

      <div className="mt-4">
        <h2 className="text-lg font-semibold">Auth User:</h2>
        <pre className="p-4 bg-gray-100 rounded mt-2 overflow-auto">
          {JSON.stringify({ id: user.id, email: user.email }, null, 2)}
        </pre>
      </div>

      <div className="mt-4">
        <h2 className="text-lg font-semibold">DB User:</h2>
        {dbError ? (
          <pre className="p-4 bg-red-50 rounded mt-2">
            Error: {JSON.stringify(dbError, null, 2)}
          </pre>
        ) : (
          <pre className="p-4 bg-gray-100 rounded mt-2 overflow-auto">
            {JSON.stringify(dbUser, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
