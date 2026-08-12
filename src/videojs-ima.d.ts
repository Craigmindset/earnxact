// videojs-contrib-ads and videojs-ima don't ship official TypeScript
// declarations. These ambient modules just silence "cannot find module"
// build errors — the actual shape of `player.ima` is described locally
// in WatchAdsClient.tsx via the `ImaPlayer` interface, since that's the
// surface area we actually call.
declare module "videojs-contrib-ads";
declare module "videojs-ima";