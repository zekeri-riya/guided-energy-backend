import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import config from '../config/config';
import { WeatherData, WeatherSummary, WeatherAnswer } from '../types/weather.types';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';
import logger from '../config/logger';
import { ChatCompletionTool } from 'openai/resources/chat/completions';

dotenv.config();

const weatherAnalysisTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_weather_summary',
      description: 'Generate a natural weather summary from weather data',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Concise, friendly weather summary highlighting key patterns'
          },
          temperatureRange: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' }
            },
            description: 'Temperature range across all cities'
          },
          dominantCondition: {
            type: 'string',
            description: 'Most common weather condition'
          }
        },
        required: ['summary', 'temperatureRange', 'dominantCondition']
      }
    }
  }
];

const weatherQuestionTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'answer_weather_question',
      description: 'Answer weather questions and identify matching cities',
      parameters: {
        type: 'object',
        properties: {
          answer: {
            type: 'string',
            description: 'Helpful answer to the weather question'
          },
          matchingCities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Cities that match the user criteria'
          },
          confidence: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: 'Confidence level in the answer'
          }
        },
        required: ['answer', 'matchingCities', 'confidence']
      }
    }
  }
];

export class LLMService {
  private client: OpenAI | null;

  constructor(apiKey?: string) {
    const key = apiKey || config.openai?.apiKey || process.env.OPENAI_API_KEY;
    
    if (!key) {
      logger.warn('OpenAI API key not provided. LLM features will be disabled.');
      this.client = null;
      return;
    }
    
    this.client = new OpenAI({ apiKey: key });
  }

  private isAvailable(): boolean {
    return this.client !== null;
  }

  async generateWeatherSummary(weatherData: WeatherData[]): Promise<WeatherSummary> {
    if (!this.isAvailable() || !this.client) {
      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'LLM service not available');
    }

    if (weatherData.length === 0) {
      return { summary: 'No weather data available.' };
    }

    const systemMessage = `You are a helpful weather assistant. Generate natural, conversational weather summaries.
    Focus on key patterns, temperature ranges, and general conditions across cities.
    Be concise, friendly, and highlight the most important weather insights.`;

    try {
      const weatherContext = this.formatWeatherData(weatherData);
      
      const prompt = `Analyze this weather data and provide a comprehensive summary:

Weather Data:
${weatherContext}

Generate a natural summary that highlights:
1. Overall weather patterns
2. Temperature ranges
3. Dominant conditions
4. Any notable weather variations`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: weatherAnalysisTools,
        tool_choice: { type: "function", function: { name: "generate_weather_summary" } },
      });

      if (completion.choices[0].message.tool_calls) {
        const toolCall = completion.choices[0].message.tool_calls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'generate_weather_summary') {
          const result = JSON.parse(toolCall.function.arguments);
          
          logger.info('Weather summary generated successfully');
          return { summary: result.summary };
        }
      }

      throw new Error('Failed to generate weather summary');

    } catch (error) {
      logger.error('Error generating weather summary:', error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate weather summary');
    }
  }

  async answerWeatherQuestion(question: string, weatherData: WeatherData[]): Promise<WeatherAnswer> {
    if (!this.isAvailable() || !this.client) {
      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'LLM service not available');
    }

    if (weatherData.length === 0) {
      return {
        answer: 'No weather data available to answer your question.',
        matchingCities: [],
      };
    }

    const systemMessage = `You are a helpful weather assistant. Answer weather questions accurately based on provided data.
    Identify cities that match the user's criteria and provide clear, helpful responses.
    Always specify which cities match when relevant.`;

    try {
      const weatherContext = this.formatWeatherData(weatherData);
      
      const prompt = `Based on this weather data, answer the user's question and identify matching cities:

Weather Data:
${weatherContext}

User Question: ${question}

Provide:
1. A helpful, accurate answer
2. List of cities that match their criteria
3. Your confidence in the answer`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        tools: weatherQuestionTools,
        tool_choice: { type: "function", function: { name: "answer_weather_question" } },
      });

      if (completion.choices[0].message.tool_calls) {
        const toolCall = completion.choices[0].message.tool_calls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'answer_weather_question') {
          const result = JSON.parse(toolCall.function.arguments);
          
          const availableCities = weatherData.map(data => data.city.toLowerCase());
          const validMatchingCities = result.matchingCities.filter((city: string) =>
            availableCities.includes(city.toLowerCase())
          );

          logger.info('Weather question answered successfully');
          return {
            answer: result.answer,
            matchingCities: validMatchingCities,
          };
        }
      }

      throw new Error('Failed to answer weather question');

    } catch (error) {
      logger.error('Error answering weather question:', error);
      
      const matchingCities = this.extractMatchingCities(question, weatherData);
      
      return {
        answer: 'I can help with basic weather information, but had trouble processing your specific question.',
        matchingCities,
      };
    }
  }

  /**
   * Format weather data for consistent prompt input
   */
  private formatWeatherData(weatherData: WeatherData[]): string {
    return weatherData
      .map(data => {
        const temp = data.temperature !== null ? `${data.temperature}°C` : 'unknown temperature';
        return `${data.city}: ${temp}, ${data.weather_condition}`;
      })
      .join('\n');
  }

  /**
   * Fallback method for simple keyword-based city matching
   */
  private extractMatchingCities(question: string, weatherData: WeatherData[]): string[] {
    const questionLower = question.toLowerCase();
    const matchingCities: string[] = [];

    // Simple keyword matching patterns
    const patterns = {
      sunny: ['sunny', 'sun', 'clear', 'bright'],
      rainy: ['rain', 'rainy', 'wet', 'drizzle'],
      cloudy: ['cloudy', 'overcast', 'grey', 'gray'],
      warm: ['warm', 'hot', 'high temperature'],
      cold: ['cold', 'cool', 'low temperature', 'chilly']
    };

    for (const data of weatherData) {
      const condition = data.weather_condition.toLowerCase();
      
      // Check condition keywords
      if (this.matchesKeywords(questionLower, patterns.sunny) && 
          this.matchesKeywords(condition, patterns.sunny)) {
        matchingCities.push(data.city);
      } else if (this.matchesKeywords(questionLower, patterns.rainy) && 
                this.matchesKeywords(condition, patterns.rainy)) {
        matchingCities.push(data.city);
      } else if (this.matchesKeywords(questionLower, patterns.cloudy) && 
                this.matchesKeywords(condition, patterns.cloudy)) {
        matchingCities.push(data.city);
      }
      
      // Check temperature-based keywords
      if (data.temperature !== null) {
        if (this.matchesKeywords(questionLower, patterns.warm) && data.temperature > 20) {
          matchingCities.push(data.city);
        } else if (this.matchesKeywords(questionLower, patterns.cold) && data.temperature < 10) {
          matchingCities.push(data.city);
        }
      }
    }

    return [...new Set(matchingCities)]; // Remove duplicates
  }

  /**
   * Helper method to check if text matches any keywords
   */
  private matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }
}

// Export singleton instance following the original pattern
export default new LLMService();