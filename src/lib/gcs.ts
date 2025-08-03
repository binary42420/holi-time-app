import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  console.warn('GCS_BUCKET_NAME environment variable not set. File uploads will be disabled.');
}

/**
 * Uploads a file buffer to Google Cloud Storage.
 * @param buffer The file buffer to upload.
 * @param destination The destination path in the GCS bucket (e.g., 'timesheets/signed-copy.pdf').
 * @param contentType The MIME type of the file.
 * @returns The public URL of the uploaded file.
 */
export async function uploadToGCS(buffer: Buffer, destination: string, contentType: string): Promise<string> {
  if (!bucketName) {
    throw new Error('Google Cloud Storage bucket name is not configured.');
  }

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destination);

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // Signifies the end of the stream

  return new Promise((resolve, reject) => {
    const writeStream = file.createWriteStream({
      metadata: {
        contentType: contentType,
      },
      resumable: false,
    });

    writeStream.on('error', (err) => {
      console.error(`Error uploading to GCS: ${err.message}`, err);
      reject(err);
    });

    writeStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
      resolve(publicUrl);
    });

    stream.pipe(writeStream);
  });
}