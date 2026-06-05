const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxImageSize = 5 * 1024 * 1024

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
    throw new Error('Image must not exceed 5 MB.')
  }
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

  if (!result.secure_url) {
    throw new Error('Cloudinary did not return an image URL.')
  }

  return result.secure_url
}
