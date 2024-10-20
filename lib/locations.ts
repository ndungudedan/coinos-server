import { err } from "$lib/logging";
import got from "got";
import { g, s } from "$lib/db";
import { fields, pick } from "$lib/utils";

export let getLocations = async () => {
  try {
    let previous = await g("locations");
    let since = await g("locations:since");
    if (!since) since = "2022-09-19T00:00:00Z";
    if (Date.now() - new Date(since).getTime() < 60000) return;

    let locations: Array<any> = await got(
      `https://api.btcmap.org/v2/elements?updated_since=${since}`,
    ).json();

    locations = locations.filter(
      (l) =>
        l["osm_json"].tags &&
        l["osm_json"].tags["payment:coinos"] === "yes" &&
        l["osm_json"].tags.name &&
        !l["deleted_at"],
    );

    locations.map((l) => {
      let { bounds, lat, lon } = l["osm_json"];

      l["osm_json"].lat = lat || (bounds.minlat + bounds.maxlat) / 2;
      l["osm_json"].lon = lon || (bounds.minlon + bounds.maxlon) / 2;
    });

    for await (let l of locations) {
      let username = l.tags["payment:coinos"];
      if (username) {
        let uid = await g(`user:${username}`);
        let user = await g(`user:${uid}`);
        if (user) l["osm_json"].tags.user = pick(user, fields);
      }
    }

    locations.push(...previous);

    await s("locations", locations);
    await s("locations:since", new Date().toISOString().split(".")[0] + "Z");
  } catch (e) {
    err("problem fetching locations", e);
  }

  setTimeout(getLocations, 60000);
};
