// src/types/weather.types.ts
export interface WeatherData {
    city: string;
    temperature: number | null;
    weather_condition: string;
    scraped_at?: string;
  }
  
  export interface City {
    id: number;
    name: string;
    country: string;
    weather_com_code?: string;
    created_at: string;
  }
  
  export interface User {
    id: number;
    email: string;
    password_hash: string;
    name?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface UserFavorite {
    id: number;
    user_id: number;
    city_id: number;
    created_at: string;
  }
  
  export interface WeatherSummary {
    summary: string;
  }
  
  export interface WeatherQuestion {
    question: string;
  }
  
  export interface WeatherAnswer {
    answer: string;
    matchingCities: string[];
  }