.PHONY: build run gen-proto clean tools

# Build directories
BIN_DIR := bin
TOOLS_DIR := $(BIN_DIR)/tools

# Tool commands
PROTOC_GEN_GO := $(TOOLS_DIR)/protoc-gen-go

# Build the application
build:
	mkdir -p dist
	go build -o dist/meshstream

# Run the application with json log formatting
run: build
	./dist/meshstream 2>&1 | go tool github.com/dpup/logista

# Generate Go code from Protocol Buffers
gen-proto: tools
	mkdir -p proto/generated
	PATH="$(TOOLS_DIR):$$PATH" protoc \
		-I./proto \
		--go_out=./proto/generated \
		--go_opt=paths=source_relative \
		./proto/meshtastic/*.proto

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