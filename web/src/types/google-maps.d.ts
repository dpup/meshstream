// Type definitions for Google Maps JavaScript API
declare namespace google {
  namespace maps {
    class Map {
      constructor(
        mapDiv: Element,
        opts?: MapOptions
      );
      setZoom(zoom: number): void;
      getZoom(): number | undefined;
      fitBounds(bounds: LatLngBounds): void;
      addListener(event: string, handler: () => void): MapsEventListener;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(position: LatLngLiteral): void;
      setIcon(icon: any): void;
      addListener(event: string, handler: () => void): MapsEventListener;
    }
    
    namespace marker {
      class AdvancedMarkerElement {
        constructor(opts?: AdvancedMarkerElementOptions);
        position: LatLngLiteral | null;
        map: Map | null;
        title: string | null;
        zIndex: number | null;
        content: HTMLElement | null;
        addListener(event: string, handler: () => void): MapsEventListener;
      }
    }
    
    interface AdvancedMarkerElementOptions {
      position?: LatLngLiteral;
      map?: Map;
      title?: string;
      zIndex?: number;
      content?: HTMLElement;
    }

    class Circle {
      constructor(opts?: CircleOptions);
      setMap(map: Map | null): void;
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      setContent(content: string): void;
      open(map?: Map, anchor?: Marker): void;
      close(): void;
    }

    class LatLngBounds {
      constructor();
      extend(point: LatLngLiteral): void;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface MapOptions {
      center?: LatLngLiteral;
      zoom?: number;
      mapTypeId?: string;
      colorScheme?: string;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      zoomControl?: boolean;
      styles?: Array<any>;
      mapId?: string;
    }

    interface MarkerOptions {
      position?: LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: any;
      zIndex?: number;
    }

    interface CircleOptions {
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
      map?: Map;
      center?: LatLngLiteral;
      radius?: number;
    }

    interface InfoWindowOptions {
      content?: string;
      position?: LatLngLiteral;
    }

    // Event-related functionality
    const event: {
      /**
       * Removes the given listener, which should have been returned by
       * google.maps.event.addListener.
       */
      removeListener(listener: MapsEventListener): void;
      /**
       * Removes all listeners for all events for the given instance.
       */
      clearInstanceListeners(instance: object): void;
    };

    // Maps Event Listener
    interface MapsEventListener {
      /**
       * Removes the listener.
       * Equivalent to calling google.maps.event.removeListener(listener).
       */
      remove(): void;
    }

    const MapTypeId: {
      ROADMAP: string;
      SATELLITE: string;
      HYBRID: string;
      TERRAIN: string;
    };

    const SymbolPath: {
      CIRCLE: number;
      FORWARD_CLOSED_ARROW: number;
      FORWARD_OPEN_ARROW: number;
      BACKWARD_CLOSED_ARROW: number;
      BACKWARD_OPEN_ARROW: number;
    };
  }
}

// Extend the Window interface
interface Window {
  google: typeof google;
}