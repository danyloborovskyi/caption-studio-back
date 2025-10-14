const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
const router = express.Router();

// Initialize Supabase client with service key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for bypassing RLS
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to analyze image with OpenAI Vision
async function analyzeImageWithAI(imageUrl) {
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
1. A detailed, engaging description of what you see (2-3 sentences)
2. Exactly 10 relevant tags/keywords (single words or short phrases)

Format your response as JSON:
{
  "description": "Your description here",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]
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
      };
    }

    throw new Error("Could not parse AI response");
  } catch (error) {
    console.error("OpenAI Vision error:", error);
    return {
      success: false,
      error: error.message,
      description: null,
      tags: [],
    };
  }
}

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: fileFilter,
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

    const { originalname, buffer, mimetype, size } = req.file;

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = originalname.split(".").pop();
    const fileName = `image_${timestamp}.${fileExtension}`;
    const filePath = `images/${fileName}`;

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

    // Save file metadata to database using service key (bypasses RLS)
    const { data: dbData, error: dbError } = await supabase
      .from("uploaded_files")
      .insert([
        {
          filename: originalname,
          file_path: filePath,
          file_size: size,
          mime_type: mimetype,
          public_url: publicData.publicUrl,
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

// DELETE route to remove an image
router.delete("/image/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // First, get the file info from database
    const { data: fileData, error: fetchError } = await supabase
      .from("uploaded_files")
      .select("file_path")
      .eq("id", id)
      .single();

    if (fetchError || !fileData) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    // Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("uploads")
      .remove([fileData.file_path]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("uploaded_files")
      .delete()
      .eq("id", id);

    if (dbError) {
      throw dbError;
    }

    res.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete image",
      details: error.message,
    });
  }
});

// POST route to analyze an uploaded image with AI
router.post("/analyze/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Get the image record from database
    const { data: imageRecord, error: fetchError } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !imageRecord) {
      return res.status(404).json({
        success: false,
        error: "Image not found",
        details: fetchError?.message,
      });
    }

    // Analyze image with OpenAI Vision
    const aiResult = await analyzeImageWithAI(imageRecord.public_url);

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

    const { originalname, buffer, mimetype, size } = req.file;

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = originalname.split(".").pop();
    const fileName = `image_${timestamp}.${fileExtension}`;
    const filePath = `images/${fileName}`;

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

    // Save basic file metadata to database with initial status
    const { data: dbData, error: dbError } = await supabase
      .from("uploaded_files")
      .insert([
        {
          filename: originalname,
          file_path: filePath,
          file_size: size,
          mime_type: mimetype,
          public_url: publicData.publicUrl,
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
    const aiResult = await analyzeImageWithAI(publicData.publicUrl);

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

module.exports = router;
