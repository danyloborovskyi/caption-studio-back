const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
const { authenticateUser } = require("../middleware/auth");
const router = express.Router();

// Helper function to generate cryptographically secure random strings
function generateSecureRandomString(length = 6) {
  // Generate random bytes and convert to URL-safe base64-like string
  return crypto
    .randomBytes(Math.ceil(length * 0.75))
    .toString("base64")
    .replace(/[+/=]/g, "")
    .substring(0, length);
}

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

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Tag style prompts
const TAG_STYLES = {
  neutral: {
    name: "Neutral",
    instruction:
      "Generate a concise list of 5 neutral tags that accurately describe the content, setting, and main objects in the image. Use short, clear, factual terms.Avoid emotional, opinionated, or marketing words. Example tags: mountain, sunset, lake, reflection, trees, nature, landscape.",
  },
  playful: {
    name: "Playful",
    instruction:
      "Generate 5 playful tags, expressive tags that describe this image with energy or humor. Feel free to include slang or short phrases if appropriate. Combine literal and imaginative tags. Example tags: sunset vibes, wanderlust, weekend chill, good times, nature mood.",
  },
  seo: {
    name: "SEO",
    instruction:
      "Generate 5 SEO-friendly tags for this image. Use specific, searchable keywords and long-tail phrases that people might use to find this image online. Include variations of relevant terms (synonyms, categories, etc.). Avoid hashtags or emojis. Example tags: cozy coffee shop interior, cafe with warm lighting, people drinking coffee, modern cafe design.",
  },
};

// const TAG_STYLES = {
//   neutral: {
//     name: "Neutral",
//     instruction:
//       "Exactly 5 relevant, descriptive tags/keywords (single words or short phrases, professional and clear)",
//   },
//   playful: {
//     name: "Playful",
//     instruction:
//       "Exactly 5 fun, creative, engaging tags/keywords (can be playful phrases, trending terms, or expressive words)",
//   },
//   seo: {
//     name: "SEO",
//     instruction:
//       "Exactly 5 highly searchable SEO tags/keywords (focus on popular search terms, specific descriptors, and discoverability)",
//   },
// };

// Function to analyze image with OpenAI Vision
async function analyzeImageWithAI(imageUrl, tagStyle = "neutral") {
  try {
    // Validate image URL format
    if (!imageUrl || !imageUrl.includes("supabase")) {
      throw new Error("Invalid image URL");
    }

    // Validate tag style
    const validStyles = ["neutral", "playful", "seo"];
    if (!validStyles.includes(tagStyle)) {
      tagStyle = "neutral"; // Default to neutral if invalid style
    }

    const styleConfig = TAG_STYLES[tagStyle];

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
                url: imageUrl,
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
    if (jsonMatch) {
      const analysisResult = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        description: analysisResult.description,
        tags: analysisResult.tags || [],
        tagStyle: tagStyle, // Include the tag style used
      };
    }

    throw new Error("Could not parse AI response");
  } catch (error) {
    console.error("OpenAI Vision error:", error);

    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message?.includes("unsupported image")) {
      errorMessage =
        "Unsupported image format. Please use PNG, JPEG, GIF, or WebP.";
    } else if (error.message?.includes("invalid_image_format")) {
      errorMessage =
        "Invalid image format. Please use PNG, JPEG, GIF, or WebP.";
    }

    return {
      success: false,
      error: errorMessage,
      description: null,
      tags: [],
    };
  }
}

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Security logging function
function logSecurityEvent(event, userId, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(
    JSON.stringify({
      timestamp,
      event,
      userId,
      ...details,
      severity: "security",
    })
  );
}

// Sanitize filename to prevent path traversal
function sanitizeFilename(filename) {
  // Remove any path components
  const basename = filename.replace(/^.*[\\\/]/, "");
  // Remove dangerous characters
  return basename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// File filter for images (OpenAI Vision compatible)
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    // Remove svg as OpenAI doesn't support it
  ];

  // Validate file size (max 10MB)
  if (file.size && file.size > 10 * 1024 * 1024) {
    return cb(new Error("File size exceeds 10MB limit"), false);
  }

  // Sanitize original filename
  file.originalname = sanitizeFilename(file.originalname);

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logSecurityEvent("invalid_file_type", req.user?.id, {
      mimetype: file.mimetype,
      filename: file.originalname,
    });
    cb(
      new Error(
        `Only these image formats are supported: ${allowedMimes.join(", ")}`
      ),
      false
    );
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
  },
  fileFilter: fileFilter,
});

