.PHONY: build test run gen-proto clean tools web-run web-build web-test web-lint docker-build docker-run fmt fmt-check

ROOT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

# Build directories
BIN_DIR := bin
TOOLS_DIR := $(BIN_DIR)/tools
WEB_DIR := $(ROOT_DIR)/web
WEB_DIST_DIR := $(ROOT_DIR)/dist/static

# Proto compilation
PROTOC_GEN_GO := $(TOOLS_DIR)/protoc-gen-go
PROTO_FILES := $(shell find $(ROOT_DIR) -name "*.proto" | sed 's|$(ROOT_DIR)/||' )

# Build the application
build:
	mkdir -p dist
	go build -o dist/meshstream

# Test the server
test: vet
	go test ./... -v

# Check Go formatting
fmt:
	gofmt -w $(shell find . -name "*.go" | grep -v "/generated/" | grep -v "/node_modules/")

# Check Go formatting without modifying files (returns non-zero if files need formatting)
fmt-check:
	@echo "Checking Go formatting..."
	@if [ "$$(gofmt -l $$(find . -name "*.go" | grep -v "/generated/" | grep -v "/node_modules/") | wc -l)" -gt 0 ]; then \
		echo "The following files need to be formatted with go fmt:"; \
		gofmt -l $$(find . -name "*.go" | grep -v "/generated/" | grep -v "/node_modules/"); \
		exit 1; \
	else \
		echo "All Go files are properly formatted."; \
	fi

vet:
	go vet ./...

# Run the application with json log formatting
run: build
	@./dist/meshstream --verbose 2>&1 | go tool github.com/dpup/logista

baymesh: build
	@./dist/meshstream --verbose --mqtt-topic-prefix "msh/US/bayarea" 2>&1 | go tool github.com/dpup/logista

# Generate Go code from Protocol Buffers
gen-proto: tools
	@mkdir -p $(ROOT_DIR)/generated
	PATH="$(TOOLS_DIR):$$PATH" protoc \
		-Iproto/ \
		--go_out=generated/ \
		--go_opt=paths=source_relative \
		$(PROTO_FILES)
	@echo "Generated Go code from Protocol Buffers"

# Clean generated files
clean:
	rm -rf dist
	rm -rf $(BIN_DIR)
	find . -name "*.pb.go" -type f -delete

# Install tools needed for development
tools: $(PROTOC_GEN_GO)

$(TOOLS_DIR):
	mkdir -p $(TOOLS_DIR)

# Install the protoc-gen-go tool
$(PROTOC_GEN_GO): $(TOOLS_DIR)
	GOBIN=$(abspath $(TOOLS_DIR)) go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	echo "Installed protoc-gen-go in $(TOOLS_DIR)"
	ls $(TOOLS_DIR)

# Web application commands
# Run the web application in development mode
web-run:
	cd $(WEB_DIR) && pnpm dev

# Build the web application for production
web-build:
	cd $(WEB_DIR) && pnpm build
	mkdir -p $(WEB_DIST_DIR)
	cp -r $(WEB_DIR)/dist/* $(WEB_DIST_DIR)/

# Run tests for the web application
web-test:
	cd $(WEB_DIR) && pnpm test

# Run linting for the web application
web-lint:
	cd $(WEB_DIR) && pnpm lint

# Docker commands

# Build a Docker image
docker-build:
	docker buildx build --load -t meshstream \
		--build-arg MESHSTREAM_API_BASE_URL=$${MESHSTREAM_API_BASE_URL:-} \
		--build-arg MESHSTREAM_APP_ENV=$${MESHSTREAM_APP_ENV:-production} \
		--build-arg MESHSTREAM_SITE_TITLE=$${MESHSTREAM_SITE_TITLE:-Meshstream} \
		--build-arg MESHSTREAM_SITE_DESCRIPTION=$${MESHSTREAM_SITE_DESCRIPTION:-"Meshtastic activity monitoring"} \
		--build-arg MESHSTREAM_GOOGLE_MAPS_ID=$${MESHSTREAM_GOOGLE_MAPS_ID:-4f089fb2d9fbb3db} \
		--build-arg MESHSTREAM_GOOGLE_MAPS_API_KEY=$${MESHSTREAM_GOOGLE_MAPS_API_KEY:-} \
		.

# Run Docker container with environment variables
docker-run: docker-build
	docker run -p 8080:8080 \
		-e MESHSTREAM_MQTT_BROKER=$${MESHSTREAM_MQTT_BROKER:-mqtt.bayme.sh} \
		-e MESHSTREAM_MQTT_USERNAME=$${MESHSTREAM_MQTT_USERNAME:-meshdev} \
		-e MESHSTREAM_MQTT_PASSWORD=$${MESHSTREAM_MQTT_PASSWORD:-large4cats} \
		-e MESHSTREAM_MQTT_TOPIC_PREFIX=$${MESHSTREAM_MQTT_TOPIC_PREFIX:-msh/US/bayarea} \
		-e MESHSTREAM_SERVER_HOST=0.0.0.0 \
		-e MESHSTREAM_SERVER_PORT=$${MESHSTREAM_SERVER_PORT:-8080} \
		-e MESHSTREAM_STATIC_DIR=/app/static \
		-e MESHSTREAM_LOG_LEVEL=$${MESHSTREAM_LOG_LEVEL:-info} \
		-e MESHSTREAM_VERBOSE_LOGGING=$${MESHSTREAM_VERBOSE_LOGGING:-false} \
		-e MESHSTREAM_CACHE_SIZE=$${MESHSTREAM_CACHE_SIZE:-50} \
		meshstream

# Docker compose build and run with .env support
docker-compose-up:
	docker-compose up --build