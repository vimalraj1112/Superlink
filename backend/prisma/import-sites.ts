import { PrismaClient, SiteStatus } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import * as XLSX from 'xlsx';

dotenv.config();

const prisma = new PrismaClient();

const XLSX_FILE = path.resolve(process.cwd(), '..', 'sites-export-2026-10-03.xlsx');
const SHEET_NAME = 'Sites';

const NULLISH = new Set(['nil', 'no', 'none', 'null', 'n/a', 'na', '-', '--', '']);

/** Trim and treat placeholder tokens as empty. */
function cleanStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return NULLISH.has(s.toLowerCase()) ? '' : s;
}

/** Parse number, tolerating commas / placeholder tokens / non-numeric text. */
function toNum(v: unknown, fallback = 0): number {
  const s = cleanStr(v).replace(/,/g, '');
  if (s === '') return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function toInt(v: unknown, fallback = 0): number {
  return Math.trunc(toNum(v, fallback));
}

/** Parse DD.MM.YYYY (also DD/MM/YYYY, DD-MM-YYYY) or ISO YYYY-MM-DD. */
function parseDate(v: unknown): Date | null {
  const s = cleanStr(v);
  if (!s) return null;
  const dmy = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (dmy) {
    // Date-only values stored at UTC midnight (matches the app's own import).
    const d = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseStatus(v: unknown): SiteStatus {
  const s = cleanStr(v).toUpperCase().replace(/[\s-]+/g, '_');
  return (Object.values(SiteStatus) as string[]).includes(s)
    ? (s as SiteStatus)
    : SiteStatus.FEASIBILITY_PENDING;
}

function slug(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'customer';
}

async function main() {
  console.log('📥 Importing sites from:', XLSX_FILE);

  const wb = XLSX.readFile(XLSX_FILE);
  const sheet = wb.Sheets[SHEET_NAME];
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found. Available: ${wb.SheetNames.join(', ')}`);

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  console.log(`   parsed ${rows.length} rows`);

  const admin =
    (await prisma.user.findUnique({ where: { email: 'admin@superlinkit.com' } })) ??
    (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));
  if (!admin) throw new Error('No admin user found. Run `npm run seed` first.');
  console.log('   createdById ->', admin.email);

  // --- ISPs from the sheet (create-missing, case-insensitive name match) ---
  const ispNames = [...new Set(rows.map((r) => cleanStr(r['ISP'])).filter(Boolean))];
  const ispByName = new Map<string, string>();
  for (const name of ispNames) {
    const existing = await prisma.iSP.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    const isp =
      existing ??
      (await prisma.iSP.create({
        data: { name, displayName: name, isActive: true, createdById: admin.id },
      }));
    ispByName.set(name, isp.id);
  }
  console.log(`✅ ISPs ready: ${ispByName.size}`);

  // --- Customers: one per row, using the sheet's Customer Code + Customer Name ---
  const usedSiteCodes = new Set<string>();
  let sitesCreated = 0;
  let customersCreated = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const customerCode = cleanStr(r['Customer Code']) || `CUST-${String(i + 1).padStart(4, '0')}`;
    const companyName = cleanStr(r['Customer Name']) || customerCode;
    const ispName = cleanStr(r['ISP']);

    const installationAddress = cleanStr(r['Installation Address']) || 'N/A';
    const installationCity = cleanStr(r['Installation City']) || 'N/A';
    const installationState = cleanStr(r['Installation State']) || 'N/A';
    const installationPincode = cleanStr(r['Installation Pincode']) || '000000';

    // Customer (unique customerCode -> upsert keeps re-runs safe)
    const existingCustomer = await prisma.customer.findUnique({ where: { customerCode } });
    const customer = await prisma.customer.upsert({
      where: { customerCode },
      update: { companyName },
      create: {
        customerCode,
        companyName,
        contactPerson: 'TBD',
        email: `${slug(customerCode)}@placeholder.local`,
        phone: '0000000000',
        address: installationAddress,
        city: installationCity,
        state: installationState,
        pincode: installationPincode,
        notes: 'Imported from sites-export-2026-10-03.xlsx — placeholder fields need review.',
        isActive: true,
        createdById: admin.id,
      },
    });
    if (!existingCustomer) customersCreated++;

    if (!ispName) throw new Error(`Row ${i + 1}: missing ISP`);
    const ispId = ispByName.get(ispName)!;

    // Ensure unique site code (sheet has a duplicate "Alliant-McDonalds")
    let siteCode = cleanStr(r['Site Code']) || `SITE-${String(i + 1).padStart(4, '0')}`;
    const base = siteCode;
    let n = 2;
    while (usedSiteCodes.has(siteCode)) siteCode = `${base}-${n++}`;
    usedSiteCodes.add(siteCode);

    await prisma.site.create({
      data: {
        siteCode,
        customerId: customer.id,
        ispId,
        planName: cleanStr(r['Plan Name']) || 'N/A',
        bandwidth: cleanStr(r['Bandwidth']) || 'N/A',
        mrc: toNum(r['MRC']),
        otc: toNum(r['OTC']),
        staticIpCharge: toNum(r['Static IP Charge']),
        staticIpCount: toInt(r['Static IP Count']),
        otherCharges: toNum(r['Other Charges']),
        status: parseStatus(r['Status']),
        installationAddress,
        installationCity,
        installationState,
        installationPincode,
        latitude: null,
        longitude: null,
        connectionType: cleanStr(r['Connection Type']) || null,
        circuitId: cleanStr(r['Circuit ID']) || null,
        provisionedAt: parseDate(r['Provisioned At']),
        renewalDate: parseDate(r['Renewal Date']),
        notes: cleanStr(r['Notes']) || null,
        createdById: admin.id,
      },
    });
    sitesCreated++;
  }

  console.log(`✅ Customers created: ${customersCreated}`);
  console.log(`✅ Sites created: ${sitesCreated}`);
  const totals = {
    customers: await prisma.customer.count(),
    sites: await prisma.site.count(),
    isps: await prisma.iSP.count(),
  };
  console.log('📊 Totals now:', totals);
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
