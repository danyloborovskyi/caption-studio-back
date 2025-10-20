// Example: Bulk Upload with Real-time Progress Tracking using SSE

async function bulkUploadWithProgress(files, onProgress, onComplete, onError) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    throw new Error("No authentication token found");
  }

  try {
    // Step 1: Start the upload and get uploadId
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });

    const uploadResponse = await fetch("/api/upload/bulk-upload-and-analyze", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error("Upload failed to start");
    }

    const uploadData = await uploadResponse.json();
    const { uploadId, totalFiles } = uploadData.data;

    console.log(`Upload started: ${uploadId} (${totalFiles} files)`);

    // Step 2: Connect to SSE endpoint for progress updates
    const eventSource = new EventSource(
      `/api/upload/progress/${uploadId}?token=${token}`,
      { withCredentials: true }
    );

    eventSource.onopen = () => {
      console.log("📡 Connected to progress stream");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "connected":
            console.log("Connected, initial state:", data.data);
            if (onProgress) {
              onProgress(data.data);
            }
            break;

          case "progress":
            console.log("Progress update:", data.data);
            if (onProgress) {
              onProgress(data.data);
            }
            break;

          case "complete":
            console.log("Upload complete:", data.data);
            eventSource.close();
            if (onComplete) {
              onComplete(data.data);
            }
            break;

          default:
            console.log("Unknown event type:", data.type);
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      eventSource.close();
      if (onError) {
        onError(error);
      }
    };

    return {
      uploadId,
      eventSource,
      cancel: () => eventSource.close(),
    };
  } catch (error) {
    console.error("Upload error:", error);
    if (onError) {
      onError(error);
    }
    throw error;
  }
}

// Usage Example
/*
const fileInput = document.getElementById('fileInput');
const files = Array.from(fileInput.files);

const upload = await bulkUploadWithProgress(
  files,
  
  // onProgress callback
  (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
    console.log(`Completed: ${progress.completed}/${progress.total}`);
    console.log(`Files:`, progress.files);
    
    // Update UI
    updateProgressBar(progress.percentage);
    updateFilesList(progress.files);
  },
  
  // onComplete callback
  (data) => {
    console.log('All done!');
    console.log(`Duration: ${data.duration}s`);
    console.log('Results:', data.results);
    console.log('Errors:', data.errors);
    
    // Show results
    displayResults(data.results);
  },
  
  // onError callback
  (error) => {
    console.error('Upload failed:', error);
    alert('Upload failed');
  }
);

// Cancel upload if needed
// upload.cancel();
*/

// Export for use in modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { bulkUploadWithProgress };
}
