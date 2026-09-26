import "server-only";
import {
  defaultSettings,
  parseSetting,
  settingKeys,
  type SettingKey,
  type Settings,
} from "@/lib/settings";
import type { Db, Tx } from "./db";

/** Lecture de tous les réglages, fusionnés avec les valeurs par défaut. */
export async function loadSettings(client: Db | Tx): Promise<Settings> {
  const rows = await client.siteSetting.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...defaultSettings } as Record<SettingKey, unknown>;
  for (const key of settingKeys) {
    if (byKey.has(key)) out[key] = parseSetting(key, byKey.get(key));
  }
  return out as Settings;
}
