import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const drivers = await prisma.user.findMany({
    where: { role: 'DRIVER', isActive: true },
    include: {
      driverProfile: {
        include: {
          managementAssignments: {
            where: { effectiveTo: null },
            include: { teamUnit: true },
          },
        },
      },
    },
  });

  console.log(`Total active drivers in DB: ${drivers.length}`);
  const byTeam = new Map<string, any[]>();
  let noTeamCount = 0;

  for (const d of drivers) {
    const team = d.driverProfile?.managementAssignments[0]?.teamUnit?.code;
    if (team) {
      if (!byTeam.has(team)) byTeam.set(team, []);
      byTeam.get(team)!.push(d);
    } else {
      noTeamCount++;
    }
  }

  console.log(`Drivers assigned to active teams: ${drivers.length - noTeamCount}, unassigned: ${noTeamCount}`);
  for (const [teamCode, teamDrivers] of byTeam.entries()) {
    const b2Count = teamDrivers.filter((d) => {
      const p = d.driverProfile;
      const supp = Array.isArray(p?.licensesJson) ? p.licensesJson : [];
      const all = [d.licenseClass, p?.licenseClass, ...supp.map((s: any) => s.category)].join(' ').toUpperCase();
      return all.includes('B2') || all.includes('B1') || all.includes('NONG_NGHIEP');
    }).length;
    const cCount = teamDrivers.filter((d) => {
      const p = d.driverProfile;
      const supp = Array.isArray(p?.licensesJson) ? p.licensesJson : [];
      const all = [d.licenseClass, p?.licenseClass, ...supp.map((s: any) => s.category)].join(' ').toUpperCase();
      return all.includes('HANG_C') || all.includes('HẠNG C');
    }).length;
    const ceCount = teamDrivers.filter((d) => {
      const p = d.driverProfile;
      const supp = Array.isArray(p?.licensesJson) ? p.licensesJson : [];
      const all = [d.licenseClass, p?.licenseClass, ...supp.map((s: any) => s.category)].join(' ').toUpperCase();
      return all.includes('HANG_CE') || all.includes('HẠNG CE');
    }).length;

    console.log(`- ${teamCode}: Total = ${teamDrivers.length} | B2-ready = ${b2Count} | C-ready = ${cCount} | CE-ready = ${ceCount}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
