import prisma from "@/lib/prisma";
import { getCachedSettings } from "../cache";

export class SettingsService {
  static async getCurrentAcademicYear(): Promise<string> {
    const settings = await getCachedSettings();
    return settings["currentAcademicYear"] || "N/A";
  }

  static async getSetting(key: string, defaultValue: string): Promise<string> {
    const settings = await getCachedSettings();
    return settings[key] || defaultValue;
  }
}
