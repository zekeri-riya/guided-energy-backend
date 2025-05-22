  export interface DatabaseUser {
    id: number;
    email: string;
    password_hash: string;
    name?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface DatabaseCity {
    id: number;
    name: string;
    country: string;
    weather_com_code?: string;
    created_at: string;
  }
  
  export interface DatabaseWeatherData {
    id: number;
    city_id: number;
    temperature: number | null;
    weather_condition: string;
    scraped_at: string;
  }
  
  export interface DatabaseUserFavorite {
    id: number;
    user_id: number;
    city_id: number;
    created_at: string;
  }