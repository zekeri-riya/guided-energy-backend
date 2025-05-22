export interface IPaginateOptions {
  sortBy: string;
  populate?: string;
  limit: number;
  page: number;
}

export interface IPaginate {
  paginate: (filter: object, options: IPaginateOptions) => void;
}
