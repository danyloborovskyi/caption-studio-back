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

    if (fileIndex === -1) {
      this.files.push({ filename, status, ...data });
    } else {
      this.files[fileIndex] = {
        ...this.files[fileIndex],
        filename,
        status,
        ...data,
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

  complete(results, errors) {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    this.broadcast({
      type: "complete",
      data: {
        ...this.getState(),
        duration: parseFloat(duration),
        results,
        errors,
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
