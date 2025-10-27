const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { authenticateUser } = require("../middleware/auth");
const router = express.Router();

// Helper function to create user-specific Supabase client
function getSupabaseClient(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

// ==========================================
// PROTECT ALL FILE ROUTES WITH AUTHENTICATION
// ==========================================
router.use(authenticateUser);

// GET route to retrieve all uploaded files with comprehensive data
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const userToken = req.token;
    const supabase = getSupabaseClient(userToken);

    const {
      page = 1,
      per_page = 20,
      status,
      sortBy = "uploaded_at",
      sortOrder = "desc",
    } = req.query;

    // Calculate pagination
    const pageNum = parseInt(page);
    const perPageNum = parseInt(per_page);
    const offset = (pageNum - 1) * perPageNum;

    // Build query - filtered by user_id
    let query = supabase
      .from("uploaded_files")
      .select("*", { count: "exact" })
      .eq("user_id", userId); // ⭐ Filter by user

    // Add status filter if provided
    if (status) {
      query = query.eq("status", status);
    }

    // Add sorting
    const ascending = sortOrder.toLowerCase() === "asc";
    query = query.order(sortBy, { ascending });

    // Add pagination
    query = query.range(offset, offset + perPageNum - 1);

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
      // Add computed fields
      file_size_mb: file.file_size
        ? (file.file_size / (1024 * 1024)).toFixed(2)
        : null,
      has_ai_analysis: !!(
        file.description ||
        (file.tags && file.tags.length > 0)
      ),
      is_image: file.mime_type?.startsWith("image/") || false,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(count / perPageNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        current_page: pageNum,
        per_page: perPageNum,
        total_items: count,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
        next_page: hasNextPage ? pageNum + 1 : null,
        prev_page: hasPrevPage ? pageNum - 1 : null,
      },
      filters: {
        status: status || "all",
        sort_by: sortBy,
        sort_order: sortOrder,
      },
      summary: {
        total_files: count,
        page_count: formattedData.length,
        files_with_ai: formattedData.filter((f) => f.has_ai_analysis).length,
        image_files: formattedData.filter((f) => f.is_image).length,
      },
    });
  } catch (error) {
    console.error("Get files error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch uploaded files",
      details: error.message,
    });
  }
});

