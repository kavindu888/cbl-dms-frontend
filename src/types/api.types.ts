export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
  errors: ApiError[]
}

export interface ApiError {
  field: string
  message: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface PaginationParams {
  page: number
  pageSize: number
  search?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export interface NormalizedAppError {
  name: 'AppError'
  message: string
  statusCode: number
  errors: ApiError[]
}
