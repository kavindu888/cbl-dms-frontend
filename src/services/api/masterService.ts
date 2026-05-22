import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  MasterBrandDto,
  MasterCategoryDto,
  MasterProductDto,
  MasterSupplierDto,
  CreateMasterBrandRequest,
  CreateMasterCategoryRequest,
  CreateMasterProductRequest,
  CreateMasterSupplierRequest,
  UpdateMasterBrandRequest,
  UpdateMasterCategoryRequest,
  UpdateMasterProductRequest,
  UpdateMasterSupplierRequest,
} from '@/types'

import axiosInstance from './axiosInstance'

export const masterService = {
  async listSuppliers(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<MasterSupplierDto>>(
      '/master/suppliers',
      { params }
    )
    return response.data
  },

  async getSupplier(id: string) {
    const response = await axiosInstance.get<ApiResponse<MasterSupplierDto>>(
      `/master/suppliers/${id}`
    )
    return response.data.data
  },

  async createSupplier(payload: CreateMasterSupplierRequest) {
    const response = await axiosInstance.post<ApiResponse<MasterSupplierDto>>(
      '/master/suppliers',
      payload
    )
    return response.data.data
  },

  async updateSupplier(id: string, payload: UpdateMasterSupplierRequest) {
    const response = await axiosInstance.put<ApiResponse<MasterSupplierDto>>(
      `/master/suppliers/${id}`,
      payload
    )
    return response.data.data
  },

  async deleteSupplier(id: string) {
    await axiosInstance.delete(`/master/suppliers/${id}`)
  },

  async listProducts(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<MasterProductDto>>(
      '/master/products',
      { params }
    )
    return response.data
  },

  async getProduct(id: string) {
    const response = await axiosInstance.get<ApiResponse<MasterProductDto>>(
      `/master/products/${id}`
    )
    return response.data.data
  },

  async createProduct(payload: CreateMasterProductRequest) {
    const response = await axiosInstance.post<ApiResponse<MasterProductDto>>(
      '/master/products',
      payload
    )
    return response.data.data
  },

  async updateProduct(id: string, payload: UpdateMasterProductRequest) {
    const response = await axiosInstance.put<ApiResponse<MasterProductDto>>(
      `/master/products/${id}`,
      payload
    )
    return response.data.data
  },

  async deleteProduct(id: string) {
    await axiosInstance.delete(`/master/products/${id}`)
  },

  async listCategories(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<MasterCategoryDto>>(
      '/master/categories',
      { params }
    )
    return response.data
  },

  async getCategory(id: string) {
    const response = await axiosInstance.get<ApiResponse<MasterCategoryDto>>(
      `/master/categories/${id}`
    )
    return response.data.data
  },

  async createCategory(payload: CreateMasterCategoryRequest) {
    const response = await axiosInstance.post<ApiResponse<MasterCategoryDto>>(
      '/master/categories',
      payload
    )
    return response.data.data
  },

  async updateCategory(id: string, payload: UpdateMasterCategoryRequest) {
    const response = await axiosInstance.put<ApiResponse<MasterCategoryDto>>(
      `/master/categories/${id}`,
      payload
    )
    return response.data.data
  },

  async deleteCategory(id: string) {
    await axiosInstance.delete(`/master/categories/${id}`)
  },

  async listBrands(params: Partial<PaginationParams> = {}) {
    const response = await axiosInstance.get<PaginatedResponse<MasterBrandDto>>(
      '/master/brands',
      { params }
    )
    return response.data
  },

  async getBrand(id: string) {
    const response = await axiosInstance.get<ApiResponse<MasterBrandDto>>(
      `/master/brands/${id}`
    )
    return response.data.data
  },

  async createBrand(payload: CreateMasterBrandRequest) {
    const response = await axiosInstance.post<ApiResponse<MasterBrandDto>>(
      '/master/brands',
      payload
    )
    return response.data.data
  },

  async updateBrand(id: string, payload: UpdateMasterBrandRequest) {
    const response = await axiosInstance.put<ApiResponse<MasterBrandDto>>(
      `/master/brands/${id}`,
      payload
    )
    return response.data.data
  },

  async deleteBrand(id: string) {
    await axiosInstance.delete(`/master/brands/${id}`)
  },
}