// GET route to retrieve images only
router.get("/images", async (req, res) => {
  try {
    const userId = req.user.id;
    const userToken = req.token;
    const supabase = getSupabaseClient(userToken);

    const {
      page = 1,
      per_page = 20,
      sortBy = "uploaded_at",
      sortOrder = "desc",
    } = req.query;

    // Calculate pagination
    const pageNum = parseInt(page);
    const perPageNum = parseInt(per_page);
    const offset = (pageNum - 1) * perPageNum;

    // Build query for images only - filtered by user_id
    let query = supabase
      .from("uploaded_files")
      .select("*", { count: "exact" })
      .eq("user_id", userId) // ⭐ Filter by user
      .like("mime_type", "image%");

    // Add sorting
    const ascending = sortOrder.toLowerCase() === "asc";
    query = query.order(sortBy, { ascending });

    // Add pagination
    query = query.range(offset, offset + perPageNum - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Format response data
    const formattedData = (data || []).map((file) => ({
      id: file.id,
      filename: file.filename,
      public_url: file.public_url,
      description: file.description || null,
      tags: file.tags || [],
      status: file.status || "uploaded",
      file_size_mb: file.file_size
        ? (file.file_size / (1024 * 1024)).toFixed(2)
        : null,
      uploaded_at: file.uploaded_at,
      has_ai_analysis: !!(
        file.description ||
        (file.tags && file.tags.length > 0)
      ),
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        current_page: pageNum,
        per_page: perPageNum,
        total_items: count,
        total_pages: Math.ceil(count / perPageNum),
      },
      summary: {
        total_images: count,
        page_count: formattedData.length,
        images_with_ai: formattedData.filter((f) => f.has_ai_analysis).length,
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

// GET route to retrieve file statistics
router.get("/stats", async (req, res) => {
  try {
    const userId = req.user.id;
    const userToken = req.token;
    const supabase = getSupabaseClient(userToken);

    // Get total counts for current user
    const { count: totalFiles } = await supabase
      .from("uploaded_files")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId); // ⭐ Filter by user

    // Get counts by status (if status column exists)
    let statusCounts = {};
    try {
      const { data: statusData } = await supabase
        .from("uploaded_files")
        .select("status")
        .eq("user_id", userId); // ⭐ Filter by user

      if (statusData) {
        statusCounts = statusData.reduce((acc, file) => {
          const status = file.status || "uploaded";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
      }
    } catch (statusError) {
      console.warn("Status column may not exist:", statusError);
    }

    // Get files with AI analysis (if columns exist)
    let aiAnalysisCount = 0;
    try {
      const { data: aiData } = await supabase
        .from("uploaded_files")
        .select("description, tags")
        .eq("user_id", userId) // ⭐ Filter by user
        .not("description", "is", null);

      aiAnalysisCount = aiData?.length || 0;
    } catch (aiError) {
      console.warn("AI analysis columns may not exist:", aiError);
    }

    // Get file type distribution
    const { data: typeData } = await supabase
      .from("uploaded_files")
      .select("mime_type")
      .eq("user_id", userId); // ⭐ Filter by user

    const typeDistribution = (typeData || []).reduce((acc, file) => {
      const type = file.mime_type?.split("/")[0] || "unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Get total storage usage
    const { data: sizeData } = await supabase
      .from("uploaded_files")
      .select("file_size")
      .eq("user_id", userId); // ⭐ Filter by user

    const totalBytes = (sizeData || []).reduce((sum, file) => {
      return sum + (file.file_size || 0);
    }, 0);

    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      data: {
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

// GET route to search files
router.get("/search", async (req, res) => {
  try {
    const userId = req.user.id;
    const userToken = req.token;
    const supabase = getSupabaseClient(userToken);

    const {
      q: searchQuery,
      type,
      page = 1,
      per_page = 20,
      sortBy = "uploaded_at",
      sortOrder = "desc",
    } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: "Search query (q) parameter is required",
      });
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const perPageNum = parseInt(per_page);
    const offset = (pageNum - 1) * perPageNum;

    // Validate sortBy field
    const validSortFields = [
      "uploaded_at",
      "updated_at",
      "filename",
      "file_size",
    ];
    const finalSortBy = validSortFields.includes(sortBy)
      ? sortBy
      : "uploaded_at";

    // Build search query - get user's files
    let query = supabase
      .from("uploaded_files")
      .select("*")
      .eq("user_id", userId); // ⭐ Filter by user

    // Add type filter if provided (this can be done at database level)
    if (type) {
      query = query.like("mime_type", `${type}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Client-side filtering for tags and apply search to all results
    let filteredData = data || [];
    if (searchQuery) {
      filteredData = (data || []).filter((file) => {
        // Check filename
        const filenameMatch = file.filename
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

        // Check description
        const descriptionMatch = file.description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

        // Check tags array
        const tagsMatch =
          file.tags && Array.isArray(file.tags)
            ? file.tags.some((tag) =>
                tag.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : false;

        // Return true if any field matches
        return filenameMatch || descriptionMatch || tagsMatch;
      });
    }

    // Apply sorting to filtered results
    const ascending = sortOrder.toLowerCase() === "asc";
    filteredData.sort((a, b) => {
      let aVal = a[finalSortBy];
      let bVal = b[finalSortBy];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      // For strings, use localeCompare
      if (typeof aVal === "string" && typeof bVal === "string") {
        return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      // For numbers and dates, use standard comparison
      if (ascending) {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    // Apply pagination to filtered and sorted results
    const totalFiltered = filteredData.length;
    const paginatedData = filteredData.slice(offset, offset + perPageNum);

    // Format response data
    const formattedData = paginatedData.map((file) => ({
      id: file.id,
      filename: file.filename,
      public_url: file.public_url,
      description: file.description || null,
      tags: file.tags || [],
      mime_type: file.mime_type,
      file_size: file.file_size,
      file_size_mb: file.file_size
        ? (file.file_size / (1024 * 1024)).toFixed(2)
        : null,
      uploaded_at: file.uploaded_at,
      updated_at: file.updated_at || file.uploaded_at,
      is_image: file.mime_type?.startsWith("image/") || false,
    }));

    res.json({
      success: true,
      data: formattedData,
      search: {
        query: searchQuery,
        type_filter: type || "all",
        results_found: totalFiltered,
      },
      sorting: {
        sort_by: finalSortBy,
        sort_order: sortOrder,
      },
      pagination: {
        current_page: pageNum,
        per_page: perPageNum,
        total_items: totalFiltered,
        total_pages: Math.ceil(totalFiltered / perPageNum),
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

// GET route to download a file
router.get("/:id/download", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userToken = req.token;
    const supabase = getSupabaseClient(userToken);

    console.log(
      `📥 User ${req.user.email} attempting to download file ID: ${id}`
    );

    // Get file info and verify ownership
    const { data: file, error: fetchError } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId) // ⭐ Verify ownership
      .single();

    if (fetchError || !file) {
      return res.status(404).json({
        success: false,
        error: "File not found or access denied",
      });
    }

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("uploads")
      .download(file.file_path);

    if (downloadError) {
      console.error("Download error:", downloadError);
      return res.status(500).json({
        success: false,
        error: "Failed to download file",
        details: downloadError.message,
      });
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Set headers for download
    res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.filename)}"`
    );
    res.setHeader("Content-Length", buffer.length);

    console.log(`✅ File downloaded successfully: ${file.filename}`);

    // Send the file
    res.send(buffer);
  } catch (error) {
    console.error("Download file error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download file",
      details: error.message,
    });
  }
});

// GET route to retrieve a single file by ID (must be LAST)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userToken = req.token;
    const supabase = getSupabaseClient(userToken);

    const { data: file, error } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId) // ⭐ Verify ownership
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "File not found",
        });
      }
      throw error;
    }

    // Format the single file data
    const formattedFile = {
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
      // Add computed fields
      file_size_mb: file.file_size
        ? (file.file_size / (1024 * 1024)).toFixed(2)
        : null,
      file_size_kb: file.file_size ? (file.file_size / 1024).toFixed(2) : null,
      has_ai_analysis: !!(
        file.description ||
        (file.tags && file.tags.length > 0)
      ),
      is_image: file.mime_type?.startsWith("image/") || false,
      file_extension: file.filename?.split(".").pop()?.toLowerCase() || null,
    };

    res.json({
      success: true,
      data: formattedFile,
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

// POST route to bulk regenerate AI analysis for multiple files
router.post("/regenerate", async (req, res) => {
  try {
    const { ids, tagStyle = "neutral" } = req.body;
    const userId = req.user.id;
    const userToken = req.token;
    const supabase = getSupabaseClient(userToken);

    console.log(
      `🔄 User ${req.user.email} attempting to bulk regenerate AI analysis`
    );

    // Validate input
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        error: "Invalid request format",
        message: "Request body must contain an 'ids' array",
      });
    }

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No files provided",
        message: "Please provide at least one file ID to regenerate",
      });
    }

    if (ids.length > 20) {
      return res.status(400).json({
        success: false,
        error: "Too many files",
        message: "Maximum 20 files can be regenerated at once",
      });
    }

    // Validate tag style
    const validStyles = ["neutral", "playful", "seo"];
    const finalTagStyle = validStyles.includes(tagStyle) ? tagStyle : "neutral";

    console.log(
      `🤖 Processing ${ids.length} file regenerations in parallel with style: ${finalTagStyle}...`
    );
    const startTime = Date.now();

    // Initialize OpenAI
    const OpenAI = require("openai");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Tag style prompts
    const TAG_STYLES = {
      neutral: {
        name: "Neutral",
        instruction:
          "Exactly 5 relevant, descriptive tags/keywords (single words or short phrases, professional and clear)",
      },
      playful: {
        name: "Playful",
        instruction:
          "Exactly 5 fun, creative, engaging tags/keywords (can be playful phrases, trending terms, or expressive words)",
      },
      seo: {
        name: "SEO",
        instruction:
          "Exactly 5 highly searchable SEO tags/keywords (focus on popular search terms, specific descriptors, and discoverability)",
      },
    };

    const styleConfig = TAG_STYLES[finalTagStyle];

    // Process all file regenerations in parallel
    const regeneratePromises = ids.map(async (id, index) => {
      try {
        // Validate ID
        if (!id) {
          return {
            success: false,
            id: null,
            error: "File ID is required",
            index: index,
          };
        }

        // Get file info and verify ownership
        const { data: existingFile, error: fetchError } = await supabase
          .from("uploaded_files")
          .select("id, filename, public_url, mime_type, user_id")
          .eq("id", id)
          .eq("user_id", userId) // ⭐ Verify ownership
          .single();

        if (fetchError || !existingFile) {
          return {
            success: false,
            id: id,
            error: "File not found or access denied",
            index: index,
          };
        }

        // Check if it's an image
        if (!existingFile.mime_type?.startsWith("image/")) {
          return {
            success: false,
            id: id,
            error: "Only images can be analyzed",
            index: index,
          };
        }

        // Check if public_url exists
        if (!existingFile.public_url) {
          return {
            success: false,
            id: id,
            error: "No public URL available",
            index: index,
          };
        }

        console.log(
          `  🤖 [${index + 1}/${ids.length}] Regenerating: ${
            existingFile.filename
          }`
        );

        // Analyze image with OpenAI Vision
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze this image and provide:
1. A detailed, engaging description of what you see (1-2 sentences)
2. ${styleConfig.instruction}

Format your response as JSON:
{
  "description": "Your description here",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: existingFile.public_url,
                    },
                  },
                ],
              },
            ],
            max_tokens: 500,
          });

          const content = response.choices[0].message.content;

          // Parse JSON response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error("Could not parse AI response");
          }

          const analysisResult = JSON.parse(jsonMatch[0]);

          // Update the file with new AI results
          const { data: updatedFile, error: updateError } = await supabase
            .from("uploaded_files")
            .update({
              description: analysisResult.description,
              tags: analysisResult.tags || [],
              status: "completed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }

          console.log(
            `  ✅ [${index + 1}/${ids.length}] Completed: ${
              existingFile.filename
            }`
          );

          // Format response
          const formattedFile = {
            id: updatedFile.id,
            filename: updatedFile.filename,
            filePath: updatedFile.file_path,
            fileSize: updatedFile.file_size,
            mimeType: updatedFile.mime_type,
            publicUrl: updatedFile.public_url,
            description: updatedFile.description || null,
            tags: updatedFile.tags || [],
            status: updatedFile.status || "completed",
            uploadedAt: updatedFile.uploaded_at,
            updatedAt: updatedFile.updated_at,
            fileSizeMb: updatedFile.file_size
              ? (updatedFile.file_size / (1024 * 1024)).toFixed(2)
              : null,
            hasAiAnalysis: true,
            isImage: updatedFile.mime_type?.startsWith("image/") || false,
          };

          return {
            success: true,
            data: formattedFile,
            index: index,
          };
        } catch (aiError) {
          console.error(
            `  ⚠️  [${index + 1}/${ids.length}] AI analysis failed for ${
              existingFile.filename
            }:`,
            aiError.message
          );

          // Update status to failed
          await supabase
            .from("uploaded_files")
            .update({
              status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);

          return {
            success: false,
            id: id,
            error: `AI analysis failed: ${aiError.message}`,
            index: index,
          };
        }
      } catch (error) {
        console.error(`Error regenerating file at index ${index}:`, error);
        return {
          success: false,
          id: id || null,
          error: error.message || "Unknown error",
          index: index,
        };
      }
    });

    // Wait for all regenerations to complete
    const results = await Promise.all(regeneratePromises);

    // Separate successes and errors
    const regenerated = results.filter((r) => r.success).map((r) => r.data);
    const errors = results
      .filter((r) => !r.success)
      .map((r) => ({
        id: r.id,
        error: r.error,
        index: r.index,
      }));

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(
      `✅ Bulk regenerate completed: ${regenerated.length}/${ids.length} successful in ${processingTime}s`
    );

    // Determine response status
    if (regenerated.length === ids.length) {
      // All successful
      res.json({
        success: true,
        message: `All ${ids.length} files regenerated successfully`,
        data: {
          regenerated: regenerated,
          totalRegenerated: regenerated.length,
          totalRequested: ids.length,
          tagStyle: finalTagStyle,
          processingTimeSeconds: parseFloat(processingTime),
        },
      });
    } else if (regenerated.length > 0) {
      // Partial success
      res.status(207).json({
        // 207 Multi-Status
        success: true,
        message: `${regenerated.length} of ${ids.length} files regenerated successfully`,
        data: {
          regenerated: regenerated,
          errors: errors,
          totalRegenerated: regenerated.length,
          totalFailed: errors.length,
          totalRequested: ids.length,
          tagStyle: finalTagStyle,
          processingTimeSeconds: parseFloat(processingTime),
        },
      });
    } else {
      // All failed
      res.status(400).json({
        success: false,
        message: "All file regenerations failed",
        data: {
          errors: errors,
          totalFailed: errors.length,
          totalRequested: ids.length,
          processingTimeSeconds: parseFloat(processingTime),
        },
      });
    }
  } catch (error) {
    console.error("Bulk regenerate error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process bulk regenerate",
      details: error.message,
    });
  }
});

