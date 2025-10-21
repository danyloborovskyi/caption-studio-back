// In-memory progress tracking for bulk uploads
const progressStore = new Map();

class ProgressTracker {
  constructor(uploadId, totalFiles) {
    this.uploadId = uploadId;
    this.totalFiles = totalFiles;
    this.completed = 0;
    this.failed = 0;
    this.files = [];
    this.clients = [];
    this.startTime = Date.now();
  }

  addClient(res) {
    this.clients.push(res);
    console.log(
      `📡 Client connected to upload ${this.uploadId} (${this.clients.length} total)`
    );

    // Send current state immediately
    this.sendToClient(res, {
      type: "connected",
      data: this.getState(),
    });
  }

  removeClient(res) {
    const index = this.clients.indexOf(res);
    if (index > -1) {
      this.clients.splice(index, 1);
      console.log(
        `📡 Client disconnected from upload ${this.uploadId} (${this.clients.length} remaining)`
      );
    }
  }

  sendToClient(res, data) {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error("Error sending to client:", error);
      this.removeClient(res);
    }
  }

  broadcast(data) {
    this.clients.forEach((client) => this.sendToClient(client, data));
  }

  updateFile(filename, status, data = {}) {
    const fileIndex = this.files.findIndex((f) => f.filename === filename);

    // Format file data in camelCase
    const formattedData = this.formatFileData({ filename, status, ...data });

    if (fileIndex === -1) {
      this.files.push(formattedData);
    } else {
      this.files[fileIndex] = {
        ...this.files[fileIndex],
        ...formattedData,
      };
    }

    if (status === "completed") {
      this.completed++;
    } else if (status === "failed") {
      this.failed++;
    }

    this.broadcast({
      type: "progress",
      data: this.getState(),
    });
  }

  // Format file data to camelCase for frontend
  formatFileData(data) {
    const formatted = {
      filename: data.filename,
      status: data.status,
    };

    // Add optional fields in camelCase
    if (data.id) formatted.id = data.id;
    if (data.size) formatted.size = data.size;
    if (data.type) formatted.mimeType = data.type;
    if (data.path) formatted.filePath = data.path;
    if (data.publicUrl) formatted.publicUrl = data.publicUrl;
    if (data.description) formatted.description = data.description;
    if (data.tags) formatted.tags = data.tags;
    if (data.uploadedAt) formatted.uploadedAt = data.uploadedAt;
    if (data.analyzedAt) formatted.analyzedAt = data.analyzedAt;
    if (data.error) formatted.error = data.error;

    return formatted;
  }

  complete(results, errors) {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    // Format results and errors to camelCase
    const formattedResults = results.map((result) =>
      this.formatResultData(result)
    );
    const formattedErrors = errors.map((error) => ({
      filename: error.filename,
      error: error.error,
    }));

    this.broadcast({
      type: "complete",
      data: {
        ...this.getState(),
        durationSeconds: parseFloat(duration),
        results: formattedResults,
        errors: formattedErrors,
      },
    });

    // Close all connections
    this.clients.forEach((client) => {
      try {
        client.end();
      } catch (error) {
        console.error("Error closing client:", error);
      }
    });

    // Cleanup after 5 seconds
    setTimeout(() => {
      progressStore.delete(this.uploadId);
      console.log(`🗑️  Cleaned up upload ${this.uploadId}`);
    }, 5000);
  }

  // Format result data to camelCase for frontend
  formatResultData(data) {
    return {
      id: data.id,
      filename: data.filename,
      size: data.size,
      mimeType: data.type || data.mimeType,
      filePath: data.path || data.filePath,
      publicUrl: data.publicUrl,
      description: data.description || null,
      tags: data.tags || [],
      status: data.status || "completed",
      uploadedAt: data.uploadedAt,
      analyzedAt: data.analyzedAt,
      hasAiAnalysis: !!(data.description || data.tags?.length > 0),
      isImage:
        data.type?.startsWith("image/") || data.mimeType?.startsWith("image/"),
    };
  }

  getState() {
    return {
      uploadId: this.uploadId,
      total: this.totalFiles,
      completed: this.completed,
      failed: this.failed,
      processing: this.totalFiles - this.completed - this.failed,
      percentage: Math.round(
        ((this.completed + this.failed) / this.totalFiles) * 100
      ),
      files: this.files,
    };
  }
}

// Create or get progress tracker
function createProgressTracker(uploadId, totalFiles) {
  const tracker = new ProgressTracker(uploadId, totalFiles);
  progressStore.set(uploadId, tracker);
  return tracker;
}

function getProgressTracker(uploadId) {
  return progressStore.get(uploadId);
}

module.exports = {
  createProgressTracker,
  getProgressTracker,
};
