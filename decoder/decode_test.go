package decoder

import (
	"encoding/hex"
	"fmt"
	"strings"
	"testing"

	meshtreampb "meshstream/generated/meshstream"
	pb "meshstream/generated/meshtastic"

	"google.golang.org/protobuf/proto"
)

// Simple test method that can be run manually for debugging
func TestManualDecode(t *testing.T) {
	rawHex := "0a400d027b67ad15ffffffff2234084912300a084c6f774d6573682012044c774d7320092a06322e352e31363001380340014d01829c1655f89642b7581c60206831120a4d656469756d536c6f771a09216164363737623032"
	data, err := hex.DecodeString(rawHex)
	if err != nil {
		fmt.Printf("Error decoding hex: %v\n", err)
		return
	}

	// Try decoding as MapReport (should fail based on the issue description)
	fmt.Println("Trying to decode as MapReport...")
	var mapReport pb.MapReport
	err = proto.Unmarshal(data, &mapReport)
	if err != nil {
		fmt.Printf("Failed to unmarshal as MapReport: %v\n", err)
	} else {
		// Use the pointer to avoid copying mutex
		fmt.Printf("Successfully decoded as MapReport: %v\n", mapReport.String())
	}

	// Try decoding as ServiceEnvelope
	fmt.Println("\nTrying to decode as ServiceEnvelope...")
	var serviceEnvelope pb.ServiceEnvelope
	err = proto.Unmarshal(data, &serviceEnvelope)
	if err != nil {
		fmt.Printf("Failed to unmarshal as ServiceEnvelope: %v\n", err)
	} else {
		// Use the pointer to avoid copying mutex
		fmt.Printf("Successfully decoded as ServiceEnvelope: %v\n", serviceEnvelope.String())
	}

	// Try decoding as MeshPacket
	fmt.Println("\nTrying to decode as MeshPacket...")
	var meshPacket pb.MeshPacket
	err = proto.Unmarshal(data, &meshPacket)
	if err != nil {
		fmt.Printf("Failed to unmarshal as MeshPacket: %v\n", err)
	} else {
		// Use the pointer to avoid copying mutex
		fmt.Printf("Successfully decoded as MeshPacket: %v\n", meshPacket.String())
	}
}

func TestDecodeMapReport(t *testing.T) {
	rawHex := "0a400d027b67ad15ffffffff2234084912300a084c6f774d6573682012044c774d7320092a06322e352e31363001380340014d01829c1655f89642b7581c60206831120a4d656469756d536c6f771a09216164363737623032"
	data, err := hex.DecodeString(rawHex)
	if err != nil {
		t.Fatalf("Error decoding hex: %v", err)
	}

	// Try to decode as different message types
	testCases := []struct {
		name       string
		unmarshal  func([]byte, proto.Message) error
		message    proto.Message
		shouldPass bool
	}{
		{
			name:       "MapReport",
			unmarshal:  proto.Unmarshal,
			message:    &pb.MapReport{},
			shouldPass: false, // Expected to fail based on our findings
		},
		{
			name:       "ServiceEnvelope",
			unmarshal:  proto.Unmarshal,
			message:    &pb.ServiceEnvelope{},
			shouldPass: true, // This should work
		},
		{
			name:       "MeshPacket",
			unmarshal:  proto.Unmarshal,
			message:    &pb.MeshPacket{},
			shouldPass: true, // This also works - but with unparsed fields
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.unmarshal(data, tc.message)

			if tc.shouldPass && err != nil {
				t.Errorf("Expected %s to parse successfully, but got error: %v", tc.name, err)
			} else if !tc.shouldPass && err == nil {
				t.Errorf("Expected %s to fail parsing, but it succeeded", tc.name)
			}

			if err == nil {
				// Do some additional validation if needed
				if tc.name == "ServiceEnvelope" {
					envelope := tc.message.(*pb.ServiceEnvelope)
					if envelope.GetPacket() == nil {
						t.Errorf("Expected ServiceEnvelope to have a packet")
					}
					if envelope.GetPacket().GetDecoded() == nil {
						t.Errorf("Expected ServiceEnvelope to have a decoded packet")
					}
					if envelope.GetPacket().GetDecoded().GetPortnum() != pb.PortNum_MAP_REPORT_APP {
						t.Errorf("Expected PortNum to be MAP_REPORT_APP, got %s",
							envelope.GetPacket().GetDecoded().GetPortnum())
					}
				}

				t.Logf("Successfully decoded as %s", tc.name)
			} else {
				t.Logf("Failed to decode as %s: %v", tc.name, err)
			}
		})
	}
}

func TestDecodeMessageWithMapPayload(t *testing.T) {
	// The hex-encoded map format packet
	rawHex := "0a400d027b67ad15ffffffff2234084912300a084c6f774d6573682012044c774d7320092a06322e352e31363001380340014d01829c1655f89642b7581c60206831"
	data, err := hex.DecodeString(rawHex)
	if err != nil {
		t.Fatalf("Error decoding hex: %v", err)
	}

	// Create a topic info structure for a map topic
	topicInfo := &meshtreampb.TopicInfo{
		FullTopic:  "msh/US/bayarea/2/map/LongFast/!1234abcd",
		RegionPath: "US/bayarea",
		Version:    "2",
		Format:     "map",
		Channel:    "LongFast",
		UserId:     "!1234abcd",
	}

	// Call the actual DecodeMessage function we want to test
	decodedData := DecodeMessage(data, topicInfo)

	// Check that the decoding was successful
	if decodedData.DecodeError != "" {
		t.Errorf("Expected successful decoding, but got error: %v", decodedData.DecodeError)
	}

	// Verify the decoded packet has the expected format
	if decodedData.PortNum != pb.PortNum_MAP_REPORT_APP {
		t.Errorf("Expected PortNum to be MAP_REPORT_APP, got %s", decodedData.PortNum)
	}

	// Verify that key metadata was correctly extracted
	if decodedData.From == 0 {
		t.Error("Expected From field to be non-zero")
	}

	// Format the output and check it contains expected components
	formattedOutput := FormatTopicAndPacket(topicInfo, decodedData)

	// Print out the formatted output to debug
	t.Logf("Formatted output: %s", formattedOutput)

	// Just verify the basic information is included
	if !strings.Contains(formattedOutput, "Format: map") {
		t.Error("Expected formatted output to contain 'Format: map'")
	}

	if !strings.Contains(formattedOutput, "Port:") {
		t.Error("Expected formatted output to contain 'Port:' in packet information")
	}

	t.Logf("Successfully decoded MAP format message")
}
