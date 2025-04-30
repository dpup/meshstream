.PHONY: build run gen-proto clean tools web-run web-build web-test web-lint

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