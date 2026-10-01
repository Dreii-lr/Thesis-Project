// src/utils/cloudinaryUpload.ts
import { JSONContent } from '@tiptap/react';

/**
 * 1. Extracts raw bytes (Uint8Array), Blob, and File from a Tiptap Base64 Data URL
 */
export function dataUrlToBytes(dataUrl: string, filename = 'lesson-image.png') {
  const [header, base64Data] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

  // Decode Base64 string into binary string
  const binaryString = window.atob(base64Data);
  const length = binaryString.length;

  // Put raw bytes into a Uint8Array
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create Blob and File from the raw bytes
  const blob = new Blob([bytes], { type: mimeType });
  const file = new File([bytes], filename, { type: mimeType });

  return {
    bytes, // Raw Uint8Array bytes (if your backend needs raw byte array)
    blob,  // Binary Blob
    file,  // File object ready for FormData
    mimeType,
  };
}

/**
 * 2. Uploads the extracted image bytes (Blob/File) to Cloudinary
 */
export async function uploadBytesToCloudinary(fileOrBlob: Blob | File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Missing Cloudinary environment variables');
  }

  const formData = new FormData();
  formData.append('file', fileOrBlob);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Failed to upload image bytes to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url; // Permanent https://res.cloudinary.com/... URL
}

/**
 * 3. Scans Tiptap JSON, extracts bytes from local images, uploads to Cloudinary,
 * and replaces `attrs.src` with the permanent Cloudinary URL.
 */
export async function processTiptapImagesForCloudinary(
  node: JSONContent
): Promise<JSONContent> {
  // Clone node so we don't mutate React state directly
  const updatedNode: JSONContent = { ...node };

  // Check if this node is a Tiptap image containing local Base64 data
  if (
    updatedNode.type === 'image' &&
    typeof updatedNode.attrs?.src === 'string' &&
    updatedNode.attrs.src.startsWith('data:image/')
  ) {
    const altName = updatedNode.attrs.alt || `image-${Date.now()}.png`;

    // Extract the bytes/File from Tiptap's image node
    const { bytes, file } = dataUrlToBytes(updatedNode.attrs.src, altName);
    console.log(`Extracted ${bytes.byteLength} bytes for ${altName}`, bytes);

    // Upload bytes to Cloudinary and replace `src` with the Cloudinary URL
    const cloudinaryUrl = await uploadBytesToCloudinary(file);
    updatedNode.attrs = {
      ...updatedNode.attrs,
      src: cloudinaryUrl,
    };
  }

  // Recursively process child nodes if present
  if (updatedNode.content && Array.isArray(updatedNode.content)) {
    updatedNode.content = await Promise.all(
      updatedNode.content.map((child) => processTiptapImagesForCloudinary(child))
    );
  }

  return updatedNode;
}