// POST route to regenerate AI analysis for a file
router.post("/:id/regenerate", async (req, res) => {
  try {
    const { id } = req.params;
    const { tagStyle = "neutral" } = req.body; // Get tag style from request body
    const userId = req.user.id;
    const userToken = req.token;
    const supabase = getSupabaseClient(userToken);

    console.log(
      `🔄 User ${req.user.email} attempting to regenerate analysis for file ID: ${id} with style: ${tagStyle}`
    );

    // First, verify the file exists and user owns it
    const { data: existingFile, error: fetchError } = await supabase
      .from("uploaded_files")
      .select("id, filename, public_url, mime_type, user_id")
      .eq("id", id)
      .eq("user_id", userId) // ⭐ Verify ownership
      .single();

    if (fetchError || !existingFile) {
      return res.status(404).json({
        success: false,
        error: "File not found or access denied",
      });
    }

    // Check if it's an image
    if (!existingFile.mime_type?.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        error: "Only images can be analyzed",
        message: "AI analysis is only available for image files",
      });
    }

    // Check if public_url exists
    if (!existingFile.public_url) {
      return res.status(400).json({
        success: false,
        error: "No public URL available",
        message: "Cannot analyze file without a public URL",
      });
    }

    console.log(`🤖 Regenerating AI analysis for: ${existingFile.filename}`);

    // Import the analyzeImageWithAI function from upload route
    // For now, we'll duplicate the OpenAI call here
    try {
      const OpenAI = require("openai");
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Tag style prompts (same as in upload.js)
      const TAG_STYLES = {
        neutral: {
          name: "Neutral",
          instruction:
            "Exactly 5 relevant, descriptive tags/keywords (single words or short phrases, professional and clear)",
        },
        playful: {
          name: "Playful",
          instruction:
            "Exactly 5 fun, creative, engaging tags/keywords (can be playful phrases, trending terms, or expressive words)",
        },
        seo: {
          name: "SEO",
          instruction:
            "Exactly 5 highly searchable SEO tags/keywords (focus on popular search terms, specific descriptors, and discoverability)",
        },
      };

      // Validate tag style
      const validStyles = ["neutral", "playful", "seo"];
      const finalTagStyle = validStyles.includes(tagStyle)
        ? tagStyle
        : "neutral";
      const styleConfig = TAG_STYLES[finalTagStyle];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and provide:
1. A detailed, engaging description of what you see (1-2 sentences)
2. ${styleConfig.instruction}

Format your response as JSON:
{
  "description": "Your description here",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`,
              },
              {
                type: "image_url",
                image_url: {
                  url: existingFile.public_url,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      const content = response.choices[0].message.content;

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse AI response");
      }

      const analysisResult = JSON.parse(jsonMatch[0]);

      // Update the file with new AI results
      const { data: updatedFile, error: updateError } = await supabase
        .from("uploaded_files")
        .update({
          description: analysisResult.description,
          tags: analysisResult.tags || [],
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      console.log(
        `✅ AI analysis regenerated successfully: ${existingFile.filename}`
      );

      // Format response
      const formattedFile = {
        id: updatedFile.id,
        filename: updatedFile.filename,
        file_path: updatedFile.file_path,
        file_size: updatedFile.file_size,
        mime_type: updatedFile.mime_type,
        public_url: updatedFile.public_url,
        description: updatedFile.description || null,
        tags: updatedFile.tags || [],
        status: updatedFile.status || "completed",
        uploaded_at: updatedFile.uploaded_at,
        updated_at: updatedFile.updated_at,
        file_size_mb: updatedFile.file_size
          ? (updatedFile.file_size / (1024 * 1024)).toFixed(2)
          : null,
        has_ai_analysis: true,
        is_image: updatedFile.mime_type?.startsWith("image/") || false,
      };

      res.json({
        success: true,
        message: "AI analysis regenerated successfully",
        data: formattedFile,
      });
    } catch (aiError) {
      console.error("OpenAI analysis error:", aiError);

      // Update status to failed
      await supabase
        .from("uploaded_files")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      return res.status(500).json({
        success: false,
        error: "AI analysis failed",
        details: aiError.message,
        message:
          "Failed to regenerate AI analysis. Please try again or check if OpenAI API key is valid.",
      });
    }
  } catch (error) {
    console.error("Regenerate analysis error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to regenerate analysis",
      details: error.message,
    });
  }
});

// PATCH route to update file metadata (filename, tags, and description)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { filename, description, tags } = req.body;
    const userId = req.user.id;
    const userToken = req.token;
    const supabase = getSupabaseClient(userToken);

    console.log(
      `✏️  User ${req.user.email} attempting to update file ID: ${id}`
    );

    // Validate input
    if (
      filename === undefined &&
      description === undefined &&
      tags === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: "No updates provided",
        message:
          "Please provide at least one field to update: filename, description, or tags",
      });
    }

    // Validate filename if provided
    if (filename !== undefined) {
      if (typeof filename !== "string" || filename.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Invalid filename format",
          message: "Filename must be a non-empty string",
        });
      }

      if (filename.length > 255) {
        return res.status(400).json({
          success: false,
          error: "Filename too long",
          message: "Filename must not exceed 255 characters",
        });
      }
    }

    // Validate tags if provided
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return res.status(400).json({
          success: false,
          error: "Invalid tags format",
          message: "Tags must be an array of strings",
        });
      }

      // Validate each tag
      if (tags.some((tag) => typeof tag !== "string" || tag.trim() === "")) {
        return res.status(400).json({
          success: false,
          error: "Invalid tags",
          message: "All tags must be non-empty strings",
        });
      }

      // Limit number of tags
      if (tags.length > 10) {
        return res.status(400).json({
          success: false,
          error: "Too many tags",
          message: "Maximum 10 tags allowed",
        });
      }
    }

    // Validate description if provided
    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid description format",
        message: "Description must be a string",
      });
    }

    // First, verify the file exists and user owns it
    const { data: existingFile, error: fetchError } = await supabase
      .from("uploaded_files")
      .select("id, filename, user_id")
      .eq("id", id)
      .eq("user_id", userId) // ⭐ Verify ownership
      .single();

    if (fetchError || !existingFile) {
      return res.status(404).json({
        success: false,
        error: "File not found or access denied",
      });
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (filename !== undefined) {
      updateData.filename = filename.trim();
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (tags !== undefined) {
      // Trim and filter empty tags
      updateData.tags = tags.map((tag) => tag.trim()).filter((tag) => tag);
    }

    // Update the file
    const { data: updatedFile, error: updateError } = await supabase
      .from("uploaded_files")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log(
      `✅ File metadata updated successfully: ${existingFile.filename}`
    );

    // Format response
    const formattedFile = {
      id: updatedFile.id,
      filename: updatedFile.filename,
      file_path: updatedFile.file_path,
      file_size: updatedFile.file_size,
      mime_type: updatedFile.mime_type,
      public_url: updatedFile.public_url,
      description: updatedFile.description || null,
      tags: updatedFile.tags || [],
      status: updatedFile.status || "uploaded",
      uploaded_at: updatedFile.uploaded_at,
      updated_at: updatedFile.updated_at,
      file_size_mb: updatedFile.file_size
        ? (updatedFile.file_size / (1024 * 1024)).toFixed(2)
        : null,
      has_ai_analysis: !!(
        updatedFile.description ||
        (updatedFile.tags && updatedFile.tags.length > 0)
      ),
      is_image: updatedFile.mime_type?.startsWith("image/") || false,
    };

    res.json({
      success: true,
      message: "File metadata updated successfully",
      data: formattedFile,
    });
  } catch (error) {
    console.error("Update file error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update file metadata",
      details: error.message,
    });
  }
});

// PATCH route to bulk update multiple files at once
router.patch("/", async (req, res) => {
  try {
    const { files } = req.body;
    const userId = req.user.id;
    const userToken = req.token;
    const supabase = getSupabaseClient(userToken);

    console.log(`✏️  User ${req.user.email} attempting to bulk update files`);

    // Validate input
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        success: false,
        error: "Invalid request format",
        message: "Request body must contain a 'files' array",
      });
    }

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No files provided",
        message: "Please provide at least one file to update",
      });
    }

    if (files.length > 50) {
      return res.status(400).json({
        success: false,
        error: "Too many files",
        message: "Maximum 50 files can be updated at once",
      });
    }

    console.log(`📦 Processing ${files.length} file updates in parallel...`);
    const startTime = Date.now();

    // Process all file updates in parallel
    const updatePromises = files.map(async (fileUpdate, index) => {
      try {
        const { id, filename, description, tags } = fileUpdate;

        // Validate that ID is provided
        if (!id) {
          return {
            success: false,
            id: null,
            error: "File ID is required",
            index: index,
          };
        }

        // Validate that at least one field to update is provided
        if (
          filename === undefined &&
          description === undefined &&
          tags === undefined
        ) {
          return {
            success: false,
            id: id,
            error: "No updates provided for this file",
            index: index,
          };
        }

        // Validate filename if provided
        if (filename !== undefined) {
          if (typeof filename !== "string" || filename.trim() === "") {
            return {
              success: false,
              id: id,
              error: "Filename must be a non-empty string",
              index: index,
            };
          }
          if (filename.length > 255) {
            return {
              success: false,
              id: id,
              error: "Filename too long (max 255 characters)",
              index: index,
            };
          }
        }

        // Validate description if provided
        if (description !== undefined && typeof description !== "string") {
          return {
            success: false,
            id: id,
            error: "Description must be a string",
            index: index,
          };
        }

        // Validate tags if provided
        if (tags !== undefined) {
          if (!Array.isArray(tags)) {
            return {
              success: false,
              id: id,
              error: "Tags must be an array of strings",
              index: index,
            };
          }

          // Validate each tag
          if (
            tags.some((tag) => typeof tag !== "string" || tag.trim() === "")
          ) {
            return {
              success: false,
              id: id,
              error: "All tags must be non-empty strings",
              index: index,
            };
          }

          // Limit number of tags
          if (tags.length > 10) {
            return {
              success: false,
              id: id,
              error: "Maximum 10 tags allowed",
              index: index,
            };
          }
        }

        // Verify the file exists and user owns it
        const { data: existingFile, error: fetchError } = await supabase
          .from("uploaded_files")
          .select("id, filename, user_id")
          .eq("id", id)
          .eq("user_id", userId) // ⭐ Verify ownership
          .single();

        if (fetchError || !existingFile) {
          return {
            success: false,
            id: id,
            error: "File not found or access denied",
            index: index,
          };
        }

        // Build update object
        const updateData = {
          updated_at: new Date().toISOString(),
        };

        if (filename !== undefined) {
          updateData.filename = filename.trim();
        }

        if (description !== undefined) {
          updateData.description = description;
        }

        if (tags !== undefined) {
          // Trim and filter empty tags
          updateData.tags = tags.map((tag) => tag.trim()).filter((tag) => tag);
        }

        // Update the file
        const { data: updatedFile, error: updateError } = await supabase
          .from("uploaded_files")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (updateError) {
          return {
            success: false,
            id: id,
            error: `Update failed: ${updateError.message}`,
            index: index,
          };
        }

        console.log(
          `  ✅ [${index + 1}/${files.length}] Updated: ${updatedFile.filename}`
        );

        // Format response
        const formattedFile = {
          id: updatedFile.id,
          filename: updatedFile.filename,
          filePath: updatedFile.file_path,
          fileSize: updatedFile.file_size,
          mimeType: updatedFile.mime_type,
          publicUrl: updatedFile.public_url,
          description: updatedFile.description || null,
          tags: updatedFile.tags || [],
          status: updatedFile.status || "uploaded",
          uploadedAt: updatedFile.uploaded_at,
          updatedAt: updatedFile.updated_at,
          fileSizeMb: updatedFile.file_size
            ? (updatedFile.file_size / (1024 * 1024)).toFixed(2)
            : null,
          hasAiAnalysis: !!(
            updatedFile.description ||
            (updatedFile.tags && updatedFile.tags.length > 0)
          ),
          isImage: updatedFile.mime_type?.startsWith("image/") || false,
        };

        return {
          success: true,
          data: formattedFile,
          index: index,
        };
      } catch (error) {
        console.error(`Error updating file at index ${index}:`, error);
        return {
          success: false,
          id: fileUpdate?.id || null,
          error: error.message || "Unknown error",
          index: index,
        };
      }
    });

    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);

    // Separate successes and errors
    const updated = results.filter((r) => r.success).map((r) => r.data);
    const errors = results
      .filter((r) => !r.success)
      .map((r) => ({
        id: r.id,
        error: r.error,
        index: r.index,
      }));

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(
      `✅ Bulk update completed: ${updated.length}/${files.length} successful in ${processingTime}s`
    );

    // Determine response status
    if (updated.length === files.length) {
      // All successful
      res.json({
        success: true,
        message: `All ${files.length} files updated successfully`,
        data: {
          updated: updated,
          totalUpdated: updated.length,
          totalRequested: files.length,
          processingTimeSeconds: parseFloat(processingTime),
        },
      });
    } else if (updated.length > 0) {
      // Partial success
      res.status(207).json({
        // 207 Multi-Status
        success: true,
        message: `${updated.length} of ${files.length} files updated successfully`,
        data: {
          updated: updated,
          errors: errors,
          totalUpdated: updated.length,
          totalFailed: errors.length,
          totalRequested: files.length,
          processingTimeSeconds: parseFloat(processingTime),
        },
      });
    } else {
      // All failed
      res.status(400).json({
        success: false,
        message: "All file updates failed",
        data: {
          errors: errors,
          totalFailed: errors.length,
          totalRequested: files.length,
          processingTimeSeconds: parseFloat(processingTime),
        },
      });
    }
  } catch (error) {
    console.error("Bulk update error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process bulk update",
      details: error.message,
    });
  }
});

// DELETE route to bulk delete multiple files at once
router.delete("/", async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;
    const userToken = req.token;
    const supabase = getSupabaseClient(userToken);

    console.log(`🗑️  User ${req.user.email} attempting to bulk delete files`);

    // Validate input
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        error: "Invalid request format",
        message: "Request body must contain an 'ids' array",
      });
    }

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No files provided",
        message: "Please provide at least one file ID to delete",
      });
    }

    if (ids.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Too many files",
        message: "Maximum 100 files can be deleted at once",
      });
    }

    console.log(`🗑️  Processing ${ids.length} file deletions in parallel...`);
    const startTime = Date.now();

    // Process all file deletions in parallel
    const deletePromises = ids.map(async (id, index) => {
      try {
        // Validate ID
        if (!id) {
          return {
            success: false,
            id: null,
            error: "File ID is required",
            index: index,
          };
        }

        // Get file info and verify ownership
        const { data: fileData, error: fetchError } = await supabase
          .from("uploaded_files")
          .select("id, file_path, filename, mime_type, user_id")
          .eq("id", id)
          .eq("user_id", userId) // ⭐ Verify ownership
          .single();

        if (fetchError || !fileData) {
          return {
            success: false,
            id: id,
            error: "File not found or access denied",
            index: index,
          };
        }

        // Delete from Supabase Storage
        let storageDeleted = false;
        try {
          const { error: storageError } = await supabase.storage
            .from("uploads")
            .remove([fileData.file_path]);

          storageDeleted = !storageError;

          if (storageError) {
            console.warn(
              `  ⚠️  Storage delete failed for ${fileData.filename}:`,
              storageError.message
            );
            // Continue with database deletion even if storage fails
          }
        } catch (storageError) {
          console.warn(
            `  ⚠️  Storage delete error for ${fileData.filename}:`,
            storageError
          );
        }

        // Delete from database
        const { error: dbError } = await supabase
          .from("uploaded_files")
          .delete()
          .eq("id", id);

        if (dbError) {
          return {
            success: false,
            id: id,
            error: `Database deletion failed: ${dbError.message}`,
            index: index,
          };
        }

        console.log(
          `  ✅ [${index + 1}/${ids.length}] Deleted: ${fileData.filename}`
        );

        return {
          success: true,
          data: {
            id: fileData.id,
            filename: fileData.filename,
            mimeType: fileData.mime_type,
            storageDeleted: storageDeleted,
            databaseDeleted: true,
          },
          index: index,
        };
      } catch (error) {
        console.error(`Error deleting file at index ${index}:`, error);
        return {
          success: false,
          id: id || null,
          error: error.message || "Unknown error",
          index: index,
        };
      }
    });

    // Wait for all deletions to complete
    const results = await Promise.all(deletePromises);

    // Separate successes and errors
    const deleted = results.filter((r) => r.success).map((r) => r.data);
    const errors = results
      .filter((r) => !r.success)
      .map((r) => ({
        id: r.id,
        error: r.error,
        index: r.index,
      }));

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(
      `✅ Bulk delete completed: ${deleted.length}/${ids.length} successful in ${processingTime}s`
    );

    // Determine response status
    if (deleted.length === ids.length) {
      // All successful
      res.json({
        success: true,
        message: `All ${ids.length} files deleted successfully`,
        data: {
          deleted: deleted,
          totalDeleted: deleted.length,
          totalRequested: ids.length,
          processingTimeSeconds: parseFloat(processingTime),
        },
      });
    } else if (deleted.length > 0) {
      // Partial success
      res.status(207).json({
        // 207 Multi-Status
        success: true,
        message: `${deleted.length} of ${ids.length} files deleted successfully`,
        data: {
          deleted: deleted,
          errors: errors,
          totalDeleted: deleted.length,
          totalFailed: errors.length,
          totalRequested: ids.length,
          processingTimeSeconds: parseFloat(processingTime),
        },
      });
    } else {
      // All failed
      res.status(400).json({
        success: false,
        message: "All file deletions failed",
        data: {
          errors: errors,
          totalFailed: errors.length,
          totalRequested: ids.length,
          processingTimeSeconds: parseFloat(processingTime),
        },
      });
    }
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process bulk delete",
      details: error.message,
    });
  }
});

// DELETE route to remove a file
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userToken = req.token;
    const supabase = getSupabaseClient(userToken);

    console.log(
      `🗑️  User ${req.user.email} attempting to delete file ID: ${id}`
    );

    // First, get the file info from database and verify ownership
    const { data: fileData, error: fetchError } = await supabase
      .from("uploaded_files")
      .select("file_path, filename, mime_type, user_id")
      .eq("id", id)
      .eq("user_id", userId) // ⭐ Verify ownership
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
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("uploaded_files")
      .delete()
      .eq("id", id);

    if (dbError) {
      throw dbError;
    }

    console.log(`✅ File deleted successfully: ${fileData.filename}`);

    res.json({
      success: true,
      message: "File deleted successfully",
      data: {
        id: id,
        filename: fileData.filename,
        type: fileData.mime_type,
        storage_deleted: !storageError,
        database_deleted: true,
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
