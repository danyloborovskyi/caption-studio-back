const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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

    // Optional: Save file metadata to database
    const { data: dbData, error: dbError } = await supabase
      .from("uploaded_files") // You'll need to create this table
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

// GET route to retrieve uploaded images
router.get("/images", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("mime_type", "image%") // This might need adjustment based on your needs
      .order("uploaded_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || [],
      count: data ? data.length : 0,
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

module.exports = router;
