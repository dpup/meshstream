import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "../components";
import { SITE_TITLE, SITE_DESCRIPTION } from "../lib/config";
import { ExternalLink, Github } from "lucide-react";
import { MqttConnectionInfo } from "../components/MqttConnectionInfo";

export const Route = createFileRoute("/info")({
  component: InfoPage,
});

function InfoPage() {
  return (
    <PageWrapper>
      <div className="max-w-3xl lg:p-12">
        <h1 className="text-2xl font-semibold mb-4 text-neutral-100">{SITE_TITLE}</h1>
        <p className="text-neutral-400 mb-6">{SITE_DESCRIPTION}</p>

        <InfoSection title="About this site">
           <p className="text-neutral-400 mb-4">
            This site provides real-time visualization and monitoring of the Meshtastic network via MQTT. 
            It allows you to view node positions, track message traffic, and monitor the status of devices in the mesh.
          </p>
          
          <div className="flex items-center mb-6">
            <a 
              href="https://meshtastic.org" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-pink-400 hover:text-pink-300 inline-flex items-center transition-colors"
            >
              Learn more about Meshtastic
              <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </div>

          <h3 className="text-lg font-semibold mb-2 text-neutral-100">What is Meshtastic?</h3>
          <p className="text-neutral-400 mb-4">
            Meshtastic is an open source, off-grid, decentralized mesh networking platform that allows 
            for text messaging, GPS location sharing, and data transmission without the need for cellular 
            service or internet access. It uses affordable, low-power radio devices based on LoRa technology.
          </p>
        </InfoSection>
        
        <InfoSection title="MQTT Connection Details">
          <MqttConnectionInfo />
        </InfoSection>
        
        <InfoSection title="Privacy Considerations">
          <p className="text-neutral-400 mb-2">
            Position data shown on this dashboard may have reduced precision for privacy reasons, 
            depending on the configuration of the Meshtastic network and MQTT server.
          </p>
          <p className="text-neutral-400">
            This dashboard only displays information that has been explicitly shared via the 
            Meshtastic mesh network and relayed through an MQTT gateway.
          </p>
        </InfoSection>
        
        <InfoSection title="Source Code & License">
          <div className="flex items-center mb-3">
            <a 
              href="https://github.com/dpup/meshstream" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-pink-400 hover:text-pink-300 inline-flex items-center transition-colors"
            >
              <Github className="mr-2 h-5 w-5" />
              github.com/dpup/meshstream
            </a>
          </div>
          <p className="text-neutral-400">
            Meshstream is open source software licensed under the MIT License. You are free to use,
            modify, and distribute this software according to the terms of the license.
          </p>
        </InfoSection>
      </div>
    </PageWrapper>
  );
}


function InfoSection({ title, children } : { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-700/40 rounded-lg p-6 mb-6 effect-inset">
      <h2 className="text-xl font-semibold mb-3 text-neutral-100">{title}</h2>
      {children}
    </div>
  );
}