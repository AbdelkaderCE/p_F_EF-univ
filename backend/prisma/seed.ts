/// <reference types="node" />

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  const password = await bcrypt.hash("Test@1234", 10);

  // ── Roles & permissions ──────────────────────────────────
  const roleData = [
    { nom: "admin", description: "Administrateur système" },
    { nom: "admin_faculte", description: "Administrateur de faculté" },
    { nom: "chef_departement", description: "Chef de département" },
    { nom: "chef_specialite", description: "Chef de spécialité" },
    { nom: "enseignant", description: "Enseignant" },
    { nom: "etudiant", description: "Étudiant" },
    { nom: "delegue", description: "Délégué de section" },
    { nom: "president_conseil", description: "Président du conseil de discipline" },
  ];

  const roles: Record<string, { id: number; nom: string | null }> = {};
  for (const r of roleData) {
    const role = await prisma.role.upsert({
      where: { id: (await prisma.role.findFirst({ where: { nom: r.nom } }))?.id ?? 0 },
      update: {},
      create: r,
    });
    roles[r.nom] = role;
  }
  console.log("✅ Roles created");

  // ── Permissions ──────────────────────────────────────────
  const permData = [
    { nom: "manage_users", description: "Gérer les utilisateurs", module: "auth", action: "manage" },
    { nom: "manage_pfe", description: "Gérer les PFE", module: "pfe", action: "manage" },
    { nom: "submit_pfe", description: "Soumettre un PFE", module: "pfe", action: "submit" },
    { nom: "view_documents", description: "Consulter les documents", module: "documents", action: "view" },
    { nom: "manage_discipline", description: "Gérer les dossiers disciplinaires", module: "discipline", action: "manage" },
    { nom: "submit_reclamation", description: "Soumettre une réclamation", module: "reclamations", action: "submit" },
    { nom: "manage_annonces", description: "Gérer les annonces", module: "annonces", action: "manage" },
  ];

  for (const p of permData) {
    await prisma.permission.upsert({
      where: { id: (await prisma.permission.findFirst({ where: { nom: p.nom } }))?.id ?? 0 },
      update: {},
      create: p,
    });
  }
  console.log("✅ Permissions created");

  // ── University structure ─────────────────────────────────
  const faculte = await prisma.faculte.create({
    data: { nom: "Faculté des Sciences et Technologies" },
  });

  const deptInfo = await prisma.departement.create({
    data: { nom: "Informatique", faculteId: faculte.id },
  });

  await prisma.departement.create({
    data: { nom: "Physique", faculteId: faculte.id },
  });

  const filiereInfo = await prisma.filiere.create({
    data: { nom: "Informatique", departementId: deptInfo.id, description: "Filière informatique" },
  });

  const specISI = await prisma.specialite.create({
    data: { nom: "ISI", filiereId: filiereInfo.id, niveau: "M2" },
  });

  await prisma.specialite.create({
    data: { nom: "SIC", filiereId: filiereInfo.id, niveau: "M2" },
  });

  const promo2025 = await prisma.promo.create({
    data: { nom: "M2 ISI 2024-2025", specialiteId: specISI.id, anneeUniversitaire: "2024-2025", section: "A" },
  });

  console.log("✅ University structure created (Faculté → Département → Filière → Spécialité → Promo)");

  // ── Grades ───────────────────────────────────────────────
  const gradeMAA = await prisma.grade.create({ data: { nom: "MAA", description: "Maître assistant A" } });
  const gradeMCA = await prisma.grade.create({ data: { nom: "MCA", description: "Maître de conférences A" } });
  await prisma.grade.create({ data: { nom: "Professeur", description: "Professeur" } });

  console.log("✅ Grades created");

  // ── Helper: create user + assign roles ───────────────────
  async function createUser(data: {
    email: string;
    nom: string;
    prenom: string;
    roleNames: string[];
    emailVerified?: boolean;
    enseignantData?: { gradeId: number };
    etudiantData?: { promoId: number; matricule: string };
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstUse: false,
          emailVerified: data.emailVerified ?? true,
          status: "active",
        },
      });
      console.log(`  ⏭️  ${data.email} already exists`);
      return existing;
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password,
        nom: data.nom,
        prenom: data.prenom,
        emailVerified: data.emailVerified ?? true,
        firstUse: false,
        ...(data.enseignantData
          ? { enseignant: { create: { gradeId: data.enseignantData.gradeId } } }
          : {}),
        ...(data.etudiantData
          ? { etudiant: { create: { promoId: data.etudiantData.promoId, matricule: data.etudiantData.matricule } } }
          : {}),
      },
    });

    // Assign roles
    for (const roleName of data.roleNames) {
      const role = roles[roleName];
      if (role) {
        await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
      }
    }

    console.log(`  ✅ [${data.roleNames.join(", ")}] ${data.email}`);
    return user;
  }

  // ── Users ────────────────────────────────────────────────
  console.log("\n👤 Creating users (password for all: Test@1234)\n");

  await createUser({
    email: "admin@univ-tiaret.dz",
    nom: "Super",
    prenom: "Admin",
    roleNames: ["admin"],
  });

  await createUser({
    email: "faculty@univ-tiaret.dz",
    nom: "Bouzid",
    prenom: "Karim",
    roleNames: ["admin_faculte"],
  });

  await createUser({
    email: "chef.info@univ-tiaret.dz",
    nom: "Hamdani",
    prenom: "Mohamed",
    roleNames: ["chef_departement"],
  });

  await createUser({
    email: "chef.isi@univ-tiaret.dz",
    nom: "Berkane",
    prenom: "Amina",
    roleNames: ["chef_specialite"],
  });

  await createUser({
    email: "teacher@univ-tiaret.dz",
    nom: "Benali",
    prenom: "Youcef",
    roleNames: ["enseignant"],
    enseignantData: { gradeId: gradeMCA.id },
  });

  await createUser({
    email: "teacher2@univ-tiaret.dz",
    nom: "Mebarki",
    prenom: "Nadia",
    roleNames: ["enseignant"],
    enseignantData: { gradeId: gradeMAA.id },
  });

  await createUser({
    email: "student@univ-tiaret.dz",
    nom: "Bensalem",
    prenom: "Amira",
    roleNames: ["etudiant"],
    etudiantData: { promoId: promo2025.id, matricule: "212131234567" },
  });

  await createUser({
    email: "student2@univ-tiaret.dz",
    nom: "Mehdaoui",
    prenom: "Yacine",
    roleNames: ["etudiant"],
    etudiantData: { promoId: promo2025.id, matricule: "212131234568" },
  });

  await createUser({
    email: "delegate@univ-tiaret.dz",
    nom: "Djeraba",
    prenom: "Sara",
    roleNames: ["etudiant", "delegue"],
    etudiantData: { promoId: promo2025.id, matricule: "212131234569" },
  });

  await createUser({
    email: "committee@univ-tiaret.dz",
    nom: "Touati",
    prenom: "Rachid",
    roleNames: ["president_conseil"],
  });

  console.log("\n🎉 Seeding complete!\n");
  console.log("────────────────────────────────────────────");
  console.log("  📧 Login credentials (all accounts):");
  console.log("  Password: Test@1234");
  console.log("");
  console.log("  admin@univ-tiaret.dz       (Admin)");
  console.log("  teacher@univ-tiaret.dz     (Enseignant)");
  console.log("  student@univ-tiaret.dz     (Étudiant)");
  console.log("  chef.info@univ-tiaret.dz   (Chef département)");
  console.log("  delegate@univ-tiaret.dz    (Délégué)");
  console.log("────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
