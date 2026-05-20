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

  /**
   * Global PFE end date / final-report deadline. Set by the super admin in
   * /admin/settings. Every PFE internship ends on this date AND its final
   * report deadline matches it. Returns null when unset.
   */
  static async getPfeEndDate(): Promise<Date | null> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: "pfeEndDate" },
      });
      if (!setting?.value) return null;
      const d = new Date(setting.value);
      return Number.isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
}
