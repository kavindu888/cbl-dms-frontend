export interface MasterSupplierContactDto {
  name: string
  designation: string
  mobileNo: string
  email: string
  isActive: boolean
}

export interface MasterSupplierDto {
  id: string
  code: string
  name: string
  phone: string
  email: string
  address: string
  vatRegNo?: string
  fax?: string
  businessRegNo?: string
  isActive: boolean
  contactName?: string
  contacts?: MasterSupplierContactDto[]
}

export interface MasterBrandDto {
  id: string
  code: string
  name: string
  isActive: boolean
  productCount?: number
}

export interface MasterCategoryDto {
  id: string
  code: string
  name: string
  parentCategoryId: string | null
  parentCategoryName?: string | null
  isActive: boolean
  itemCount?: number
}

export interface MasterProductConversionDto {
  fromUom: string
  toUom: string
  factor: number
}

export interface MasterProductDto {
  id: string
  sku: string
  barcode: string
  name: string
  categoryId: string
  categoryName?: string
  brandId?: string | null
  brandName?: string | null
  uomBase: string
  unitCost: number
  unitPrice: number
  vatRate: number
  isActive: boolean
  conversions?: MasterProductConversionDto[]
}

export interface CreateMasterSupplierRequest {
  code: string
  name: string
  phone: string
  email: string
  address: string
  vatRegNo?: string
  fax?: string
  businessRegNo?: string
  isActive?: boolean
  contactName?: string
  contacts?: MasterSupplierContactDto[]
}

export interface UpdateMasterSupplierRequest extends CreateMasterSupplierRequest {}

export interface CreateMasterBrandRequest {
  code: string
  name: string
  isActive?: boolean
}

export interface UpdateMasterBrandRequest extends CreateMasterBrandRequest {}

export interface CreateMasterCategoryRequest {
  code: string
  name: string
  parentCategoryId?: string | null
  isActive?: boolean
}

export interface UpdateMasterCategoryRequest extends CreateMasterCategoryRequest {}

export interface CreateMasterProductRequest {
  sku: string
  barcode: string
  name: string
  categoryId: string
  brandId?: string | null
  uomBase: string
  unitCost: number
  unitPrice: number
  vatRate: number
  isActive?: boolean
  conversions?: MasterProductConversionDto[]
}

export interface UpdateMasterProductRequest extends CreateMasterProductRequest {}
