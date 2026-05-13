import prisma from "@/lib/prisma";

export class SettingsService {
  static async getCurrentAcademicYear(): Promise<string> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: "currentAcademicYear" },
      });
      return setting?.value || "N/A";
    } catch (error) {
      console.error("SettingsService Error:", error);
      return "N/A";
    }
  }

  static async getSetting(key: string, defaultValue: string): Promise<string> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key },
      });
      return setting?.value || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }
}
