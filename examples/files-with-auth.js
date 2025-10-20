// Example: routes/files.js with authentication and user-specific filtering

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { authenticateUser } = require("../middleware/auth"); // ← Import auth
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // Use anon key to respect RLS
);

// ==========================================
// PROTECT ALL FILE ROUTES
// ==========================================
router.use(authenticateUser);

// GET route to retrieve all files for the authenticated user
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = "uploaded_at",
      sortOrder = "desc",
    } = req.query;

    // ✅ Get authenticated user ID
    const userId = req.user.id;

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build query - FILTER BY USER
    let query = supabase
      .from("uploaded_files")
      .select("*", { count: "exact" })
      .eq("user_id", userId); // ← IMPORTANT: Filter by user

    // Add status filter if provided
    if (status) {
      query = query.eq("status", status);
    }

    // Add sorting
    const ascending = sortOrder.toLowerCase() === "asc";
    query = query.order(sortBy, { ascending });

    // Add pagination
    query = query.range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Format response data
    const formattedData = (data || []).map((file) => ({
      id: file.id,
      filename: file.filename,
      file_path: file.file_path,
      file_size: file.file_size,
      mime_type: file.mime_type,
      public_url: file.public_url,
      description: file.description || null,
      tags: file.tags || [],
      status: file.status || "uploaded",
      uploaded_at: file.uploaded_at,
      updated_at: file.updated_at || file.uploaded_at,
      file_size_mb: file.file_size
        ? (file.file_size / (1024 * 1024)).toFixed(2)
        : null,
      has_ai_analysis: !!(
        file.description ||
        (file.tags && file.tags.length > 0)
      ),
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_items: count,
        total_pages: totalPages,
      },
      user: {
        id: userId,
        email: req.user.email,
      },
    });
  } catch (error) {
    console.error("Get files error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch files",
      details: error.message,
    });
  }
});

// GET route to retrieve images only for the authenticated user
router.get("/images", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // ✅ Get authenticated user ID
    const userId = req.user.id;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build query for images only - FILTER BY USER
    let query = supabase
      .from("uploaded_files")
      .select("*", { count: "exact" })
      .eq("user_id", userId) // ← Filter by user
      .like("mime_type", "image%");

    query = query.order("uploaded_at", { ascending: false });
    query = query.range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_items: count,
        total_pages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("Get images error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch images",
      details: error.message,
    });
  }
});

// GET route to retrieve file statistics for the authenticated user
router.get("/stats", async (req, res) => {
  try {
    // ✅ Get authenticated user ID
    const userId = req.user.id;

    // Get total count for this user
    const { count: totalFiles } = await supabase
      .from("uploaded_files")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId); // ← Filter by user

    // Get counts by status
    const { data: statusData } = await supabase
      .from("uploaded_files")
      .select("status")
      .eq("user_id", userId); // ← Filter by user

    const statusCounts = (statusData || []).reduce((acc, file) => {
      const status = file.status || "uploaded";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Get files with AI analysis
    const { data: aiData } = await supabase
      .from("uploaded_files")
      .select("description, tags")
      .eq("user_id", userId) // ← Filter by user
      .not("description", "is", null);

    const aiAnalysisCount = aiData?.length || 0;

    // Get file type distribution
    const { data: typeData } = await supabase
      .from("uploaded_files")
      .select("mime_type")
      .eq("user_id", userId); // ← Filter by user

    const typeDistribution = (typeData || []).reduce((acc, file) => {
      const type = file.mime_type?.split("/")[0] || "unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Get total storage usage for this user
    const { data: sizeData } = await supabase
      .from("uploaded_files")
      .select("file_size")
      .eq("user_id", userId); // ← Filter by user

    const totalBytes = (sizeData || []).reduce((sum, file) => {
      return sum + (file.file_size || 0);
    }, 0);

    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      data: {
        user_id: userId,
        total_files: totalFiles || 0,
        files_with_ai_analysis: aiAnalysisCount,
        status_distribution: statusCounts,
        file_type_distribution: typeDistribution,
        storage_usage: {
          total_bytes: totalBytes,
          total_mb: parseFloat(totalMB),
          total_gb: parseFloat(totalGB),
          human_readable: totalGB > 1 ? `${totalGB} GB` : `${totalMB} MB`,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch file statistics",
      details: error.message,
    });
  }
});

// GET route to search files for the authenticated user
router.get("/search", async (req, res) => {
  try {
    const { q: searchQuery, type, page = 1, limit = 20 } = req.query;

    // ✅ Get authenticated user ID
    const userId = req.user.id;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: "Search query (q) parameter is required",
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Get all user's files
    let query = supabase
      .from("uploaded_files")
      .select("*")
      .eq("user_id", userId); // ← Filter by user

    if (type) {
      query = query.like("mime_type", `${type}%`);
    }

    query = query.order("uploaded_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Client-side filtering
    let filteredData = (data || []).filter((file) => {
      const filenameMatch = file.filename
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      const descriptionMatch = file.description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      const tagsMatch =
        file.tags && Array.isArray(file.tags)
          ? file.tags.some((tag) =>
              tag.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : false;

      return filenameMatch || descriptionMatch || tagsMatch;
    });

    // Apply pagination
    const totalFiltered = filteredData.length;
    const paginatedData = filteredData.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: paginatedData,
      search: {
        query: searchQuery,
        type_filter: type || "all",
        results_found: totalFiltered,
      },
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_items: totalFiltered,
        total_pages: Math.ceil(totalFiltered / limitNum),
      },
    });
  } catch (error) {
    console.error("Search files error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search files",
      details: error.message,
    });
  }
});

// GET route to retrieve a single file by ID (with ownership check)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Get authenticated user ID
    const userId = req.user.id;

    // Query with ownership check
    const { data: file, error } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId) // ← Verify user owns this file
      .single();

    if (error || !file) {
      return res.status(404).json({
        success: false,
        error: "File not found or access denied",
      });
    }

    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    console.error("Get file error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch file",
      details: error.message,
    });
  }
});

// DELETE route to remove a file (with ownership check)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Get authenticated user ID
    const userId = req.user.id;

    // First, verify ownership and get file info
    const { data: fileData, error: fetchError } = await supabase
      .from("uploaded_files")
      .select("file_path, filename, mime_type, user_id")
      .eq("id", id)
      .eq("user_id", userId) // ← Verify ownership
      .single();

    if (fetchError || !fileData) {
      return res.status(404).json({
        success: false,
        error: "File not found or access denied",
      });
    }

    // Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("uploads")
      .remove([fileData.file_path]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
    }

    // Delete from database (RLS will ensure user ownership)
    const { error: dbError } = await supabase
      .from("uploaded_files")
      .delete()
      .eq("id", id)
      .eq("user_id", userId); // ← Extra safety

    if (dbError) {
      throw dbError;
    }

    res.json({
      success: true,
      message: "File deleted successfully",
      data: {
        id: id,
        filename: fileData.filename,
        type: fileData.mime_type,
      },
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete file",
      details: error.message,
    });
  }
});

module.exports = router;
