import fs from "node:fs";
import { execFileSync } from "node:child_process";

const details: Record<
  string,
  { address: string; photoUrl?: string; sourceNote: string }
> = {
  "venue-0": {
    address: "Paseo de Recaredo, s/n · IES Sefarad, 45002 Toledo",
    sourceNote: "dirección recogida en Informe de lugares",
  },
  "venue-1": {
    address: "Plaza de San Vicente, 2, 45001 Toledo",
    photoUrl:
      "https://mice.castillalamancha.es/sites/default/files/2020-12/circulo_02.jpg",
    sourceNote: "dirección publicada por Turismo de Toledo",
  },
  "venue-2": {
    address: "Plaza de Victorio Macho, 2, 45002 Toledo",
    sourceNote: "sede Roca Tarpeya de la Real Fundación de Toledo",
  },
  "venue-3": {
    address: "Avenida de Carlos III, s/n, 45071 Toledo",
    sourceNote: "Campus Tecnológico Fábrica de Armas de la UCLM",
  },
  "venue-4": {
    address: "Cuesta de Carlos V, s/n · Alcázar de Toledo, 45001 Toledo",
    sourceNote: "dirección institucional de la Biblioteca",
  },
  "venue-5": {
    address: "Calle Tornerías, 27, 45001 Toledo",
    sourceNote: "dirección recogida en Informe de lugares",
  },
  "venue-6": {
    address: "Calle Río Bullaque, 23, 45007 Toledo",
    photoUrl:
      "https://www.elpoligono.es/media/elpoligono/images/2024/04/18/2024041813075462790.jpg",
    sourceNote: "dirección recogida en Informe de lugares",
  },
  "venue-7": {
    address: "Calle Santa Úrsula, 11, 45002 Toledo",
    sourceNote: "dirección recogida en Informe de lugares",
  },
  "venue-8": {
    address: "Calle Dinamarca, 4, 45005 Toledo",
    sourceNote: "Vivero de Empresas de la Cámara de Comercio",
  },
  "venue-9": {
    address: "Plaza Padre Juan de Mariana, 8, 45002 Toledo",
    sourceNote: "dirección publicada por El Patio de los Ángeles",
  },
  "venue-10": {
    address: "Carretera de Ávila, km 2,750, 45005 Toledo",
    sourceNote: "dirección del Hotel Beatriz Toledo Auditorium & Spa",
  },
  "venue-11": {
    address: "Calle de los Concilios de Toledo, 1, 45005 Toledo",
    sourceNote: "dirección del Eurostars Palacio Buenavista",
  },
  "venue-12": {
    address: "Calle Cadenas, 6, 45001 Toledo",
    sourceNote: "dirección publicada por Sala Pícaro y Turismo de Toledo",
  },
  "venue-13": {
    address: "Paseo del Circo Romano, 35, 45004 Toledo",
    sourceNote: "dirección publicada por Turismo de Toledo",
  },
  "venue-14": {
    address: "Calle Rojas, 5, 45002 Toledo",
    sourceNote: "dirección publicada por Next Level Toledo",
  },
  "claustro-santo-tome": {
    address: "Plaza del Conde, 4, 45002 Toledo",
    sourceNote: "dirección de la ficha oficial del encuentro",
  },
};

const encode = encodeURIComponent;
const credential = execFileSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
});
const token = credential
  .split(/\r?\n/)
  .find((line) => line.startsWith("password="))
  ?.slice(9);
if (!token) throw Error("No hay credencial Git disponible");
const endpoint =
  "https://api.github.com/repos/spotigetta/Thinkglaos_app/contents/data/state.json";

async function read() {
  const response = await fetch(endpoint + "?ref=data&t=" + Date.now(), {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) throw Error("Lectura " + response.status);
  const file = await response.json();
  return {
    sha: file.sha as string,
    state: JSON.parse(Buffer.from(file.content, "base64").toString("utf8")),
  };
}

for (let attempt = 0; attempt < 5; attempt++) {
  const { state, sha } = await read();
  fs.mkdirSync(".local", { recursive: true });
  fs.writeFileSync(
    ".local/venues-before-maps.json",
    JSON.stringify(state.venues, null, 2),
  );
  for (const venue of state.venues) {
    const detail = details[venue.id];
    if (!detail) continue;
    const query = detail.address || venue.name + ", Toledo";
    Object.assign(venue, {
      address: detail.address,
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" + encode(query),
      photosUrl:
        "https://www.google.com/search?tbm=isch&q=" +
        encode(venue.name + " Toledo fotos"),
      ...(detail.photoUrl ? { photoUrl: detail.photoUrl } : {}),
      source: [venue.source, detail.sourceNote].filter(Boolean).join(" · "),
    });
  }
  state.revision++;
  state.updatedAt = new Date().toISOString();
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      branch: "data",
      sha,
      message: "Añadir direcciones, Maps y fotos a los espacios",
      content: Buffer.from(JSON.stringify(state, null, 2) + "\n").toString(
        "base64",
      ),
    }),
  });
  if (response.ok) {
    fs.writeFileSync(
      "public/data/seed.json",
      JSON.stringify(state, null, 2) + "\n",
    );
    console.log("Actualizados Maps, direcciones y fotos de los espacios.");
    break;
  }
  if (![409, 422].includes(response.status) || attempt === 4)
    throw Error("Guardado " + response.status);
}
