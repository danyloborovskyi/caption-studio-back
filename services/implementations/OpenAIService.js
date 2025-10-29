/**
 * OpenAI Service Implementation
 * Implements IAIService interface for OpenAI Vision
 */

const OpenAI = require("openai");
const IAIService = require("../interfaces/IAIService");

const TAG_STYLES = {
  neutral: {
    name: "Neutral",
    instruction:
      "Generate a concise list of 5 neutral tags that accurately describe the content, setting, and main objects in the image. Use short, clear, factual terms. Avoid emotional, opinionated, or marketing words. Example tags: mountain, sunset, lake, reflection, trees, nature, landscape.",
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

class OpenAIService extends IAIService {
  constructor(apiKey) {
    super();
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeImage(imageUrl, tagStyle = "neutral") {
    try {
      // Validate image URL
      if (!imageUrl || !imageUrl.includes("supabase")) {
        throw new Error("Invalid image URL");
      }

      // Validate tag style
      const validStyles = ["neutral", "playful", "seo"];
      if (!validStyles.includes(tagStyle)) {
        tagStyle = "neutral";
      }

      const styleConfig = TAG_STYLES[tagStyle];

      const response = await this.openai.chat.completions.create({
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
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          description: result.description,
          tags: result.tags || [],
          tagStyle,
        };
      }

      throw new Error("Could not parse AI response");
    } catch (error) {
      return {
        success: false,
        error: error.message,
        description: null,
        tags: [],
      };
    }
  }

  async generateTags(imageUrl, tagStyle = "neutral") {
    const result = await this.analyzeImage(imageUrl, tagStyle);
    return {
      success: result.success,
      tags: result.tags,
      error: result.error,
    };
  }

  async generateDescription(imageUrl) {
    const result = await this.analyzeImage(imageUrl, "neutral");
    return {
      success: result.success,
      description: result.description,
      error: result.error,
    };
  }
}

module.exports = OpenAIService;
