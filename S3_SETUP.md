# S3 Bucket Setup Guide

## Create the Admin Assets Bucket

### 1. Create Bucket in AWS Console

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/s3/buckets)
2. Click **Create bucket**
3. Enter bucket name: `pixelglow-admin-assets`
4. Select region: `us-east-1` (must match your config)
5. **Uncheck** "Block all public access" (or configure based on your needs)
6. Click **Create bucket**

### 2. Configure CORS

The bucket needs CORS configuration to allow uploads from your admin panel.

1. Go to your bucket → **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)**
3. Click **Edit**
4. Paste this configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3002",
            "http://localhost:3000",
            "https://yourdomain.com"
        ],
        "ExposeHeaders": [
            "ETag",
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

5. Click **Save changes**

### 3. Set Bucket Policy (Optional - for public read access)

If you want preset thumbnails to be publicly accessible:

1. Go to **Permissions** tab
2. Scroll to **Bucket policy**
3. Click **Edit**
4. Paste this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::pixelglow-admin-assets/*"
        }
    ]
}
```

5. Click **Save changes**

## Alternative: Use Existing Bucket

If you prefer to use the existing `pixelglow-user-uploads` bucket for now:

1. Update `/pg-admin/.env`:

```env
S3_ADMIN_BUCKET=pixelglow-user-uploads
NEXT_PUBLIC_S3_ADMIN_BUCKET=pixelglow-user-uploads
```

2. Thumbnails will be stored in `preset-thumbnails/` folder in the user bucket
3. This is fine for development/testing but not recommended for production

## Verify Setup

After creating the bucket and configuring CORS:

1. Restart your dev server: `npm run dev`
2. Try uploading a thumbnail again
3. Check the browser console for any errors
4. Verify the uploaded image appears in S3 bucket

## Troubleshooting

### "Upload failed due to network error"
- Check CORS configuration includes your origin
- Verify bucket exists and name matches exactly
- Check AWS credentials have `s3:PutObject` permission

### "Access Denied"
- Verify IAM user has correct permissions
- Check bucket policy allows uploads
- Ensure AWS credentials in `.env` are correct

### Images not displaying after upload
- Check bucket policy allows public read (`s3:GetObject`)
- Verify the URL format matches bucket region
- Check browser console for CORS errors
