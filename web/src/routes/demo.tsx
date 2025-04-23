import { PageWrapper } from "../components/PageWrapper";
import { TextMessagePacket } from "../components/packets/TextMessagePacket";
import { PositionPacket } from "../components/packets/PositionPacket";
import { NodeInfoPacket } from "../components/packets/NodeInfoPacket";
import { TelemetryPacket } from "../components/packets/TelemetryPacket";
import { ErrorPacket } from "../components/packets/ErrorPacket";
import { GenericPacket } from "../components/packets/GenericPacket";

// Import sample data
import textMessageData from "../../fixtures/text_message.json";
import positionData from "../../fixtures/position.json";
import nodeInfoData from "../../fixtures/nodeinfo.json";
import telemetryData from "../../fixtures/telemetry.json";
import decodeErrorData from "../../fixtures/decode_error.json";

export function DemoPage() {
  return (
    <PageWrapper>
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-2 text-neutral-200">
          Packet Card Variations
        </h2>
        <p className="text-neutral-400 mb-4">
          This page shows all the different packet card variations with sample
          data.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h3 className="text-md font-medium mb-4 text-neutral-300">
            Text Message Packet
          </h3>
          <TextMessagePacket packet={textMessageData} />
        </section>

        <section>
          <h3 className="text-md font-medium mb-4 text-neutral-300">
            Position Packet
          </h3>
          <PositionPacket packet={positionData} />
        </section>

        <section>
          <h3 className="text-md font-medium mb-4 text-neutral-300">
            Node Info Packet
          </h3>
          <NodeInfoPacket packet={nodeInfoData} />
        </section>

        <section>
          <h3 className="text-md font-medium mb-4 text-neutral-300">
            Telemetry Packet
          </h3>
          <TelemetryPacket packet={telemetryData} />
        </section>

        <section>
          <h3 className="text-md font-medium mb-4 text-neutral-300">
            Error Packet
          </h3>
          <ErrorPacket packet={decodeErrorData} />
        </section>

        <section>
          <h3 className="text-md font-medium mb-4 text-neutral-300">
            Generic Packet
          </h3>
          <GenericPacket
            packet={{
              ...textMessageData,
              data: {
                ...textMessageData.data,
                portNum: "WAYPOINT_APP",
                textMessage: undefined,
                waypoint: {
                  id: 12345,
                  latitudeI: 373066340,
                  longitudeI: -1220381680,
                  name: "Trailhead",
                  description: "Mountain trail entrance point",
                  icon: 128204,
                },
              },
            }}
          />
        </section>
      </div>
    </PageWrapper>
  );
}
