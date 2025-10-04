#!/bin/bash

# Script to create and configure the pixelglow-admin-assets S3 bucket
# Run this script to set up the admin bucket with proper CORS configuration

set -e

BUCKET_NAME="pixelglow-admin-assets"
REGION="us-east-1"

echo "🚀 Creating S3 bucket: $BUCKET_NAME in region: $REGION"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   brew install awscli  # macOS"
    echo "   pip install awscli   # Python"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run: aws configure"
    exit 1
fi

# Create the bucket
echo "📦 Creating bucket..."
if aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --acl private 2>/dev/null; then
    echo "✅ Bucket created successfully"
else
    echo "⚠️  Bucket might already exist, continuing..."
fi

# Create CORS configuration file
echo "📝 Creating CORS configuration..."
cat > /tmp/cors-config.json << 'EOF'
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
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
}
EOF

# Apply CORS configuration
echo "🔧 Applying CORS configuration..."
aws s3api put-bucket-cors \
    --bucket "$BUCKET_NAME" \
    --cors-configuration file:///tmp/cors-config.json

echo "✅ CORS configuration applied"

# Create public read policy (optional - uncomment if needed)
echo "📝 Creating bucket policy for public read access..."
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

# Apply bucket policy
echo "🔧 Applying bucket policy..."
aws s3api put-bucket-policy \
    --bucket "$BUCKET_NAME" \
    --policy file:///tmp/bucket-policy.json

echo "✅ Bucket policy applied"

# Disable block public access for the specific bucket
echo "🔓 Configuring public access settings..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
        "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

echo "✅ Public access configured"

# Clean up temporary files
rm -f /tmp/cors-config.json /tmp/bucket-policy.json

# Verify bucket exists
echo "🔍 Verifying bucket configuration..."
if aws s3 ls "s3://$BUCKET_NAME" &> /dev/null; then
    echo "✅ Bucket is accessible"
else
    echo "❌ Bucket verification failed"
    exit 1
fi

echo ""
echo "🎉 SUCCESS! Bucket '$BUCKET_NAME' is ready to use"
echo ""
echo "Next steps:"
echo "1. Update your .env file with:"
echo "   S3_ADMIN_BUCKET=pixelglow-admin-assets"
echo "   NEXT_PUBLIC_S3_ADMIN_BUCKET=pixelglow-admin-assets"
echo ""
echo "2. Restart your dev server: npm run dev"
echo ""
