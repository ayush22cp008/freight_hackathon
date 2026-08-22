export async function uploadPhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('photo', file);

  const res = await fetch('/api/upload-photo', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload photo');
  }

  const data = await res.json();
  return data.url;
}
