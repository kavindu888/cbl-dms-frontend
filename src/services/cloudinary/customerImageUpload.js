const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxImageSize = 10 * 1024 * 1024

export function isCloudinaryConfigured() {
  return Boolean(
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  )
}

export function validateCustomerImage(file) {
  if (!file) {
    throw new Error('Please select an image first.')
  }

  if (!allowedImageTypes.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed.')
  }

  if (file.size > maxImageSize) {
    throw new Error('Image must not exceed 10 MB.')
  }
}

export function getCloudinaryImageUrl(imagePath) {
  if (!imagePath) return ''
  if (imagePath.startsWith('http')) return imagePath

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

  if (!cloudName) return imagePath

  return `https://res.cloudinary.com/${cloudName}/${imagePath}`
}

export function getR2ImageUrl(objectKey) {
  if (!objectKey) return ''
  if (objectKey.startsWith('http')) return objectKey

  const baseUrl = import.meta.env.VITE_R2_PUBLIC_BASE_URL
  if (!baseUrl) return objectKey

  return `${baseUrl.replace(/\/$/, '')}/${objectKey}`
}

function getCloudinaryImagePath(uploadResult) {
  const resourceType = uploadResult.resource_type || 'image'
  const deliveryType = uploadResult.type || 'upload'
  const version = uploadResult.version ? `v${uploadResult.version}` : null
  const publicId = uploadResult.public_id
  const format = uploadResult.format

  if (!publicId || !format) {
    throw new Error('Cloudinary did not return an image path.')
  }

  return [resourceType, deliveryType, version, `${publicId}.${format}`].filter(Boolean).join('/')
}

export async function uploadCustomerImageToCloudinary(file) {
  validateCustomerImage(file)

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'cbl/customers')

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Unable to upload image to Cloudinary.')
  }

  const result = await response.json()

  return getCloudinaryImagePath(result)
}
