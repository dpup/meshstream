#!/bin/bash
set -e

# Load environment variables from .env file
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  # Read .env file line by line to properly handle spaces in values
  while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ || -z $key ]] && continue
    # Remove leading/trailing whitespace
    key=$(echo "$key" | xargs)
    # Remove quotes from the value if present
    value=$(echo "$value" | sed -E 's/^"(.*)"$/\1/' | sed -E "s/^'(.*)'$/\1/")
    # Export the variable preserving spaces in the value
    export "$key=$value"
    echo "$key=$value"
  done < .env
else
  echo "Warning: .env file not found. Using default environment variables."
fi

# AWS ECR repository configuration
if [ -z "${ECR_REPOSITORY}" ]; then
  echo "Error: ECR_REPOSITORY environment variable is not set. Please set it in .env file."
  exit 1
fi

AWS_REGION=${AWS_REGION:-"us-east-1"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo "Error: AWS CLI is not installed. Please install it first."
  exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed. Please install it first."
  exit 1
fi

# Check if Docker Buildx is available
if ! docker buildx version &> /dev/null; then
  echo "Error: Docker Buildx is not available. Please install or enable Docker Buildx."
  exit 1
fi

echo "Building Docker image for Meshstream using buildx (linux/amd64 platform)..."
echo "Generating a unique MQTT client ID if not set..."
# Generate a unique client ID if not already set
if [ -z "${MESHSTREAM_MQTT_CLIENT_ID}" ]; then
  export MESHSTREAM_MQTT_CLIENT_ID="meshstream-aws-$(date +%s)"
  echo "Using generated MQTT client ID: ${MESHSTREAM_MQTT_CLIENT_ID}"
fi

docker buildx build \
  --platform linux/amd64 \
  --build-arg MESHSTREAM_API_BASE_URL="${MESHSTREAM_API_BASE_URL:-}" \
  --build-arg MESHSTREAM_APP_ENV="${MESHSTREAM_APP_ENV:-production}" \
  --build-arg MESHSTREAM_SITE_TITLE="${MESHSTREAM_SITE_TITLE:-Bay Area Mesh}" \
  --build-arg MESHSTREAM_SITE_DESCRIPTION="${MESHSTREAM_SITE_DESCRIPTION:-Meshtastic activity in the Bay Area region, CA.}" \
  --build-arg MESHSTREAM_GOOGLE_MAPS_ID="${MESHSTREAM_GOOGLE_MAPS_ID}" \
  --build-arg MESHSTREAM_GOOGLE_MAPS_API_KEY="${MESHSTREAM_GOOGLE_MAPS_API_KEY}" \
  --load \
  -t meshstream:${IMAGE_TAG} .

echo "Tagging image for ECR repository..."
docker tag meshstream:${IMAGE_TAG} ${ECR_REPOSITORY}:${IMAGE_TAG}

echo "Logging in to AWS ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPOSITORY%/*}

echo "Pushing image to ECR repository..."
docker push ${ECR_REPOSITORY}:${IMAGE_TAG}

echo "Successfully pushed image to ${ECR_REPOSITORY}:${IMAGE_TAG}"