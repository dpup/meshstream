// Type definitions for Google Maps JavaScript API
declare namespace google {
  namespace maps {
    class Map {
      constructor(
        mapDiv: Element,
        opts?: MapOptions
      );
    }

    class Marker {
      constructor(opts?: MarkerOptions);
    }

    class Circle {
      constructor(opts?: CircleOptions);
    }

    interface MapOptions {
      center?: { lat: number; lng: number };
      zoom?: number;
      mapTypeId?: string;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      zoomControl?: boolean;
      styles?: Array<any>;
    }

    interface MarkerOptions {
      position?: { lat: number; lng: number };
      map?: Map;
      title?: string;
      icon?: any;
    }

    interface CircleOptions {
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
      map?: Map;
      center?: { lat: number; lng: number };
      radius?: number;
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