/**
 * AI Service Interface
 * Defines contract for AI implementations (OpenAI, Anthropic, etc.)
 */

class IAIService {
  /**
   * Analyze an image and generate description and tags
   * @param {string} imageUrl - URL of the image to analyze
   * @param {string} tagStyle - Style of tags (neutral, playful, seo)
   * @returns {Promise<{success: boolean, description: string, tags: string[], error?: string}>}
   */
  async analyzeImage(imageUrl, tagStyle = "neutral") {
    throw new Error("Method not implemented");
  }

  /**
   * Generate tags for an image
   * @param {string} imageUrl - URL of the image
   * @param {string} tagStyle - Style of tags
   * @returns {Promise<{success: boolean, tags: string[], error?: string}>}
   */
  async generateTags(imageUrl, tagStyle = "neutral") {
    throw new Error("Method not implemented");
  }

  /**
   * Generate description for an image
   * @param {string} imageUrl - URL of the image
   * @returns {Promise<{success: boolean, description: string, error?: string}>}
   */
  async generateDescription(imageUrl) {
    throw new Error("Method not implemented");
  }
}

module.exports = IAIService;
