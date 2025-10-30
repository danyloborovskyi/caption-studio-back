// Example: routes/upload.js with authentication and user-specific data

const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
const { authenticateUser } = require("../middleware/auth"); // ← Import auth middleware
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

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // Use anon key to respect RLS
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// ==========================================
// PROTECT ALL UPLOAD ROUTES
// ==========================================
// Add this line to require authentication for ALL routes in this file
router.use(authenticateUser);

// POST route to upload a single image with AI analysis
router.post("/image", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;

    // ✅ Get authenticated user ID from the token
    const userId = req.user.id;
    const userEmail = req.user.email;

    console.log(`📤 User ${userEmail} (${userId}) uploading image...`);

    if (!file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    // Validate file type
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed",
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = generateSecureRandomString(8);
    const fileExtension = file.originalname.split(".").pop();
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;

    // Use user-specific folder structure
    const filePath = `images/${userId}/${fileName}`; // ← Organize by user ID

    console.log(`📁 Uploading to: ${filePath}`);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return res.status(500).json({
        success: false,
        error: "Failed to upload image to storage",
        details: uploadError.message,
      });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // ==========================================
    // INSERT FILE RECORD WITH USER_ID
    // ==========================================
    const { data: fileRecord, error: dbError } = await supabase
      .from("uploaded_files")
      .insert([
        {
          filename: fileName,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.mimetype,
          public_url: publicUrl,
          user_id: userId, // ← IMPORTANT: Store user ID
          status: "processing",
          description: null,
          tags: [],
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Clean up uploaded file
      await supabase.storage.from("uploads").remove([filePath]);
      return res.status(500).json({
        success: false,
        error: "Failed to create file record",
        details: dbError.message,
      });
    }

    console.log(`✅ File uploaded: ${fileRecord.id}`);

    // AI Analysis (async - don't wait for it)
    analyzeImageAsync(fileRecord.id, publicUrl, userId);

    // Return immediate response
    res.status(201).json({
      success: true,
      message: "Image uploaded successfully. AI analysis in progress.",
      data: {
        file: {
          id: fileRecord.id,
          filename: fileName,
          url: publicUrl,
          size: file.size,
          mime_type: file.mimetype,
          user_id: userId, // ← Include in response if needed
          status: "processing",
        },
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload image",
      details: error.message,
    });
  }
});

// POST route to upload multiple images (batch)
router.post("/batch", upload.array("images", 3), async (req, res) => {
  try {
    const files = req.files;

    // ✅ Get authenticated user ID
    const userId = req.user.id;
    const userEmail = req.user.email;

    console.log(`📤 User ${userEmail} uploading ${files.length} images...`);

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No image files provided",
      });
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = generateSecureRandomString(8);
        const fileExtension = file.originalname.split(".").pop();
        const fileName = `${timestamp}-${randomString}.${fileExtension}`;

        // User-specific folder
        const filePath = `images/${userId}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: "3600",
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("uploads")
          .getPublicUrl(filePath);

        const publicUrl = publicUrlData.publicUrl;

        // Insert with user_id
        const { data: fileRecord, error: dbError } = await supabase
          .from("uploaded_files")
          .insert([
            {
              filename: fileName,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.mimetype,
              public_url: publicUrl,
              user_id: userId, // ← Store user ID
              status: "processing",
            },
          ])
          .select()
          .single();

        if (dbError) throw dbError;

        uploadedFiles.push({
          id: fileRecord.id,
          filename: fileName,
          url: publicUrl,
          status: "processing",
        });

        // Trigger AI analysis
        analyzeImageAsync(fileRecord.id, publicUrl, userId);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Uploaded ${uploadedFiles.length} of ${files.length} images`,
      data: {
        uploaded: uploadedFiles,
        failed: errors,
        total: files.length,
        successful: uploadedFiles.length,
      },
    });
  } catch (error) {
    console.error("Batch upload error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload images",
      details: error.message,
    });
  }
});

// Helper function for async AI analysis
async function analyzeImageAsync(fileId, imageUrl, userId) {
  try {
    console.log(`🤖 Analyzing image ${fileId} for user ${userId}...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and provide:
1. A detailed description (1 sentence)
2. Exactly 5 relevant tags

Format as JSON:
{"description": "...", "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]}`,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);

      // Update file record with AI results
      // RLS will ensure we can only update files owned by this user
      const { error: updateError } = await supabase
        .from("uploaded_files")
        .update({
          description: analysis.description,
          tags: analysis.tags,
          status: "completed",
        })
        .eq("id", fileId)
        .eq("user_id", userId); // ← Extra safety check

      if (updateError) {
        console.error("Update error:", updateError);
      } else {
        console.log(`✅ AI analysis completed for ${fileId}`);
      }
    }
  } catch (error) {
    console.error("AI analysis error:", error);

    // Mark as failed
    await supabase
      .from("uploaded_files")
      .update({ status: "failed" })
      .eq("id", fileId)
      .eq("user_id", userId);
  }
}

module.exports = router;
