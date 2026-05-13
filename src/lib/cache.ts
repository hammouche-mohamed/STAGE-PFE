
import { unstable_cache } from 'next/cache';
import prisma from './prisma';

export const getCachedSettings = unstable_cache(
  async () => {
    const settings = await prisma.systemSettings.findMany();
    return settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);
  },
  ['system-settings'],
  { revalidate: 60, tags: ['settings'] }
);

export const getCachedFilieres = unstable_cache(
  async () => {
    return prisma.filiere.findMany({ 
      where: { isActive: true },
      select: { id: true, name: true, code: true }
    });
  },
  ['filieres-list'],
  { revalidate: 3600, tags: ['filieres'] }
);
