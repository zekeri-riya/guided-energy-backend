import OpenAI from 'openai';
import config from '../config/config';
import { WeatherData, WeatherSummary, WeatherAnswer } from '../types/weather.types';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';
import logger from '../config/logger';

class LLMService {
  private openai: OpenAI | null;

  constructor() {
    if (!config.openai.apiKey) {
      logger.warn('OpenAI API key not provided. LLM features will be disabled.');
      this.openai = null;
      return;
    }

    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  private isAvailable(): boolean {
    return this.openai !== null;
  }

  async generateWeatherSummary(weatherData: WeatherData[]): Promise<WeatherSummary> {
    if (!this.isAvailable() || !this.openai) {
      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'LLM service not available');
    }

    if (weatherData.length === 0) {
      return { summary: 'No weather data available.' };
    }

    try {
      const weatherText = weatherData
        .map(data => {
          const temp = data.temperature !== null ? `${data.temperature}°C` : 'unknown temperature';
          return `${data.city}: ${temp}, ${data.weather_condition}`;
        })
        .join('; ');

      const prompt = `Summarize the following weather data in a natural, conversational way. Be concise and friendly:

${weatherText}

Provide a brief summary that highlights the key weather patterns across these cities.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful weather assistant. Provide concise, natural summaries of weather conditions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const summary = completion.choices[0]?.message?.content?.trim();
      
      if (!summary) {
        throw new Error('No summary generated');
      }

      logger.info('Weather summary generated successfully');
      return { summary };
    } catch (error) {
      logger.error('Error generating weather summary:', error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate weather summary');
    }
  }

  async answerWeatherQuestion(question: string, weatherData: WeatherData[]): Promise<WeatherAnswer> {
    if (!this.isAvailable() || !this.openai) {
      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'LLM service not available');
    }

    if (weatherData.length === 0) {
      return {
        answer: 'No weather data available to answer your question.',
        matchingCities: [],
      };
    }

    try {
      const weatherText = weatherData
        .map(data => {
          const temp = data.temperature !== null ? `${data.temperature}°C` : 'unknown temperature';
          return `${data.city}: ${temp}, ${data.weather_condition}`;
        })
        .join('\n');

      const prompt = `Based on the following weather data, answer the user's question and identify which cities match their criteria.

Weather Data:
${weatherText}

User Question: ${question}

Please provide:
1. A helpful answer to their question
2. A list of city names that match their criteria (if any)

Format your response as JSON with "answer" and "matchingCities" fields. The matchingCities should be an array of city names.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful weather assistant. Answer questions about weather data and identify matching cities. Always respond with valid JSON containing "answer" and "matchingCities" fields.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content?.trim();
      
      if (!responseText) {
        throw new Error('No response generated');
      }

      try {
        const parsed = JSON.parse(responseText);
        
        // Validate the response structure
        if (!parsed.answer || !Array.isArray(parsed.matchingCities)) {
          throw new Error('Invalid response structure');
        }

        // Ensure matching cities exist in our data
        const availableCities = weatherData.map(data => data.city.toLowerCase());
        const validMatchingCities = parsed.matchingCities.filter((city: string) =>
          availableCities.includes(city.toLowerCase())
        );

        logger.info('Weather question answered successfully');
        return {
          answer: parsed.answer,
          matchingCities: validMatchingCities,
        };
      } catch (parseError) {
        logger.warn('Failed to parse JSON response, extracting answer manually');
        
        // Fallback: Extract answer manually and guess matching cities
        const matchingCities = this.extractMatchingCities(question, weatherData);
        
        return {
          answer: responseText,
          matchingCities,
        };
      }
    } catch (error) {
      logger.error('Error answering weather question:', error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to answer weather question');
    }
  }

  private extractMatchingCities(question: string, weatherData: WeatherData[]): string[] {
    const questionLower = question.toLowerCase();
    const matchingCities: string[] = [];

    // Simple keyword matching for common weather questions
    const sunnyKeywords = ['sunny', 'sun', 'clear', 'bright'];
    const rainyKeywords = ['rain', 'rainy', 'wet', 'drizzle'];
    const cloudyKeywords = ['cloudy', 'overcast', 'grey', 'gray'];
    const warmKeywords = ['warm', 'hot', 'high temperature'];
    const coldKeywords = ['cold', 'cool', 'low temperature', 'chilly'];

    for (const data of weatherData) {
      const condition = data.weather_condition.toLowerCase();
      
      if (sunnyKeywords.some(keyword => questionLower.includes(keyword)) &&
          sunnyKeywords.some(keyword => condition.includes(keyword))) {
        matchingCities.push(data.city);
      } else if (rainyKeywords.some(keyword => questionLower.includes(keyword)) &&
                rainyKeywords.some(keyword => condition.includes(keyword))) {
        matchingCities.push(data.city);
      } else if (cloudyKeywords.some(keyword => questionLower.includes(keyword)) &&
                cloudyKeywords.some(keyword => condition.includes(keyword))) {
        matchingCities.push(data.city);
      } else if (warmKeywords.some(keyword => questionLower.includes(keyword)) &&
                data.temperature !== null && data.temperature > 20) {
        matchingCities.push(data.city);
      } else if (coldKeywords.some(keyword => questionLower.includes(keyword)) &&
                data.temperature !== null && data.temperature < 10) {
        matchingCities.push(data.city);
      }
    }

    return matchingCities;
  }
}

export default new LLMService();