// ==========================================
// PROTECT ALL UPLOAD ROUTES WITH AUTHENTICATION
// ==========================================
router.use(authenticateUser);

// 🔍 DIAGNOSTIC ENDPOINT - Test if token works with Supabase
router.get("/test-auth", async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userToken = req.token;

    console.log("🔍 Testing auth with Supabase...");
    console.log("User ID:", userId);
    console.log(
      "Token preview:",
      userToken ? userToken.substring(0, 50) + "..." : "MISSING"
    );

    // Create client with token
    const supabase = getSupabaseClient(userToken);

    // Try to query auth.users to see if token is recognized
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("Supabase auth.getUser() result:", {
      user: user?.id,
      error: authError?.message,
    });

    // Try a simple database SELECT query
    const { data, error: dbError } = await supabase
      .from("uploaded_files")
      .select("count")
      .limit(1);

    // Try a test INSERT to see if RLS allows it
    const { data: insertData, error: insertError } = await supabase
      .from("uploaded_files")
      .insert([
        {
          filename: "test-diagnostic.jpg",
          file_path: "test/diagnostic.jpg",
          file_size: 1000,
          mime_type: "image/jpeg",
          public_url: "https://test.com/diagnostic.jpg",
          user_id: userId,
          status: "test",
        },
      ])
      .select();

    console.log("Test INSERT result:", {
      success: !insertError,
      error: insertError?.message,
      data: insertData,
    });

    // If insert succeeded, delete the test record
    if (insertData && insertData.length > 0) {
      await supabase.from("uploaded_files").delete().eq("id", insertData[0].id);
      console.log("Test record cleaned up");
    }

    return res.json({
      success: true,
      auth_middleware: {
        user_id: userId,
        email: userEmail,
        token_exists: !!userToken,
      },
      supabase_auth: {
        user_id: user?.id,
        email: user?.email,
        error: authError?.message,
      },
      supabase_db_query: {
        select_query: {
          success: !dbError,
          error: dbError?.message,
        },
        insert_query: {
          success: !insertError,
          error: insertError?.message,
          details: insertError?.details || null,
          hint: insertError?.hint || null,
        },
      },
      diagnostic: {
        token_in_middleware: !!userToken,
        token_recognized_by_supabase: !!user,
        tokens_match: user?.id === userId,
        insert_works: !insertError,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST route for image upload
router.post("/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    // Get authenticated user ID and token
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userToken = req.token;

    // Create user-specific Supabase client
    const supabase = getSupabaseClient(userToken);

    const { originalname, buffer, mimetype, size } = req.file;

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(originalname);

    console.log(`📤 User ${userEmail} (${userId}) uploading image...`);
    logSecurityEvent("file_upload_attempt", userId, {
      filename: sanitizedFilename,
      size,
      mimetype,
    });

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = generateSecureRandomString(8);
    const fileExtension = sanitizedFilename.split(".").pop().toLowerCase();

    // Validate file extension
    const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    if (!allowedExtensions.includes(fileExtension)) {
      logSecurityEvent("invalid_file_extension", userId, {
        extension: fileExtension,
      });
      return res.status(400).json({
        success: false,
        error: "Invalid file extension",
      });
    }

    const fileName = `${timestamp}-${randomString}.${fileExtension}`;

    // User-specific folder structure
    const filePath = `images/${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("uploads") // You'll need to create this bucket in Supabase
      .upload(filePath, buffer, {
        contentType: mimetype,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      logSecurityEvent("file_upload_failed", userId, {
        error: error.message,
        filename: fileName,
      });
      return res.status(500).json({
        success: false,
        error: "Failed to upload image to storage",
        details: error.message,
      });
    }

    logSecurityEvent("file_upload_success", userId, {
      filename: fileName,
      size,
      path: filePath,
    });

    // Get public URL for the uploaded file
    const { data: publicData } = supabase.storage
      .from("uploads")
      .getPublicUrl(filePath);

    // Save file metadata to database with user_id
    const { data: dbData, error: dbError } = await supabase
      .from("uploaded_files")
      .insert([
        {
          filename: originalname,
          file_path: filePath,
          file_size: size,
          mime_type: mimetype,
          public_url: publicData.publicUrl,
          user_id: userId, // Store user ID
          status: "uploaded",
          uploaded_at: new Date().toISOString(),
        },
      ])
      .select();

    if (dbError) {
      console.warn("Database insert warning:", dbError);
      // Continue even if DB insert fails
    }

    res.json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        filename: originalname,
        size: size,
        type: mimetype,
        path: filePath,
        publicUrl: publicData.publicUrl,
        uploadedAt: new Date().toISOString(),
        ...(dbData && dbData.length > 0 && { id: dbData[0].id }),
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process image upload",
      details: error.message,
    });
  }
});

// POST route to analyze an uploaded image with AI
router.post("/analyze/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { tagStyle = "neutral" } = req.body; // Get tag style from request body
    const userId = req.user.id;
    const userToken = req.token;

    // Create user-specific Supabase client
    const supabase = getSupabaseClient(userToken);

    // Get the image record from database (filtered by user)
    const { data: imageRecord, error: fetchError } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId) // Ensure user owns this file
      .single();

    if (fetchError || !imageRecord) {
      return res.status(404).json({
        success: false,
        error: "Image not found or access denied",
        details: fetchError?.message,
      });
    }

    // Analyze image with OpenAI Vision
    const aiResult = await analyzeImageWithAI(imageRecord.public_url, tagStyle);

    if (!aiResult.success) {
      return res.status(500).json({
        success: false,
        error: "AI analysis failed",
        details: aiResult.error,
      });
    }

    // Try to update database with AI results (optional - will work even if columns don't exist)
    const { data: updatedRecord, error: updateError } = await supabase
      .from("uploaded_files")
      .update({
        description: aiResult.description,
        tags: aiResult.tags,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Database update error:", updateError);
      return res.status(500).json({
        success: false,
        error: "Failed to save AI results to database",
        details: updateError.message,
      });
    }

    res.json({
      success: true,
      message: "Image analyzed successfully",
      data: {
        id: updatedRecord.id,
        filename: updatedRecord.filename,
        public_url: updatedRecord.public_url,
        description: updatedRecord.description,
        tags: updatedRecord.tags,
        status: updatedRecord.status,
        uploaded_at: updatedRecord.uploaded_at,
        updated_at: updatedRecord.updated_at,
        analysis: {
          success: true,
          timestamp: updatedRecord.updated_at,
        },
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to analyze image",
      details: error.message,
    });
  }
});

// POST route for upload + immediate AI analysis
router.post("/upload-and-analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    // Get authenticated user ID and token
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userToken = req.token;
    const { tagStyle = "neutral" } = req.body; // Get tag style from request body

    // Create user-specific Supabase client
    const supabase = getSupabaseClient(userToken);

    const { originalname, buffer, mimetype, size } = req.file;

    console.log(`📤 User ${userEmail} uploading and analyzing image...`);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = generateSecureRandomString(8);
    const fileExtension = originalname.split(".").pop();
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;

    // User-specific folder structure
    const filePath = `images/${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(filePath, buffer, {
        contentType: mimetype,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to upload image to storage",
        details: error.message,
      });
    }

    // Get public URL for the uploaded file
    const { data: publicData } = supabase.storage
      .from("uploads")
      .getPublicUrl(filePath);

    // Save basic file metadata to database with initial status and user_id
    const { data: dbData, error: dbError } = await supabase
      .from("uploaded_files")
      .insert([
        {
          filename: originalname,
          file_path: filePath,
          file_size: size,
          mime_type: mimetype,
          public_url: publicData.publicUrl,
          user_id: userId, // Store user ID
          status: "processing",
          uploaded_at: new Date().toISOString(),
        },
      ])
      .select();

    if (dbError) {
      console.error("Database insert error:", dbError);
      return res.status(500).json({
        success: false,
        error: "Failed to save file metadata to database",
        details: dbError.message,
      });
    }

    if (!dbData || dbData.length === 0) {
      console.error("No data returned from database insert");
      return res.status(500).json({
        success: false,
        error: "Failed to save file metadata to database",
        details: "No record created",
      });
    }

    // Analyze image with OpenAI Vision
    const aiResult = await analyzeImageWithAI(publicData.publicUrl, tagStyle);

    // Update database with AI results and final status
    let updateData = {
      updated_at: new Date().toISOString(),
    };

    // Add AI results if successful and columns exist
    if (aiResult.success) {
      // Try to add these fields, but don't fail if columns don't exist
      try {
        await supabase
          .from("uploaded_files")
          .update({
            description: aiResult.description,
            tags: aiResult.tags,
            status: aiResult.success ? "completed" : "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", dbData[0].id);
      } catch (updateError) {
        console.warn(
          "Could not update AI results (columns may not exist):",
          updateError
        );
        // Update just the timestamp if AI columns don't exist
        await supabase
          .from("uploaded_files")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", dbData[0].id);
      }
    }

    res.json({
      success: true,
      message: "Image uploaded and analyzed successfully",
      data: {
        id: dbData[0].id,
        filename: originalname,
        size: size,
        type: mimetype,
        path: filePath,
        publicUrl: publicData.publicUrl,
        description: aiResult.success ? aiResult.description : null,
        tags: aiResult.success ? aiResult.tags : [],
        status: aiResult.success ? "completed" : "failed",
        uploadedAt: dbData[0].uploaded_at || new Date().toISOString(),
        analyzedAt: new Date().toISOString(),
        analysis: {
          success: aiResult.success,
          error: aiResult.success ? null : aiResult.error,
          timestamp: new Date().toISOString(),
        },
        database: {
          saved: true,
          note: "AI results saved (if columns exist)",
        },
      },
    });
  } catch (error) {
    console.error("Upload and analysis error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process image upload and analysis",
      details: error.message,
    });
  }
});

// POST route for bulk upload + AI analysis (up to 10 images, processed in parallel)
router.post(
  "/bulk-upload-and-analyze",
  upload.array("images", 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No image files provided",
          message: "Please upload at least one image file",
        });
      }

      if (req.files.length > 10) {
        return res.status(400).json({
          success: false,
          error: "Maximum 10 images allowed per request",
          message: "You can upload up to 10 images at once",
        });
      }

      // Get authenticated user ID and token
      const userId = req.user.id;
      const userEmail = req.user.email;
      const userToken = req.token;
      const { tagStyle = "neutral" } = req.body; // Get tag style from request body

      // Create user-specific Supabase client
      const supabase = getSupabaseClient(userToken);

      console.log(
        `📤 User ${userEmail} uploading ${req.files.length} images...`
      );

      const results = [];
      const errors = [];

      console.log(`⚡ Processing ${req.files.length} images in parallel...`);
      const startTime = Date.now();

      // Process all images in parallel
      const processingPromises = req.files.map(async (file, i) => {
        const { originalname, buffer, mimetype, size } = file;

        try {
          // Generate unique filename
          const timestamp = Date.now();
          const randomString = generateSecureRandomString(8);
          const fileExtension = originalname.split(".").pop();
          const fileName = `${timestamp}-${randomString}-${i}.${fileExtension}`;

          // User-specific folder structure
          const filePath = `images/${userId}/${fileName}`;

          console.log(
            `  📤 [${i + 1}/${req.files.length}] Uploading ${originalname}...`
          );

          // Upload to Supabase Storage
          const { data, error } = await supabase.storage
            .from("uploads")
            .upload(filePath, buffer, {
              contentType: mimetype,
              cacheControl: "3600",
              upsert: false,
            });

          if (error) {
            throw new Error(`Storage upload failed: ${error.message}`);
          }

          // Get public URL for the uploaded file
          const { data: publicData } = supabase.storage
            .from("uploads")
            .getPublicUrl(filePath);

          console.log(
            `  💾 [${i + 1}/${
              req.files.length
            }] Saving ${originalname} to database...`
          );

          // Save basic file metadata to database with user_id
          const { data: dbData, error: dbError } = await supabase
            .from("uploaded_files")
            .insert([
              {
                filename: originalname,
                file_path: filePath,
                file_size: size,
                mime_type: mimetype,
                public_url: publicData.publicUrl,
                user_id: userId, // Store user ID
                status: "processing",
                uploaded_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (dbError) {
            throw new Error(`Database save failed: ${dbError.message}`);
          }

          console.log(
            `  🤖 [${i + 1}/${
              req.files.length
            }] Analyzing ${originalname} with AI...`
          );

          // Analyze image with OpenAI Vision
          const aiResult = await analyzeImageWithAI(
            publicData.publicUrl,
            tagStyle
          );

          // Update database with AI results
          if (aiResult.success) {
            await supabase
              .from("uploaded_files")
              .update({
                description: aiResult.description,
                tags: aiResult.tags,
                status: "completed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", dbData.id);

            console.log(
              `  ✅ [${i + 1}/${req.files.length}] Completed ${originalname}`
            );
          } else {
            // Update status to failed
            await supabase
              .from("uploaded_files")
              .update({
                status: "failed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", dbData.id);

            console.log(
              `  ⚠️  [${i + 1}/${
                req.files.length
              }] AI analysis failed for ${originalname}`
            );
          }

          // Return successful result
          return {
            success: true,
            data: {
              id: dbData.id,
              filename: originalname,
              size: size,
              mimeType: mimetype,
              filePath: filePath,
              publicUrl: publicData.publicUrl,
              description: aiResult.success ? aiResult.description : null,
              tags: aiResult.success ? aiResult.tags : [],
              status: aiResult.success ? "completed" : "failed",
              uploadedAt: dbData.uploaded_at,
              analyzedAt: new Date().toISOString(),
              hasAiAnalysis: aiResult.success,
              isImage: mimetype.startsWith("image/"),
              analysis: {
                success: aiResult.success,
                error: aiResult.success ? null : aiResult.error,
              },
            },
          };
        } catch (fileError) {
          console.log(
            `  ❌ [${i + 1}/${req.files.length}] Failed ${originalname}: ${
              fileError.message
            }`
          );

          return {
            success: false,
            filename: originalname,
            error: `Processing failed: ${fileError.message}`,
          };
        }
      });

      // Wait for all images to be processed
      const processedResults = await Promise.all(processingPromises);

      // Separate successful uploads from errors
      processedResults.forEach((result) => {
        if (result.success) {
          results.push(result.data);
        } else {
          errors.push({
            filename: result.filename,
            error: result.error,
          });
        }
      });

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `⚡ Completed ${results.length}/${req.files.length} images in ${processingTime}s`
      );

      // Return results
      const response = {
        success: results.length > 0,
        message: `Processed ${results.length} of ${req.files.length} images`,
        data: {
          successfulUploads: results.length,
          totalAttempts: req.files.length,
          processingTimeSeconds: parseFloat(processingTime),
          results: results,
          errors: errors,
        },
      };

      // Return appropriate status code
      if (results.length === 0) {
        return res.status(500).json({
          ...response,
          success: false,
          message: "All uploads failed",
        });
      } else if (errors.length > 0) {
        return res.status(207).json(response); // 207 Multi-Status
      } else {
        return res.status(200).json(response);
      }
    } catch (error) {
      console.error("Bulk upload and analysis error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process bulk upload and analysis",
        details: error.message,
      });
    }
  }
);

// POST route for bulk analysis of existing images
router.post("/bulk-analyze", async (req, res) => {
  try {
    const { ids, tagStyle = "neutral" } = req.body; // Get tag style from request body
    const userId = req.user.id;
    const userToken = req.token;

    // Create user-specific Supabase client
    const supabase = getSupabaseClient(userToken);

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        error: "Array of image IDs is required",
      });
    }

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one image ID is required",
      });
    }

    if (ids.length > 3) {
      return res.status(400).json({
        success: false,
        error: "Maximum 3 images allowed per request",
      });
    }

    const results = [];
    const errors = [];

    // Process each image ID
    for (const id of ids) {
      try {
        // Get the image record from database (filtered by user)
        const { data: imageRecord, error: fetchError } = await supabase
          .from("uploaded_files")
          .select("*")
          .eq("id", id)
          .eq("user_id", userId) // Ensure user owns this file
          .single();

        if (fetchError || !imageRecord) {
          errors.push({
            id: id,
            error: "Image not found or access denied",
          });
          continue;
        }

        // Analyze image with OpenAI Vision
        const aiResult = await analyzeImageWithAI(
          imageRecord.public_url,
          tagStyle
        );

        if (!aiResult.success) {
          errors.push({
            id: id,
            filename: imageRecord.filename,
            error: `AI analysis failed: ${aiResult.error}`,
          });
          continue;
        }

        // Update database with AI results
        try {
          await supabase
            .from("uploaded_files")
            .update({
              description: aiResult.description,
              tags: aiResult.tags,
              status: "completed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        } catch (updateError) {
          console.warn(`Database update failed for ID ${id}:`, updateError);
        }

        // Add successful result
        results.push({
          id: imageRecord.id,
          filename: imageRecord.filename,
          public_url: imageRecord.public_url,
          description: aiResult.description,
          tags: aiResult.tags,
          status: "completed",
          analyzed_at: new Date().toISOString(),
          analysis: {
            success: true,
          },
        });
      } catch (analysisError) {
        errors.push({
          id: id,
          error: `Processing failed: ${analysisError.message}`,
        });
      }
    }

    // Return results
    const response = {
      success: results.length > 0,
      message: `Analyzed ${results.length} of ${ids.length} images`,
      data: {
        successful_analyses: results.length,
        total_attempts: ids.length,
        results: results,
        errors: errors,
      },
    };

    // Return appropriate status code
    if (results.length === 0) {
      return res.status(500).json({
        ...response,
        success: false,
        message: "All analyses failed",
      });
    } else if (errors.length > 0) {
      return res.status(207).json(response); // 207 Multi-Status
    } else {
      return res.status(200).json(response);
    }
  } catch (error) {
    console.error("Bulk analysis error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process bulk analysis",
      details: error.message,
    });
  }
});

module.exports = router;
