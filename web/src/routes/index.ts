import { Router, Route, RootRoute } from "@tanstack/react-router";
import Root from "./__root";
import { IndexPage } from "./home";
import { PacketsRoute } from "./packets";
import { DemoPage } from "./demo";

const rootRoute = new RootRoute({
  component: Root,
});

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});

const packetsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/packets",
  component: PacketsRoute,
});

const demoRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/demo",
  component: DemoPage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  packetsRoute,
  demoRoute,
]);

export const router = new Router({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
