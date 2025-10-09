type SeedModel = {
  slug: string;
  displayName: string;
  family: string;
  modalities: string[];
  supportsStream: boolean;
  pricing: Record<string, unknown>;
  rateLimit: Record<string, unknown>;
  tags: string[];
  sort: number;
};

export type SeedProvider = {
  slug: string;
  name: string;
  baseURL: string;
  apiKey?: string;
  extraHeaders?: Record<string, string>;
  models: SeedModel[];
};

export const seedProviders: SeedProvider[] = [
  {
    slug: "mock-openai",
    name: "Mock OpenAI Provider",
    baseURL: "https://mock.aigc.studio/api",
    apiKey: "mock-openai-key",
    extraHeaders: {
      "x-mock-mode": "1"
    },
    models: [
      {
        slug: "gpt-4o-mini",
        displayName: "GPT-4o Mini",
        family: "gpt-4",
        modalities: ["text"],
        supportsStream: true,
        pricing: {
          unit: "token",
          currency: "credit",
          inputPerK: 8,
          outputPerK: 24,
          minimum: 12
        },
        rateLimit: {
          rpm: 40,
          rps: 2
        },
        tags: ["通用对话", "英文", "编码"],
        sort: 10
      },
      {
        slug: "gpt-4o",
        displayName: "GPT-4o",
        family: "gpt-4",
        modalities: ["text", "image"],
        supportsStream: true,
        pricing: {
          unit: "token",
          currency: "credit",
          inputPerK: 15,
          outputPerK: 45,
          minimum: 30
        },
        rateLimit: {
          rpm: 20,
          rps: 1
        },
        tags: ["旗舰", "多模态"],
        sort: 20
      },
      {
        slug: "dall-e-3",
        displayName: "DALL·E 3",
        family: "dall-e",
        modalities: ["image"],
        supportsStream: false,
        pricing: {
          unit: "image",
          currency: "credit",
          base: 60,
          sizeMultipliers: {
            "512x512": 1,
            "1024x1024": 1.6
          }
        },
        rateLimit: {
          rpm: 10
        },
        tags: ["插画", "商业海报", "高清"],
        sort: 40
      }
    ]
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api",
    apiKey: "openrouter-sample-key",
    extraHeaders: {
      "HTTP-Referer": "https://aigc.studio.dev",
      "X-Title": "AIGC Studio"
    },
    models: [
      {
        slug: "deepseek-chat",
        displayName: "DeepSeek Chat",
        family: "deepseek",
        modalities: ["text"],
        supportsStream: true,
        pricing: {
          unit: "token",
          currency: "credit",
          inputPerK: 4,
          outputPerK: 12,
          minimum: 8
        },
        rateLimit: {
          rpm: 60
        },
        tags: ["中文优化", "效率"],
        sort: 30
      },
      {
        slug: "claude-3-sonnet",
        displayName: "Claude 3 Sonnet",
        family: "claude-3",
        modalities: ["text"],
        supportsStream: true,
        pricing: {
          unit: "token",
          currency: "credit",
          inputPerK: 18,
          outputPerK: 54,
          minimum: 36
        },
        rateLimit: {
          rpm: 18
        },
        tags: ["长文本", "中文", "英文"],
        sort: 50
      },
      {
        slug: "sdxl-lightning",
        displayName: "SDXL Lightning",
        family: "stable-diffusion-xl",
        modalities: ["image"],
        supportsStream: false,
        pricing: {
          unit: "image",
          currency: "credit",
          base: 35,
          sizeMultipliers: {
            "512x512": 1,
            "1024x1024": 1.4,
            "1024x1536": 1.8
          }
        },
        rateLimit: {
          rpm: 30
        },
        tags: ["高速", "创意插画"],
        sort: 60
      }
    ]
  }
];
