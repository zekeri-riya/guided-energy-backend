import Exa from 'exa-js';

interface ExaHighlightOptions {
  numSentences?: number;
  query?: string;
}

interface ExaTextOptions {
  maxCharacters?: number;
  includeHtmlTags?: boolean;
}

interface ExaSearchOptions {
  highlights?: ExaHighlightOptions;
  text?: ExaTextOptions | boolean;
  numResults?: number;
  type?: string;
}

// SDK Response Types
interface ExaSDKResult {
  url: string;
  id: string;
  title: string | null;
  score?: number;
  publishedDate?: string;
  author?: string | null;
  text?: string;
  highlights?: string[];
  highlightScores?: number[];
}

export interface ExaSearchResult {
  url: string;
  id: string;
  title: string | null;
  score: number;
  published_date: string | null;
  author: string | null;
  text: string | null;
  highlights: string[];
  highlight_scores: number[];
}

export interface ExaSearchResponse {
  results: ExaSearchResult[];
}

export interface ExaErrorResponse {
  error: string;
  message: string;
  status: number;
}

export class ExaClient {
  private client: Exa;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.client = new Exa(apiKey);
  }

  private transformSearchResult(result: ExaSDKResult): ExaSearchResult {
    return {
      url: result.url,
      id: result.id,
      title: result.title,
      score: result.score || 0,
      published_date: result.publishedDate || null,
      author: result.author || null,
      text: result.text || null,
      highlights: result.highlights || [],
      highlight_scores: result.highlightScores || []
    };
  }

  async findSimilarAndContents(
    url: string,
    options: {
      highlights?: { num_sentences: number },
      num_results?: number
    } = {}
  ): Promise<ExaSearchResponse> {
    if (!url) {
      throw new Error('URL is required');
    }

    try {
      console.log('Finding similar and contents for:', url);
      console.log('Options:', options);

      const response = await this.client.findSimilarAndContents(url, {
        highlights: options.highlights ? {
          numSentences: options.highlights.num_sentences
        } : undefined,
        numResults: options.num_results,
        text: true
      });

      return {
        results: response.results.map(result => this.transformSearchResult(result))
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          throw new Error('API endpoint not found. Please check the API documentation.');
        } else if (error.message.includes('401')) {
          throw new Error('Invalid API key or unauthorized access.');
        }
      }
      throw error;
    }
  }

  async searchAndContents(
    url: string,
    options: {
      type?: string,
      num_results?: number
    } = {}
  ): Promise<ExaSearchResponse> {
    if (!url) {
      throw new Error('URL is required');
    }

    try {
      const response = await this.client.searchAndContents(url, {
        type: options.type,
        numResults: options.num_results,
        text: true,
        highlights: true
      });

      return {
        results: response.results.map(result => this.transformSearchResult(result))
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          throw new Error('API endpoint not found. Please check the API documentation.');
        } else if (error.message.includes('401')) {
          throw new Error('Invalid API key or unauthorized access.');
        }
      }
      throw error;
    }
  }
}