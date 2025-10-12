const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test Supabase connection
router.get("/test-connection", async (req, res) => {
  try {
    // Test 1: Basic client initialization
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({
        success: false,
        error: "Supabase environment variables not set",
        checks: {
          env_vars: false,
          connection: false,
          storage: false,
        },
      });
    }

    // Test 2: Simple query to test database connection
    const { data, error } = await supabase
      .from("nonexistent_table")
      .select("*")
      .limit(1);

    // We expect this to fail with a specific error, which means connection works
    const connectionWorks = error && error.code === "42P01"; // Table doesn't exist error

    // Test 3: Test storage connection
    let storageWorks = false;
    try {
      const { data: buckets, error: bucketError } =
        await supabase.storage.listBuckets();
      storageWorks = !bucketError;
    } catch (storageError) {
      console.log("Storage test error:", storageError);
    }

    res.json({
      success: true,
      message: "Supabase connection test completed",
      supabase_url: process.env.SUPABASE_URL,
      checks: {
        env_vars: true,
        connection: connectionWorks,
        storage: storageWorks,
        error_details: connectionWorks ? null : error?.message,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Supabase test error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to test Supabase connection",
      details: error.message,
      checks: {
        env_vars: true,
        connection: false,
        storage: false,
      },
    });
  }
});

// Test storage bucket access
router.get("/test-storage", async (req, res) => {
  try {
    // List all buckets
    const { data: buckets, error: bucketError } =
      await supabase.storage.listBuckets();

    if (bucketError) {
      return res.status(500).json({
        success: false,
        error: "Failed to access storage",
        details: bucketError.message,
      });
    }

    // Check if 'uploads' bucket exists
    const uploadsBucket = buckets.find((bucket) => bucket.name === "uploads");

    res.json({
      success: true,
      message: "Storage test completed",
      data: {
        total_buckets: buckets.length,
        buckets: buckets.map((b) => ({
          name: b.name,
          public: b.public,
          created_at: b.created_at,
        })),
        uploads_bucket_exists: !!uploadsBucket,
        uploads_bucket_public: uploadsBucket?.public || false,
      },
    });
  } catch (error) {
    console.error("Storage test error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to test storage",
      details: error.message,
    });
  }
});

module.exports = router;
