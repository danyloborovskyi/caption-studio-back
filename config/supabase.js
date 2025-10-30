/**
 * Supabase Configuration
 * Centralized Supabase client configuration
 */

const { createClient } = require("@supabase/supabase-js");

/**
 * Create a Supabase client with user authentication
 */
function getSupabaseClient(accessToken) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/**
 * Create an admin Supabase client (no user context)
 */
function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase admin configuration");
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

module.exports = {
  getSupabaseClient,
  getSupabaseAdmin,
};
