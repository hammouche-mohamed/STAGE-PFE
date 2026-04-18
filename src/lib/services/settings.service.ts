import prisma from "@/lib/prisma";

export class SettingsService {
  static async getCurrentAcademicYear(): Promise<string> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: "currentAcademicYear" },
      });
      return setting?.value || "2024-2025"; // Fallback to current if totally empty
    } catch (error) {
      console.error("Error fetching currentAcademicYear:", error);
      return "2024-2025";
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
