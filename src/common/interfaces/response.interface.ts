export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
    count: number;
    page?: number;
    limit?: number;
    totalPages?: number;
}
